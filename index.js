// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

// Importar las dependencias
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
const { handleWebhook, consolidarArchivos } = require('./controllers/webhookController');
const { obtenerRutaCarpeta } = require('./utils/blipUtils');
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

// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error('Error en la aplicación:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: err.message
    });
});

// Página principal que muestra los últimos webhooks recibidos
app.get('/', (req, res) => {
    res.render('index', {
        webhooks: webhooksRecibidos
    });
});

// Ruta para recibir el webhook y guardar en memoria
app.post('/webhook', (req, res) => {
    webhooksRecibidos.push({
        fecha: new Date().toISOString(),
        body: req.body
    });
    handleWebhook(req, res);
});

// Ruta para consolidar archivos CSV por tipo
app.post('/consolidar/:tipo', consolidarArchivos);

// Rutas para descargar los CSV consolidados
app.get('/descargar/mensajes', async (req, res) => {
    await descargarCsvConsolidado('mensaje', res);
});

app.get('/descargar/contactos', async (req, res) => {
    await descargarCsvConsolidado('contacto', res);
});

app.get('/descargar/eventos', async (req, res) => {
    await descargarCsvConsolidado('evento', res);
});

// Función auxiliar para consolidar y enviar el CSV
async function descargarCsvConsolidado(tipo, res) {
    try {
        const carpeta = obtenerRutaCarpeta(tipo);
        if (!carpeta) {
            return res.status(400).send('Tipo de datos inválido');
        }
        const ruta = path.join(__dirname, carpeta);
        const rutaCsv = await consolidarCsvs(ruta, tipo);
        const nombreArchivo = path.basename(rutaCsv);
        res.download(rutaCsv, nombreArchivo, (err) => {
            if (err) {
                res.status(500).send('Error al descargar el archivo');
            }
        });
    } catch (error) {
        res.status(500).send('No hay datos para consolidar o error al generar el archivo.');
    }
}

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});