// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

// Importar las dependencias
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
const { handleWebhook, consolidarArchivos } = require('./controllers/webhookController');
const { obtenerRutaCarpeta, identificarTipoJson } = require('./utils/blipUtils');
const { consolidarCsvs } = require('./utils/csvUtils');

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

// Middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para analizar el cuerpo de las solicitudes JSON
app.use(bodyParser.json());
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

// Función para validar fechas
function validarFechas(fechaInicio, fechaFin) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59, 999);

    // Validar que las fechas no sean futuras
    if (inicio > hoy || fin > hoy) {
        return false;
    }

    // Validar que la fecha de inicio no sea posterior a la fecha fin
    if (inicio > fin) {
        return false;
    }

    return { inicio, fin };
}

// Página principal que muestra los últimos webhooks recibidos
app.get('/', (req, res) => {
    res.render('index', {
        webhooks: webhooksRecibidos
    });
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
            return res.status(400).send('Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.');
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
            return res.status(400).send('Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.');
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
            return res.status(400).send('Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.');
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
            return res.status(400).send('Fechas inválidas. Asegúrese de que las fechas no sean futuras y que la fecha de inicio no sea posterior a la fecha fin.');
        }
    }

    try {
        const tipos = ['mensaje', 'contacto', 'evento', 'desconocido'];
        const archivos = [];

        for (const tipo of tipos) {
            const carpeta = obtenerRutaCarpeta(tipo);
            if (carpeta) {
                const ruta = path.join(__dirname, carpeta);
                const rutaCsv = await consolidarCsvs(ruta, tipo, fechasValidas);
                if (rutaCsv) {
                    archivos.push({
                        ruta: rutaCsv,
                        nombre: path.basename(rutaCsv)
                    });
                }
            }
        }

        if (archivos.length === 0) {
            return res.status(404).send('No hay datos para consolidar en el período especificado.');
        }

        // Si solo hay un archivo, descargarlo directamente
        if (archivos.length === 1) {
            return res.download(archivos[0].ruta, archivos[0].nombre);
        }

        // Si hay múltiples archivos, crear un ZIP
        const archivo = require('archiver');
        const archive = archivo('zip', {
            zlib: { level: 9 }
        });

        const zipPath = path.join(__dirname, 'data', 'todos_los_datos.zip');
        const output = fs.createWriteStream(zipPath);

        archive.pipe(output);

        for (const archivo of archivos) {
            archive.file(archivo.ruta, { name: archivo.nombre });
        }

        await archive.finalize();

        res.download(zipPath, 'todos_los_datos.zip', (err) => {
            if (err) {
                res.status(500).send('Error al descargar el archivo');
            }
            // Limpiar el archivo ZIP después de la descarga
            fs.unlink(zipPath, (err) => {
                if (err) console.error('Error al eliminar el archivo ZIP:', err);
            });
        });
    } catch (error) {
        res.status(500).send('Error al consolidar los archivos: ' + error.message);
    }
});

// Función auxiliar para consolidar y enviar el CSV
async function descargarCsvConsolidado(tipo, res, fechas = null) {
    try {
        const carpeta = obtenerRutaCarpeta(tipo);
        if (!carpeta) {
            return res.status(400).send('Tipo de datos inválido');
        }
        const ruta = path.join(__dirname, carpeta);
        const rutaCsv = await consolidarCsvs(ruta, tipo, fechas);
        if (!rutaCsv) {
            return res.status(404).send('No hay datos para consolidar en el período especificado.');
        }
        const nombreArchivo = path.basename(rutaCsv);
        res.download(rutaCsv, nombreArchivo, (err) => {
            if (err) {
                res.status(500).send('Error al descargar el archivo');
            }
        });
    } catch (error) {
        res.status(500).send('Error al generar el archivo: ' + error.message);
    }
}

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});