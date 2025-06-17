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
const { obtenerRutaCarpeta, identificarTipoJson, generarNombreCsv } = require('./utils/blipUtils');
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

// Ruta para consolidar archivos CSV por tipo
app.post('/consolidar/:tipo', consolidarArchivos);

// Rutas para descargar los CSV consolidados con filtro de fechas
app.get('/descargar/mensajes', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    if (fechaInicio && fechaFin) {
        const fechasValidas = validarFechas(fechaInicio, fechaFin);
        if (!fechasValidas) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.'
            });
        }
        await descargarCsvConsolidado('mensaje', res, fechasValidas);
    } else {
        await descargarCsvConsolidado('mensaje', res);
    }
});

app.get('/descargar/contactos', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    if (fechaInicio && fechaFin) {
        const fechasValidas = validarFechas(fechaInicio, fechaFin);
        if (!fechasValidas) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.'
            });
        }
        await descargarCsvConsolidado('contacto', res, fechasValidas);
    } else {
        await descargarCsvConsolidado('contacto', res);
    }
});

app.get('/descargar/eventos', async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    if (fechaInicio && fechaFin) {
        const fechasValidas = validarFechas(fechaInicio, fechaFin);
        if (!fechasValidas) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.'
            });
        }
        await descargarCsvConsolidado('evento', res, fechasValidas);
    } else {
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
        const tipos = ['mensaje', 'contacto', 'evento', 'desconocido'];
        const archivos = [];
        const errores = [];

        for (const tipo of tipos) {
            try {
                const carpeta = obtenerRutaCarpeta(tipo);
                if (!carpeta) continue;

                const ruta = path.join(__dirname, carpeta);
                // Si la carpeta no existe, la creamos
                if (!fs.existsSync(ruta)) {
                    fs.mkdirSync(ruta, { recursive: true });
                    continue; // Saltamos este tipo ya que no hay datos
                }

                const rutaCsv = await consolidarCsvs(ruta, tipo, fechasValidas);
                if (rutaCsv) {
                    archivos.push({
                        ruta: rutaCsv,
                        nombre: path.basename(rutaCsv)
                    });
                }
            } catch (error) {
                console.error(`Error procesando ${tipo}:`, error);
                errores.push(`Error en ${tipo}: ${error.message}`);
                continue; // Continuamos con el siguiente tipo
            }
        }

        // Si no hay archivos para descargar
        if (archivos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay datos disponibles para descargar en el período especificado.',
                errores: errores.length > 0 ? errores : undefined
            });
        }

        // Si solo hay un archivo, descargarlo directamente
        if (archivos.length === 1) {
            const tipo = archivos[0].nombre.split('-')[0];
            const nombreDescarga = generarNombreCsv(tipo);
            return res.download(archivos[0].ruta, nombreDescarga);
        }

        // Si hay múltiples archivos, crear un ZIP
        const archiver = require('archiver');
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        const zipName = generarNombreCsv('todos').replace('.csv', '.zip');
        const zipPath = path.join(__dirname, 'data', zipName);
        const output = fs.createWriteStream(zipPath);

        archive.pipe(output);

        for (const archivo of archivos) {
            archive.file(archivo.ruta, { name: archivo.nombre });
        }

        await archive.finalize();

        res.download(zipPath, zipName, (err) => {
            if (err) {
                console.error('Error al descargar el archivo ZIP:', err);
            }
            // Limpiar el archivo ZIP después de la descarga
            fs.unlink(zipPath, (err) => {
                if (err) console.error('Error al eliminar el archivo ZIP:', err);
            });
        });
    } catch (error) {
        console.error('Error al procesar la descarga:', error);
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
        console.log('[descargarCsvConsolidado] Iniciando descarga para tipo:', tipo);
        const carpeta = obtenerRutaCarpeta(tipo);
        if (!carpeta) {
            console.error('[descargarCsvConsolidado] No se pudo determinar la carpeta para tipo:', tipo);
            return res.status(500).json({
                success: false,
                message: 'Error al determinar la carpeta de destino'
            });
        }

        const pathCarpeta = path.join(__dirname, carpeta);
        console.log('[descargarCsvConsolidado] Ruta de carpeta:', pathCarpeta);
        
        // Si la carpeta no existe, la creamos
        if (!fs.existsSync(pathCarpeta)) {
            console.log('[descargarCsvConsolidado] Creando carpeta:', pathCarpeta);
            fs.mkdirSync(pathCarpeta, { recursive: true });
            return res.status(404).json({
                success: false,
                message: 'No hay datos disponibles para descargar.'
            });
        }

        let rutaCsv;
        if (tipo === 'ticket') {
            console.log('[descargarCsvConsolidado] Consolidando tickets...');
            rutaCsv = await consolidarTicketsCsvs(pathCarpeta, fechas);
        } else {
            console.log('[descargarCsvConsolidado] Consolidando CSV normal...');
            rutaCsv = await consolidarCsvs(pathCarpeta, tipo, fechas);
        }
        
        if (!rutaCsv) {
            console.log('[descargarCsvConsolidado] No se encontró ruta CSV');
            return res.status(404).json({
                success: false,
                message: 'No hay datos disponibles para descargar en el período especificado.'
            });
        }
        console.log('[descargarCsvConsolidado] Ruta CSV encontrada:', rutaCsv);

        const nombreDescarga = generarNombreCsv(tipo);
        console.log('[descargarCsvConsolidado] Nombre de descarga generado:', nombreDescarga);
        
        // Establecer el header Content-Disposition
        res.setHeader('Content-Disposition', `attachment; filename="${nombreDescarga}"`);
        console.log('[descargarCsvConsolidado] Header Content-Disposition establecido:', `attachment; filename="${nombreDescarga}"`);
        
        res.download(rutaCsv, nombreDescarga);
    } catch (error) {
        console.error('[descargarCsvConsolidado] Error:', error);
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

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});