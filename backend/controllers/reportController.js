const fs = require('fs');
const path = require('path');
const { generarNombreArchivo } = require('../utils/blipUtils');

const reportController = {
    // Obtener lista de reportes disponibles
    getReportesList: async (req, res) => {
        try {
            console.log('[ReportController] Obteniendo lista de reportes');
            const carpetaReportes = path.join(__dirname, '..', 'data', 'reportes');
            if (!fs.existsSync(carpetaReportes)) {
                fs.mkdirSync(carpetaReportes, { recursive: true });
                return res.json({ files: [] });
            }
            const archivos = fs.readdirSync(carpetaReportes)
                .filter(archivo => archivo.endsWith('.csv'))
                .map(archivo => {
                    const stats = fs.statSync(path.join(carpetaReportes, archivo));
                    return {
                        name: archivo,
                        fecha: stats.mtime
                    };
                })
                .sort((a, b) => b.fecha - a.fecha);
            res.json({ files: archivos });
        } catch (error) {
            console.error('[ReportController] Error al obtener lista de reportes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la lista de reportes',
                error: error.message
            });
        }
    },
    // Descargar reporte específico
    downloadReporte: async (req, res) => {
        try {
            const { filename } = req.params;
            const rutaArchivo = path.join(__dirname, '..', 'data', 'reportes', filename);
            if (!fs.existsSync(rutaArchivo)) {
                return res.status(404).json({
                    success: false,
                    message: 'Archivo no encontrado'
                });
            }
            res.download(rutaArchivo);
        } catch (error) {
            console.error('[ReportController] Error al descargar reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Error al descargar el reporte',
                error: error.message
            });
        }
    },
    // Descargar reporte por tipo y filtros
    downloadReporteByType: async (req, res) => {
        try {
            const { tipo } = req.params;
            const { fechaInicio, fechaFin, nombrePlantilla } = req.query;
            console.log(`[ReportController] Generando reporte de tipo: ${tipo}`);
            console.log(`[ReportController] Filtros - Inicio: ${fechaInicio}, Fin: ${fechaFin}, Plantilla: ${nombrePlantilla}`);
            // Validar fechas
            if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe seleccionar ambas fechas para filtrar.'
                });
            }
            if (fechaInicio && fechaFin) {
                if (fechaInicio > fechaFin) {
                    return res.status(400).json({
                        success: false,
                        message: 'La fecha de inicio no puede ser posterior a la fecha fin.'
                    });
                }
                const hoy = new Date().toISOString().slice(0, 10);
                if (fechaInicio > hoy || fechaFin > hoy) {
                    return res.status(400).json({
                        success: false,
                        message: 'No se pueden seleccionar fechas futuras.'
                    });
                }
            }
            // Obtener ruta de la carpeta según tipo
            const carpeta = path.join(__dirname, '..', 'data', tipo === 'tickets' ? 'tickets' : 'plantillas');
            if (!fs.existsSync(carpeta)) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontró el directorio de datos.'
                });
            }
            // Leer y procesar archivos
            const archivos = fs.readdirSync(carpeta)
                .filter(archivo => archivo.endsWith('.csv'));
            if (archivos.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay datos para exportar.'
                });
            }
            let datosCombinados = [];
            let encabezados = null;
            let incluidas = 0;
            let descartadas = 0;
            for (const archivo of archivos) {
                const rutaArchivo = path.join(carpeta, archivo);
                const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
                const lineas = contenido.split('\n');
                if (!encabezados) {
                    encabezados = lineas[0];
                    datosCombinados.push(encabezados);
                }
                const columnas = encabezados.split(',').map(col => col.trim());
                const fechaIndex = columnas.findIndex(col => col === 'fechaFiltro');
                for (let i = 1; i < lineas.length; i++) {
                    const linea = lineas[i].trim();
                    if (!linea) continue;
                    if (fechaInicio && fechaFin && fechaIndex !== -1) {
                        const valores = linea.match(/(?:"[^"]*"|[^,])+/g).map(v => v.trim().replace(/^"|"$/g, ''));
                        const fecha = valores[fechaIndex];
                        if (fecha && fecha >= fechaInicio && fecha <= fechaFin) {
                            incluidas++;
                            datosCombinados.push(linea);
                        } else {
                            descartadas++;
                        }
                    } else {
                        datosCombinados.push(linea);
                        incluidas++;
                    }
                }
            }
            if (datosCombinados.length <= 1) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay datos para exportar.'
                });
            }
            // Generar nombre de archivo con el formato correcto
            const nombreArchivo = generarNombreArchivo(tipo);

            // Guardar reporte consolidado
            const carpetaReportes = path.join(__dirname, '..', 'data', 'reportes');
            if (!fs.existsSync(carpetaReportes)) {
                fs.mkdirSync(carpetaReportes, { recursive: true });
            }
            const rutaConsolidada = path.join(carpetaReportes, nombreArchivo);
            fs.writeFileSync(rutaConsolidada, datosCombinados.join('\n'));

            // Establecer el header Content-Disposition
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
            res.download(rutaConsolidada);
        } catch (error) {
            console.error('[ReportController] Error al generar reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Error al generar el reporte',
                error: error.message
            });
        }
    }
};

module.exports = reportController; 