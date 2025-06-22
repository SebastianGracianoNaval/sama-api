// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

// Importar las dependencias
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const { handleWebhook, consolidarArchivos } = require('./controllers/webhookController');
const { obtenerRutaCarpeta, identificarTipoJson, generarNombreArchivo } = require('./utils/blipUtils');
const { consolidarCsvs, consolidarTicketsCsvs } = require('./utils/csvUtils');
const reportController = require('./controllers/reportController');

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
        const archiver = require('archiver');
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

// Agregar ruta para tickets
app.get('/descargar/tickets', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    if (fechaInicio && fechaFin) {
        const fechasValidas = validarFechas(fechaInicio, fechaFin);
        if (!fechasValidas) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.'
            });
        }
        await descargarCsvConsolidado('ticket', res, fechasValidas);
    } else {
        await descargarCsvConsolidado('ticket', res);
    }
});

// Nueva ruta para obtener lista de campañas disponibles
app.get('/api/campañas', async (req, res) => {
    try {
        console.log('[API/CAMPAÑAS] Obteniendo lista de campañas disponibles');
        const carpeta = obtenerRutaCarpeta('ticket');
        const pathCarpeta = path.join(__dirname, carpeta);
        
        const campañas = obtenerCampañasDisponibles(pathCarpeta);
        
        res.json({
            success: true,
            campañas: campañas,
            total: campañas.length
        });
    } catch (error) {
        console.error('[API/CAMPAÑAS] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la lista de campañas',
            error: error.message
        });
    }
});

// Nueva ruta para descargar campañas
app.get('/descargar/campañas', async (req, res) => {
    const { fechaInicio, fechaFin, nombreCampaña } = req.query;
    console.log(`[DESCARGAR/CAMPAÑAS] Parámetros - fechaInicio: '${fechaInicio}', fechaFin: '${fechaFin}', nombreCampaña: '${nombreCampaña}'`);
    
    try {
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
        
        const carpeta = obtenerRutaCarpeta('ticket');
        const pathCarpeta = path.join(__dirname, carpeta);
        
        if (!fs.existsSync(pathCarpeta)) {
            fs.mkdirSync(pathCarpeta, { recursive: true });
            return res.status(404).json({
                success: false,
                message: 'No hay datos disponibles para descargar.'
            });
        }
        
        const rutaCsv = await consolidarCampañas(pathCarpeta, fechasValidas, nombreCampaña);
        
        if (!rutaCsv) {
            return res.status(404).json({
                success: false,
                message: 'No hay datos de campañas disponibles para descargar en el período especificado.'
            });
        }
        
        console.log(`[DESCARGAR/CAMPAÑAS] Descargando archivo: ${rutaCsv}`);
        res.download(rutaCsv);
    } catch (error) {
        console.error(`[DESCARGAR/CAMPAÑAS] Error:`, error);
        res.status(500).json({
            success: false,
            message: 'Error al descargar las campañas',
            error: error.message
        });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});