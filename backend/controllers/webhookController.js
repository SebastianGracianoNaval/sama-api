const { convertJsonToCsv, consolidarCsvs, flattenObject, consolidarTicketsCsvs } = require('../utils/csvUtils');
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
            if (obj.metadata && obj.metadata['#envelope.storageDate']) {
                fecha = obj.metadata['#envelope.storageDate'];
            } else if (obj.metadata && obj.metadata['#wa.timestamp']) {
                const ts = Number(obj.metadata['#wa.timestamp']);
                if (!isNaN(ts)) fecha = new Date(ts * 1000).toISOString();
            } else if (obj.storageDate) {
                fecha = obj.storageDate;
            } else if (obj['#envelope.storageDate']) {
                fecha = obj['#envelope.storageDate'];
            } else if (obj['#wa.timestamp']) {
                const ts = Number(obj['#wa.timestamp']);
                if (!isNaN(ts)) fecha = new Date(ts * 1000).toISOString();
            } else if (obj['#date_processed']) {
                const ts = Number(obj['#date_processed']);
                if (!isNaN(ts)) fecha = new Date(ts).toISOString();
            } else if (obj.date_created) {
                const ts = Number(obj.date_created);
                if (!isNaN(ts)) fecha = new Date(ts).toISOString();
            } else if (obj.lastMessageDate) {
                fecha = obj.lastMessageDate;
            }
            // Validar que sea una fecha yyyy-mm-dd
            if (fecha && /^\d{4}-\d{2}-\d{2}/.test(fecha.slice(0, 10))) {
                console.log('[fechaFiltro válido]', fecha.slice(0, 10));
                return fecha.slice(0, 10);
            }
            // Si no hay fecha válida, usar la fecha actual y loguear el objeto
            const hoy = new Date().toISOString().slice(0, 10);
            console.log('[fechaFiltro inválido, asignando fecha actual]', hoy, 'obj:', obj);
            return hoy;
        }
        function addFechaFiltro(obj) {
            const fechaFiltro = obtenerFechaFiltro(obj);
            const objWithFecha = { ...obj, fechaFiltro };
            const flat = flattenObject(objWithFecha);
            return flat;
        }
        let dataConFechaFiltro;
        if (Array.isArray(jsonData)) {
            dataConFechaFiltro = jsonData.map(item => addFechaFiltro(item));
        } else {
            dataConFechaFiltro = [addFechaFiltro(jsonData)];
        }
        // Convertir JSON a CSV (siempre como array de objetos planos)
        const tipo = identificarTipoJson(jsonData);
        if (!tipo) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo identificar el tipo de datos del JSON recibido'
            });
        }
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
        const { fechaInicio, fechaFin } = req.query;
        console.log('[consolidarArchivos] tipo:', tipo, 'fechaInicio:', fechaInicio, typeof fechaInicio, 'fechaFin:', fechaFin, typeof fechaFin);
        const carpeta = obtenerRutaCarpeta(tipo);
        if (!carpeta) {
            return res.status(500).json({
                success: false,
                message: 'Error al determinar la carpeta de destino'
            });
        }
        // Validación de fechas si se reciben
        let usarFiltroFechas = false;
        let hoy = new Date().toISOString().slice(0, 10);
        if (fechaInicio && fechaFin) {
            usarFiltroFechas = true;
            if (fechaInicio > fechaFin) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha de inicio no puede ser posterior a la fecha fin.'
                });
            }
            if (fechaInicio > hoy || fechaFin > hoy) {
                return res.status(400).json({
                    success: false,
                    message: 'No se pueden seleccionar fechas futuras.'
                });
            }
        }
        const pathCarpeta = path.join(__dirname, '..', carpeta);
        const fs = require('fs');
        if (!fs.existsSync(pathCarpeta)) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró el directorio de datos.'
            });
        }
        const archivos = fs.readdirSync(pathCarpeta).filter(archivo => archivo.endsWith('.csv'));
        console.log('[consolidarArchivos] Archivos CSV encontrados:', archivos);
        if (archivos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay archivos CSV para consolidar.'
            });
        }
        let datosCombinados = [];
        let encabezados = null;
        let incluidas = 0;
        let descartadas = 0;
        for (const archivo of archivos) {
            const rutaArchivo = path.join(pathCarpeta, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const lineas = contenido.split('\n');
            if (!encabezados) {
                encabezados = lineas[0];
                datosCombinados.push(encabezados);
                console.log('[consolidarArchivos] Encabezados:', encabezados);
            }
            const columnas = encabezados.split(',').map(col => col.trim());
            const fechaIndex = columnas.findIndex(col => col === 'fechaFiltro');
            console.log('[consolidarArchivos] Índice de fechaFiltro:', fechaIndex);
            for (let i = 1; i < lineas.length; i++) {
                const linea = lineas[i].trim();
                if (!linea) continue;
                if (usarFiltroFechas && fechaIndex !== -1) {
                    const valores = linea.match(/(?:"[^"]*"|[^,])+/g).map(v => v.trim().replace(/^"|"$/g, ''));
                    const fecha = valores[fechaIndex];
                    console.log(`[Filtro] Línea ${i}: fechaFiltro='${fecha}', fechaInicio='${fechaInicio}', fechaFin='${fechaFin}'`);
                    const entra = fecha && fecha >= fechaInicio && fecha <= fechaFin;
                    console.log(`[Filtro] Comparación: ${fecha} >= ${fechaInicio} && ${fecha} <= ${fechaFin} => ${entra}`);
                    if (entra) {
                        incluidas++;
                        datosCombinados.push(linea);
                        console.log(`[Filtro] Línea ${i} INCLUIDA`);
                    } else {
                        descartadas++;
                        console.log(`[Filtro] Línea ${i} DESCARTADA`);
                    }
                } else {
                    datosCombinados.push(linea);
                }
            }
        }
        console.log(`[Filtro] Total líneas incluidas: ${incluidas}, descartadas: ${descartadas}`);
        if (datosCombinados.length <= 1) {
            console.log('[Filtro] No hay datos después del filtrado.');
            return res.status(404).json({
                success: false,
                message: usarFiltroFechas ? 'No hay datos para el rango de fechas seleccionado.' : 'No hay datos para consolidar.'
            });
        }
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

/**
 * Consolida los archivos CSV de tickets, deduplicando por sequentialId
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const consolidarTickets = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        const carpeta = obtenerRutaCarpeta('ticket');
        if (!carpeta) {
            return res.status(500).json({
                success: false,
                message: 'Error al determinar la carpeta de destino de tickets'
            });
        }
        let hoy = new Date().toISOString().slice(0, 10);
        if (fechaInicio && fechaFin) {
            if (fechaInicio > fechaFin) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha de inicio no puede ser posterior a la fecha fin.'
                });
            }
            if (fechaInicio > hoy || fechaFin > hoy) {
                return res.status(400).json({
                    success: false,
                    message: 'No se pueden seleccionar fechas futuras.'
                });
            }
        }
        const pathCarpeta = path.join(__dirname, '..', carpeta);
        const fs = require('fs');
        if (!fs.existsSync(pathCarpeta)) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró el directorio de tickets.'
            });
        }
        const fechas = (fechaInicio && fechaFin) ? { fechaInicio, fechaFin } : null;
        const rutaConsolidada = await consolidarTicketsCsvs(pathCarpeta, fechas);
        res.status(200).json({
            success: true,
            message: 'Tickets consolidados correctamente',
            filePath: rutaConsolidada
        });
    } catch (error) {
        console.error('Error al consolidar tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Error al consolidar los tickets',
            error: error.message
        });
    }
};

module.exports = {
    handleWebhook,
    consolidarArchivos,
    consolidarTickets
}; 