// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

// Importar las dependencias
const express = require('express');
const bodyParser = require('body-parser');
const { handleWebhook, consolidarArchivos } = require('./controllers/webhookController');

// Crear una aplicación Express
const app = express();

// Leer el puerto desde el archivo .env o usar el puerto 3000 por defecto
const PORT = process.env.PORT || 3000;

// Array en memoria para guardar los últimos webhooks
const webhooksRecibidos = [];

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
    let html = '<h2>¡API de Webhook BLiP funcionando!</h2>';
    html += '<h3>Últimos webhooks recibidos:</h3>';
    if (webhooksRecibidos.length === 0) {
        html += '<p>No se ha recibido ningún webhook aún.</p>';
    } else {
        html += '<ul>';
        webhooksRecibidos.slice(-10).reverse().forEach((wh, i) => {
            html += `<li><b>${wh.fecha}</b><pre>${JSON.stringify(wh.body, null, 2)}</pre></li>`;
        });
        html += '</ul>';
    }
    res.send(html);
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

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});