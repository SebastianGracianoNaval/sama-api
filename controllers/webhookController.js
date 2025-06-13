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
        function obtenerFechaFiltro(obj) {
            // Buscar la fecha más relevante en el objeto
            let fecha = null;
            // 1. Buscar en metadata.#envelope.storageDate
            if (obj.metadata && obj.metadata['#envelope.storageDate']) {
                fecha = obj.metadata['#envelope.storageDate'];
            } else if (obj.metadata && obj.metadata['#wa.timestamp']) {
                // 2. Buscar en metadata.#wa.timestamp (es unix timestamp en segundos)
                const ts = Number(obj.metadata['#wa.timestamp']);
                if (!isNaN(ts)) {
                    fecha = new Date(ts * 1000).toISOString();
                }
            } else if (obj.date_created) {
                // 3. Buscar en date_created (si existe)
                const ts = Number(obj.date_created);
                if (!isNaN(ts)) {
                    fecha = new Date(ts).toISOString();
                }
            } else if (obj['#envelope.storageDate']) {
                // 4. Buscar en #envelope.storageDate directo
                fecha = obj['#envelope.storageDate'];
            }
            // Si no se encontró, usar la fecha actual
            if (!fecha) {
                fecha = new Date().toISOString();
            }
            // Formatear a dd/mm/yyyy
            const d = new Date(fecha);
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const anio = d.getFullYear();
            const fechaFiltro = `${dia}/${mes}/${anio}`;
            return fechaFiltro;
        }
        function addFechaFiltro(obj) {
            const entries = Object.entries(obj);
            // Eliminar si ya existe
            const filtered = entries.filter(([key]) => key !== 'fechaFiltro');
            return Object.fromEntries([...filtered, ['fechaFiltro', obtenerFechaFiltro(obj)]]);
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
        const { fechaInicio, fechaFin } = req.query;

        console.log('[DEBUG] Endpoint consolidarArchivos llamado');
        console.log('[DEBUG] Tipo:', tipo);
        console.log('[DEBUG] Query params:', req.query);

        if (!['mensaje', 'evento', 'contacto'].includes(tipo)) {
            console.log('[DEBUG] Tipo de datos inválido:', tipo);
            return res.status(400).json({
                success: false,
                message: 'Tipo de datos inválido'
            });
        }

        const carpeta = obtenerRutaCarpeta(tipo);
        if (!carpeta) {
            console.log('[DEBUG] No se pudo determinar la carpeta para tipo:', tipo);
            return res.status(500).json({
                success: false,
                message: 'Error al determinar la carpeta de destino'
            });
        }

        // Convertir fechas si existen
        let fechas = null;
        if (fechaInicio && fechaFin) {
            fechas = {
                inicio: new Date(fechaInicio),
                fin: new Date(fechaFin)
            };
            console.log('[DEBUG] Fechas parseadas:', fechas);
        } else {
            console.log('[DEBUG] No se recibieron fechas para filtrar');
        }

        // LOGS DE CONSOLIDACION
        const pathCarpeta = path.join(__dirname, '..', carpeta);
        const fs = require('fs');
        const archivos = fs.readdirSync(pathCarpeta).filter(archivo => archivo.endsWith('.csv'));
        console.log('[DEBUG] Archivos CSV encontrados:', archivos);
        if (archivos.length === 0) {
            console.log('[DEBUG] No hay archivos CSV para consolidar');
        }
        if (fechas) {
            console.log('[DEBUG] Fechas para filtrar:', fechas);
        }

        try {
            const rutaConsolidada = await consolidarCsvs(
                pathCarpeta,
                tipo,
                fechas
            );
            console.log('[DEBUG] Archivo consolidado generado:', rutaConsolidada);

            res.status(200).json({
                success: true,
                message: 'Archivos consolidados correctamente',
                filePath: rutaConsolidada
            });
        } catch (errorConsolidar) {
            console.error('[DEBUG] Error en consolidarCsvs:', errorConsolidar.message);
            if (errorConsolidar.message === 'No hay datos para el período especificado') {
                return res.status(404).json({
                    success: false,
                    message: 'No hay datos para el período especificado'
                });
            }
            if (errorConsolidar.message === 'No hay archivos CSV para consolidar') {
                return res.status(404).json({
                    success: false,
                    message: 'No hay archivos para consolidar'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Error al consolidar los archivos',
                error: errorConsolidar.message
            });
        }

    } catch (error) {
        console.error('[DEBUG] Error general en consolidarArchivos:', error);
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