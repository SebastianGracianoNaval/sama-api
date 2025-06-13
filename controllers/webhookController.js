const { convertJsonToCsv, consolidarCsvs } = require('../utils/csvUtils');
const { identificarTipoJson, obtenerRutaCarpeta, generarNombreArchivo } = require('../utils/blipUtils');
const path = require('path');

/**
 * Maneja las solicitudes POST del webhook
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const handleWebhook = async (req, res) => {
    try {
        const jsonData = req.body;
        
        if (!jsonData || Object.keys(jsonData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se recibieron datos JSON'
            });
        }

        // Identificar el tipo de JSON
        const tipo = identificarTipoJson(jsonData);
        if (!tipo) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo identificar el tipo de datos'
            });
        }

        // Obtener la ruta de la carpeta correspondiente
        const carpeta = obtenerRutaCarpeta(tipo);
        if (!carpeta) {
            return res.status(500).json({
                success: false,
                message: 'Error al determinar la carpeta de destino'
            });
        }

        // Generar nombre de archivo y ruta completa
        const nombreArchivo = generarNombreArchivo(tipo);
        const outputPath = path.join(__dirname, '..', carpeta, nombreArchivo);

        // Agregar el campo 'fechaFiltro' al final de cada objeto antes de convertirlo a CSV
        const fechaFiltro = new Date().toISOString();
        let dataConFechaFiltro;
        function addFechaFiltro(obj) {
            const entries = Object.entries(obj);
            // Eliminar si ya existe
            const filtered = entries.filter(([key]) => key !== 'fechaFiltro');
            return Object.fromEntries([...filtered, ['fechaFiltro', fechaFiltro]]);
        }
        if (Array.isArray(jsonData)) {
            dataConFechaFiltro = jsonData.map(item => addFechaFiltro(item));
        } else {
            dataConFechaFiltro = [addFechaFiltro(jsonData)];
        }

        // Convertir JSON a CSV (siempre como array de objetos planos)
        const csvPath = await convertJsonToCsv(dataConFechaFiltro, outputPath);

        res.status(200).json({
            success: true,
            message: 'Datos procesados correctamente',
            tipo: tipo,
            filePath: csvPath
        });

    } catch (error) {
        console.error('Error en el webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar los datos',
            error: error.message
        });
    }
};

/**
 * Consolida los archivos CSV de un tipo específico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const consolidarArchivos = async (req, res) => {
    try {
        const { tipo } = req.params;

        if (!['mensaje', 'evento', 'contacto'].includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de datos inválido'
            });
        }

        const carpeta = obtenerRutaCarpeta(tipo);
        if (!carpeta) {
            return res.status(500).json({
                success: false,
                message: 'Error al determinar la carpeta de destino'
            });
        }

        const rutaConsolidada = await consolidarCsvs(
            path.join(__dirname, '..', carpeta),
            tipo
        );

        res.status(200).json({
            success: true,
            message: 'Archivos consolidados correctamente',
            filePath: rutaConsolidada
        });

    } catch (error) {
        console.error('Error al consolidar archivos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al consolidar los archivos',
            error: error.message
        });
    }
};

module.exports = {
    handleWebhook,
    consolidarArchivos
}; 