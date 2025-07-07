// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

// Importar las dependencias
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const { handleWebhook, consolidarArchivos, ticketsAbiertos } = require('./controllers/webhookController');
const { obtenerRutaCarpeta, identificarTipoJson, generarNombreArchivo } = require('./utils/blipUtils');
const { consolidarCsvs, consolidarTicketsCsvs, consolidarCampanas, obtenerCampanasDisponibles, generarResumenDeCampanas, exportarCampanasDetallado, consolidarCampanasIndependiente, exportarSoloCampanas, ...restCsvUtils } = require('./utils/csvUtils');
const reportController = require('./controllers/reportController');
const { parse } = require('csv-parse/sync');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const os = require('os');
const { downloadAgentes, getAgentesList, getPlantillasList } = require('./controllers/reportController');

// Crear una aplicación Express
const app = express();

// Leer el puerto desde el archivo .env o usar el puerto 3000 por defecto
const PORT = process.env.PORT || 3000;

// Array en memoria para guardar los últimos webhooks
const webhooksRecibidos = [];

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');
app.use(expressLayouts);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para analizar el cuerpo de las solicitudes JSON
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error('Error en la aplicación:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: err.message
    });
});

// Ruta para obtener los webhooks
app.get('/webhook', (req, res) => {
    res.json(webhooksRecibidos);
});

// Ruta para recibir el webhook y guardar en memoria
app.post('/webhook', (req, res) => {
    const tipo = identificarTipoJson(req.body) || 'desconocido';
    webhooksRecibidos.push({
        fecha: new Date().toISOString(),
        tipo,
        body: req.body
    });
    handleWebhook(req, res);
});

// NUEVA RUTA: Para eventos específicos del bot de WhatsApp
app.post('/api/bot-event', async (req, res) => {
    try {
        const { handleBotEvent } = require('./controllers/webhookController');
        
        // Crear una respuesta personalizada para capturar los datos
        const originalJson = res.json;
        let responseData = null;
        
        res.json = function(data) {
            responseData = data;
            return originalJson.call(this, data);
        };
        
        await handleBotEvent(req, res);
        
        // Si la respuesta fue exitosa, guardar en webhooksRecibidos
        if (responseData && responseData.success && responseData.webhookData) {
            webhooksRecibidos.push(responseData.webhookData);
            console.log('[BotEvent] Evento agregado a webhooksRecibidos:', responseData.webhookData);
        }
        
    } catch (error) {
        console.error('Error en ruta bot-event:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// NUEVA RUTA: Para eventos específicos de campañas
app.post('/api/campaign-event', async (req, res) => {
    try {
        const { handleCampaignEvent } = require('./controllers/webhookController');
        
        // Crear una respuesta personalizada para capturar los datos
        const originalJson = res.json;
        let responseData = null;
        
        res.json = function(data) {
            responseData = data;
            return originalJson.call(this, data);
        };
        
        await handleCampaignEvent(req, res);
        
        // Si la respuesta fue exitosa, guardar en webhooksRecibidos
        if (responseData && responseData.success && responseData.webhookData) {
            webhooksRecibidos.push(responseData.webhookData);
            console.log('[CampaignEvent] Evento agregado a webhooksRecibidos:', responseData.webhookData);
        }
        
    } catch (error) {
        console.error('Error en ruta campaign-event:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// Ruta para consolidar archivos CSV por tipo
app.post('/consolidar/:tipo', consolidarArchivos);

// Rutas para descargar los CSV consolidados con filtro de fechas
app.get('/descargar/mensajes', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    console.log(`[DESCARGAR/MENSAJES] Fechas recibidas - fechaInicio: '${fechaInicio}', fechaFin: '${fechaFin}'`);
    
    if (fechaInicio && fechaFin) {
        console.log(`[DESCARGAR/MENSAJES] Validando fechas...`);
        const fechasValidas = validarFechas(fechaInicio, fechaFin);
        console.log(`[DESCARGAR/MENSAJES] Fechas validadas:`, fechasValidas);
        
        if (!fechasValidas) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.'
            });
        }
        console.log(`[DESCARGAR/MENSAJES] Llamando descargarCsvConsolidado con fechas:`, fechasValidas);
        await descargarCsvConsolidado('mensaje', res, fechasValidas);
    } else {
        console.log(`[DESCARGAR/MENSAJES] Sin fechas, llamando descargarCsvConsolidado sin filtro`);
        await descargarCsvConsolidado('mensaje', res);
    }
});

app.get('/descargar/contactos', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    console.log(`[DESCARGAR/CONTACTOS] Fechas recibidas - fechaInicio: '${fechaInicio}', fechaFin: '${fechaFin}'`);
    
    if (fechaInicio && fechaFin) {
        console.log(`[DESCARGAR/CONTACTOS] Validando fechas...`);
        const fechasValidas = validarFechas(fechaInicio, fechaFin);
        console.log(`[DESCARGAR/CONTACTOS] Fechas validadas:`, fechasValidas);
        
        if (!fechasValidas) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.'
            });
        }
        console.log(`[DESCARGAR/CONTACTOS] Llamando descargarCsvConsolidado con fechas:`, fechasValidas);
        await descargarCsvConsolidado('contacto', res, fechasValidas);
    } else {
        console.log(`[DESCARGAR/CONTACTOS] Sin fechas, llamando descargarCsvConsolidado sin filtro`);
        await descargarCsvConsolidado('contacto', res);
    }
});

app.get('/descargar/eventos', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    console.log(`[DESCARGAR/EVENTOS] Fechas recibidas - fechaInicio: '${fechaInicio}', fechaFin: '${fechaFin}'`);
    
    if (fechaInicio && fechaFin) {
        console.log(`[DESCARGAR/EVENTOS] Validando fechas...`);
        const fechasValidas = validarFechas(fechaInicio, fechaFin);
        console.log(`[DESCARGAR/EVENTOS] Fechas validadas:`, fechasValidas);
        
        if (!fechasValidas) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.'
            });
        }
        console.log(`[DESCARGAR/EVENTOS] Llamando descargarCsvConsolidado con fechas:`, fechasValidas);
        await descargarCsvConsolidado('evento', res, fechasValidas);
    } else {
        console.log(`[DESCARGAR/EVENTOS] Sin fechas, llamando descargarCsvConsolidado sin filtro`);
        await descargarCsvConsolidado('evento', res);
    }
});

// Nueva ruta para descargar todos los tipos
app.get('/descargar/todo', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    let fechasValidas = null;
    if (fechaInicio && fechaFin) {
        fechasValidas = validarFechas(fechaInicio, fechaFin);
        if (!fechasValidas) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.'
            });
        }
    }
    try {
        const tipos = ['mensaje', 'contacto', 'evento', 'ticket', 'desconocido'];
        const archivos = [];
        const errores = [];
        for (const tipo of tipos) {
            try {
                const carpeta = obtenerRutaCarpeta(tipo);
                if (!carpeta) continue;
                const ruta = path.join(__dirname, carpeta);
                if (!fs.existsSync(ruta)) {
                    fs.mkdirSync(ruta, { recursive: true });
                    continue;
                }
                let rutaCsv;
                if (tipo === 'ticket') {
                    rutaCsv = await consolidarTicketsCsvs(ruta, fechasValidas);
                } else {
                    rutaCsv = await consolidarCsvs(ruta, tipo, fechasValidas);
                }
                if (rutaCsv) {
                    archivos.push({
                        ruta: rutaCsv,
                        nombre: path.basename(rutaCsv)
                    });
                }
            } catch (error) {
                errores.push(`Error en ${tipo}: ${error.message}`);
                continue;
            }
        }
        if (archivos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay datos disponibles para descargar en el período especificado.',
                errores: errores.length > 0 ? errores : undefined
            });
        }
        
        console.log(`[TODO] Archivos a incluir en ZIP:`, archivos.map(a => ({ ruta: a.ruta, nombre: a.nombre })));
        
        // Siempre crear un ZIP, sin importar si hay uno o varios archivos
        const archive = archiver('zip', { zlib: { level: 9 } });
        const now = new Date();
        const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
        const fecha = now.toISOString().slice(0,10);
        const zipName = `todos_${hora}_${fecha}.zip`;
        const zipPath = path.join(__dirname, 'data', zipName);
        const output = fs.createWriteStream(zipPath);
        
        console.log(`[TODO] Creando ZIP: ${zipPath}`);
        
        // Configurar el pipe del archivo
        archive.pipe(output);
        
        // Agregar archivos al ZIP con nombres únicos
        for (const archivo of archivos) {
            console.log(`[TODO] Agregando al ZIP: ${archivo.nombre} desde ${archivo.ruta}`);
            // Usar el nombre original del archivo (que ya incluye el tipo)
            archive.file(archivo.ruta, { name: archivo.nombre });
        }
        
        // Manejar errores del archiver
        archive.on('error', (err) => {
            console.error('Error al crear el archivo ZIP:', err);
            // Limpiar el archivo parcial si existe
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
            return res.status(500).json({
                success: false,
                message: 'Error al crear el archivo ZIP',
                error: err.message
            });
        });
        
        // Esperar a que el archivo esté completamente escrito antes de descargarlo
        output.on('close', () => {
            console.log(`[ZIP] Archivo creado exitosamente: ${zipPath}`);
            // Establecer el header Content-Disposition para el ZIP
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
            res.download(zipPath, zipName, (err) => {
                if (err) {
                    console.error('Error al descargar el archivo ZIP:', err);
                }
                // Limpiar el archivo ZIP después de la descarga
                fs.unlink(zipPath, (err) => {
                    if (err) console.error('Error al eliminar el archivo ZIP:', err);
                });
            });
        });
        
        // Finalizar el archivo
        archive.finalize();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al procesar la descarga',
            error: error.message
        });
    }
});

// Ruta raíz para verificar que el backend está corriendo
app.get('/', (req, res) => {
  res.send('API corriendo correctamente');
});

// Función para validar fechas
function validarFechas(fechaInicio, fechaFin) {
    const hoy = new Date().toISOString().slice(0, 10);
    
    if (fechaInicio > fechaFin) {
        return false;
    }
    
    if (fechaInicio > hoy || fechaFin > hoy) {
        return false;
    }
    
    return { fechaInicio, fechaFin };
}

// Función para descargar CSV consolidado
async function descargarCsvConsolidado(tipo, res, fechas = null) {
    try {
        console.log(`[descargarCsvConsolidado] Iniciando para tipo: ${tipo}, fechas:`, fechas);
        
        const carpeta = obtenerRutaCarpeta(tipo);
        if (!carpeta) {
            console.log(`[descargarCsvConsolidado] No se pudo determinar carpeta para tipo: ${tipo}`);
            return res.status(500).json({
                success: false,
                message: 'Error al determinar la carpeta de destino'
            });
        }
        
        const pathCarpeta = path.join(__dirname, carpeta);
        console.log(`[descargarCsvConsolidado] Ruta de carpeta: ${pathCarpeta}`);
        
        if (!fs.existsSync(pathCarpeta)) {
            console.log(`[descargarCsvConsolidado] Carpeta no existe, creando: ${pathCarpeta}`);
            fs.mkdirSync(pathCarpeta, { recursive: true });
            return res.status(404).json({
                success: false,
                message: 'No hay datos disponibles para descargar.'
            });
        }
        
        let rutaCsv;
        if (tipo === 'ticket') {
            console.log(`[descargarCsvConsolidado] Llamando consolidarTicketsCsvs con fechas:`, fechas);
            rutaCsv = await consolidarTicketsCsvs(pathCarpeta, fechas);
        } else {
            console.log(`[descargarCsvConsolidado] Llamando consolidarCsvs con tipo: ${tipo}, fechas:`, fechas);
            rutaCsv = await consolidarCsvs(pathCarpeta, tipo, fechas);
        }
        
        console.log(`[descargarCsvConsolidado] Resultado de consolidación:`, rutaCsv);
        
        if (!rutaCsv) {
            console.log(`[descargarCsvConsolidado] No se generó archivo consolidado`);
            return res.status(404).json({
                success: false,
                message: 'No hay datos disponibles para descargar en el período especificado.'
            });
        }
        
        console.log(`[descargarCsvConsolidado] Descargando archivo: ${rutaCsv}`);
        // Descargar el archivo tal cual, el frontend decide el nombre
        res.download(rutaCsv);
    } catch (error) {
        console.error(`[descargarCsvConsolidado] Error:`, error);
        res.status(500).json({
            success: false,
            message: 'Error al descargar el archivo',
            error: error.message
        });
    }
}

const reportesDir = path.join(__dirname, 'data', 'reportes');
if (!fs.existsSync(reportesDir)) {
  fs.mkdirSync(reportesDir, { recursive: true });
}

// Rutas de reportes
app.get('/api/reportes', reportController.getReportesList);
app.get('/api/reportes/download/:filename', reportController.downloadReporte);
app.get('/api/reportes/:tipo', reportController.downloadReporteByType);

// Función para leer y parsear todos los reportes de tickets
const getAllTicketReports = (fechas) => {
    const carpetaReportes = path.join(__dirname, 'data', 'reportes');
    if (!fs.existsSync(carpetaReportes)) return [];

    const archivos = fs.readdirSync(carpetaReportes)
        .filter(f => f.startsWith('ticket_') && f.endsWith('.csv'));

    let todosLosTickets = [];
    for (const archivo of archivos) {
        const contenido = fs.readFileSync(path.join(carpetaReportes, archivo), 'utf-8');
        const tickets = parse(contenido, { columns: true, skip_empty_lines: true });
        todosLosTickets.push(...tickets);
    }

    if (fechas) {
        todosLosTickets = todosLosTickets.filter(t => 
            t.fechaFiltro >= fechas.fechaInicio && t.fechaFiltro <= fechas.fechaFin
        );
    }
    return todosLosTickets;
};

// Ruta para descargar tickets (BOT y PLANTILLA) en un ZIP
app.get('/descargar/tickets', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    try {
        console.log(`[DESCARGAR/TICKETS] Fechas recibidas - fechaInicio: '${fechaInicio}', fechaFin: '${fechaFin}'`);
        const fechas = (fechaInicio && fechaFin) ? validarFechas(fechaInicio, fechaFin) : null;
        if ((fechaInicio && fechaFin) && !fechas) {
            return res.status(400).json({ success: false, message: 'Fechas inválidas.' });
        }
        const carpetaTickets = obtenerRutaCarpeta('ticket');
        const pathCarpetaTickets = path.join(__dirname, carpetaTickets);
        if (!fs.existsSync(pathCarpetaTickets)) {
            fs.mkdirSync(pathCarpetaTickets, { recursive: true });
            return res.status(404).json({ success: false, message: 'No hay datos de tickets disponibles.' });
        }
        // Consolidar todos los tickets (BOT y PLANTILLA)
        const { botPath, plantillaPath } = await consolidarTicketsCsvs(pathCarpetaTickets, fechas);
        
        if (!botPath && !plantillaPath) {
            console.log('[DESCARGAR/TICKETS] No se generaron archivos consolidados de tickets.');
            return res.status(404).json({ success: false, message: 'No hay tickets para exportar.' });
        }
        
        // Crear ZIP con los archivos generados
        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });
        const now = new Date();
        const fecha = now.toISOString().slice(0, 10);
        const zipName = `reporte_tickets_${fecha}.zip`;
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
        archive.pipe(res);
        
        // Agregar archivos al ZIP
        if (botPath) {
            console.log(`[DESCARGAR/TICKETS] Agregando al ZIP: tickets_bot.csv`);
            archive.file(botPath, { name: 'tickets_bot.csv' });
        }
        
        if (plantillaPath) {
            console.log(`[DESCARGAR/TICKETS] Agregando al ZIP: tickets_plantilla.csv`);
            archive.file(plantillaPath, { name: 'tickets_plantilla.csv' });
        }
        
        archive.finalize();
    } catch (error) {
        console.error('[Descargar Tickets ZIP] Error:', error);
        res.status(500).json({ success: false, message: 'Error al generar el ZIP de tickets.', error: error.message });
    }
});

// Ruta para obtener lista de campanas disponibles
app.get('/api/campanas', async (req, res) => {
    try {
        console.log('[API/CAMPANAS] Obteniendo lista de campanas disponibles');
        const carpetaReportes = path.join(__dirname, 'data', 'reportes');
        const campanas = obtenerPlantillasUnicas(path.join(__dirname, 'data', 'tickets'));
        
        res.json({
            success: true,
            campanas: campanas,
            total: campanas.length
        });
    } catch (error) {
        console.error('[API/CAMPANAS] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la lista de campanas',
            error: error.message
        });
    }
});

// Ruta para descargar reporte de campanas (detallado)
app.get('/descargar/campanas', async (req, res) => {
    const { fechaInicio, fechaFin, nombrePlantilla } = req.query;
    try {
        console.log(`[DESCARGAR/CAMPANAS] Fechas recibidas - fechaInicio: '${fechaInicio}', fechaFin: '${fechaFin}', nombrePlantilla: '${nombrePlantilla}'`);
        const fechas = (fechaInicio && fechaFin) ? validarFechas(fechaInicio, fechaFin) : null;
        if ((fechaInicio && fechaFin) && !fechas) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas. Por favor, seleccione fechas válidas.'
            });
        }
        
        console.log(`[DESCARGAR/CAMPANAS] Iniciando exportación exclusiva de campañas`);
        const carpeta = path.join(__dirname, 'data', 'tickets');
        
        // Usar la nueva función exclusiva para campañas
        const { filePath, data } = await exportarSoloCampanas(carpeta, fechas, nombrePlantilla);
        
        if (!filePath || !data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay datos de campañas para exportar con los filtros especificados.'
            });
        }
        
        console.log(`[DESCARGAR/CAMPANAS] Archivo generado: ${filePath}`);
        console.log(`[DESCARGAR/CAMPANAS] Total registros: ${data.length}`);
        
        // Obtener el nombre del archivo para la descarga
        const nombreArchivo = path.basename(filePath);
        
        // Establecer headers para la descarga
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        
        // Enviar el archivo
        res.download(filePath);
        
    } catch (error) {
        console.error('[DESCARGAR/CAMPANAS] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar el reporte de campañas',
            error: error.message
        });
    }
});

// Nueva ruta para resumen de campañas
app.get('/descargar/campanas/resumen', async (req, res) => {
    const { fechaInicio, fechaFin, nombrePlantilla } = req.query;
    try {
        const fechas = (fechaInicio && fechaFin) ? validarFechas(fechaInicio, fechaFin) : null;
        if ((fechaInicio && fechaFin) && !fechas) {
            return res.status(400).json({ success: false, message: 'Fechas inválidas.' });
        }

        const baseDir = path.join(__dirname, 'data', 'tickets');
        
        // 1. Obtener los datos consolidados y filtrados llamando a la función del reporte detallado
        const resultadoDetalle = await consolidarCampanas(baseDir, fechas, nombrePlantilla);
        
        if (!resultadoDetalle || !resultadoDetalle.data || resultadoDetalle.data.length === 0) {
            return res.status(404).json({ success: false, message: 'No hay datos para generar el resumen con los filtros seleccionados.' });
        }

        // 2. Construir el string del período y generar el resumen
        const periodo = fechas ? `${fechas.fechaInicio} al ${fechas.fechaFin}` : 'No especificado';
        const rutaCsvResumen = await generarResumenDeCampanas(resultadoDetalle.data, baseDir, periodo);

        if (!rutaCsvResumen) {
            return res.status(500).json({ success: false, message: 'No se pudo generar el archivo de resumen.' });
        }
        
        const nombreArchivo = path.basename(rutaCsvResumen);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.download(rutaCsvResumen);

    } catch (error) {
        console.error('[DESCARGAR/CAMPANAS/RESUMEN] Error:', error);
        res.status(500).json({ success: false, message: 'Error al generar el resumen de campañas.', error: error.message });
    }
});

// NUEVA RUTA: Para forzar la identificación de tipo de ticket
app.post('/api/identificar-ticket', async (req, res) => {
    try {
        const { ticketId, esPlantilla, campaignDetails } = req.body;
        
        console.log('[IDENTIFICAR-TICKET] Datos recibidos:', JSON.stringify(req.body, null, 2));
        
        if (!ticketId) {
            return res.status(400).json({
                success: false,
                message: 'ticketId es requerido'
            });
        }
        
        // Buscar el ticket en los tickets abiertos
        let ticketEncontrado = null;
        let contactoEncontrado = null;
        
        for (const [contacto, ticketInfo] of ticketsAbiertos.entries()) {
            if (ticketInfo.ticket.id === ticketId || ticketInfo.ticket.content?.sequentialId?.toString() === ticketId.toString()) {
                ticketEncontrado = ticketInfo;
                contactoEncontrado = contacto;
                break;
            }
        }
        
        if (!ticketEncontrado) {
            return res.status(404).json({
                success: false,
                message: 'Ticket no encontrado'
            });
        }
        
        // Actualizar el tipo de ticket según el parámetro recibido
        if (esPlantilla !== undefined) {
            const nuevoTipo = esPlantilla ? 'PLANTILLA' : 'BOT';
            ticketEncontrado.tipo = nuevoTipo;
            
            // Si es plantilla y se proporcionan detalles de campaña, actualizarlos
            if (esPlantilla && campaignDetails) {
                ticketEncontrado.campaignDetails = {
                    ...ticketEncontrado.campaignDetails,
                    ...campaignDetails
                };
            }
            
            console.log(`[IDENTIFICAR-TICKET] Ticket ${ticketId} actualizado a tipo: ${nuevoTipo}`);
            
            res.json({
                success: true,
                message: `Ticket ${ticketId} identificado como ${nuevoTipo}`,
                ticketId: ticketId,
                tipo: nuevoTipo,
                contacto: contactoEncontrado
            });
        } else {
            res.json({
                success: true,
                message: 'Información del ticket',
                ticketId: ticketId,
                tipo: ticketEncontrado.tipo,
                contacto: contactoEncontrado,
                campaignDetails: ticketEncontrado.campaignDetails
            });
        }
        
    } catch (error) {
        console.error('[IDENTIFICAR-TICKET] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al identificar el ticket',
            error: error.message
        });
    }
});

// Ruta de debug para verificar estado de archivos
app.get('/api/debug/files', reportController.debugFiles);

app.get('/descargar/agentes', downloadAgentes);

app.get('/api/agentes', getAgentesList);
app.get('/api/plantillas', getPlantillasList);

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});