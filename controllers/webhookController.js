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

        // Buscar la fecha más relevante y formatearla a yyyy-mm-dd
        function obtenerFechaFiltro(obj) {
            let fecha = null;
            // Lista de posibles campos de fecha en orden de prioridad
            const camposFecha = [
                '#envelope.storageDate',
                '#wa.timestamp',
                '#date_processed',
                'date_created',
                'storageDate',
                'lastMessageDate'
            ];
            for (const campo of camposFecha) {
                if (obj[campo]) {
                    if (campo === '#wa.timestamp') {
                        // Epoch en segundos
                        const ts = Number(obj[campo]);
                        if (!isNaN(ts)) {
                            fecha = new Date(ts * 1000);
                            break;
                        }
                    } else {
                        // ISO string o similar
                        fecha = new Date(obj[campo]);
                        if (!isNaN(fecha.getTime())) break;
                    }
                } else if (obj.metadata && obj.metadata[campo]) {
                    if (campo === '#wa.timestamp') {
                        const ts = Number(obj.metadata[campo]);
                        if (!isNaN(ts)) {
                            fecha = new Date(ts * 1000);
                            break;
                        }
                    } else {
                        fecha = new Date(obj.metadata[campo]);
                        if (!isNaN(fecha.getTime())) break;
                    }
                }
            }
            if (!fecha || isNaN(fecha.getTime())) {
                fecha = new Date(); // fallback a ahora
            }
            // yyyy-mm-dd
            return fecha.toISOString().slice(0, 10);
        }
        function addFechaFiltro(obj) {
            const entries = Object.entries(obj);
            // Eliminar si ya existe
            const filtered = entries.filter(([key]) => key !== 'fechaFiltro');
            return Object.fromEntries([...filtered, ['fechaFiltro', obtenerFechaFiltro(obj)]]);
        }
        let dataConFechaFiltro;
        if (Array.isArray(jsonData)) {
            dataConFechaFiltro = jsonData.map(item => addFechaFiltro(item));
        } else {
            dataConFechaFiltro = [addFechaFiltro(jsonData)];
        }

        // Convertir JSON a CSV (siempre como array de objetos planos)
        const tipo = identificarTipoJson(jsonData);
        const carpeta = obtenerRutaCarpeta(tipo);
        const nombreArchivo = generarNombreArchivo(tipo);
        const outputPath = path.join(__dirname, '..', carpeta, nombreArchivo);
        await convertJsonToCsv(dataConFechaFiltro, outputPath);

        res.status(200).json({
            success: true,
            message: 'Datos procesados correctamente',
            tipo: tipo,
            filePath: outputPath
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
        const carpeta = obtenerRutaCarpeta(tipo);
        if (!carpeta) {
            return res.status(500).json({
                success: false,
                message: 'Error al determinar la carpeta de destino'
            });
        }
        const pathCarpeta = path.join(__dirname, '..', carpeta);
        const fs = require('fs');
        const archivos = fs.readdirSync(pathCarpeta).filter(archivo => archivo.endsWith('.csv'));
        let datosCombinados = [];
        let encabezados = null;
        for (const archivo of archivos) {
            const rutaArchivo = path.join(pathCarpeta, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const lineas = contenido.split('\n');
            if (!encabezados) {
                encabezados = lineas[0];
                datosCombinados.push(encabezados);
            }
            for (let i = 1; i < lineas.length; i++) {
                const linea = lineas[i].trim();
                if (!linea) continue;
                datosCombinados.push(linea);
            }
        }
        if (datosCombinados.length <= 1) {
            return res.status(404).json({
                success: false,
                message: 'No hay datos para consolidar'
            });
        }
        // Crear archivo consolidado
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const carpetaReportes = path.join(path.dirname(pathCarpeta), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
        }
        const rutaConsolidada = path.join(carpetaReportes, `${tipo}-consolidado-${timestamp}.csv`);
        fs.writeFileSync(rutaConsolidada, datosCombinados.join('\n'));
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