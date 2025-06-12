// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

// Importar las dependencias
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { handleWebhook, consolidarArchivos } = require('./controllers/webhookController');
const { obtenerRutaCarpeta } = require('./utils/blipUtils');
const { consolidarCsvs } = require('./utils/csvUtils');

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

// Página principal que muestra los últimos webhooks recibidos y los botones de descarga
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
    html += `<h3>Descargar reportes consolidados:</h3>
        <form method="GET" action="/descargar/mensajes"><button type="submit">Mensajes</button></form>
        <form method="GET" action="/descargar/contactos"><button type="submit">Contactos</button></form>
        <form method="GET" action="/descargar/eventos"><button type="submit">Eventos</button></form>`;
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
            } else {
                // Opcional: eliminar el archivo después de descargar
                // fs.unlinkSync(rutaCsv);
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