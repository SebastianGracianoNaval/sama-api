const fs = require('fs');
const path = require('path');
const { generarNombreArchivo } = require('../utils/blipUtils');
const { consolidarTicketsCsvs, crearZipTickets, consolidarTicketsPorAgenteCsvs, obtenerAgentesUnicos, obtenerPlantillasUnicas } = require('../utils/csvUtils');

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
    
    // Ruta de debug para verificar estado de archivos
    debugFiles: async (req, res) => {
        try {
            console.log('[ReportController] Debug de archivos solicitado');
            
            const carpetaTickets = path.join(__dirname, '..', 'data', 'tickets');
            const carpetaReportes = path.join(__dirname, '..', 'data', 'reportes');
            
            const debugInfo = {
                directorioActual: process.cwd(),
                __dirname: __dirname,
                carpetaTickets: {
                    ruta: carpetaTickets,
                    existe: fs.existsSync(carpetaTickets),
                    archivos: []
                },
                carpetaReportes: {
                    ruta: carpetaReportes,
                    existe: fs.existsSync(carpetaReportes),
                    archivos: [],
                    archivosAtencion: []
                },
                variablesEntorno: {
                    NODE_ENV: process.env.NODE_ENV,
                    PORT: process.env.PORT
                }
            };
            
            // Verificar contenido de carpetas
            if (fs.existsSync(carpetaTickets)) {
                debugInfo.carpetaTickets.archivos = fs.readdirSync(carpetaTickets);
            }
            
            if (fs.existsSync(carpetaReportes)) {
                const archivosReportes = fs.readdirSync(carpetaReportes);
                debugInfo.carpetaReportes.archivos = archivosReportes;
                debugInfo.carpetaReportes.archivosAtencion = archivosReportes.filter(archivo => 
                    archivo.startsWith('atencion_') && archivo.endsWith('.csv')
                );
            }
            
            console.log('[ReportController] Debug info:', JSON.stringify(debugInfo, null, 2));
            
            res.json({
                success: true,
                debugInfo: debugInfo
            });
            
        } catch (error) {
            console.error('[ReportController] Error en debug:', error);
            res.status(500).json({
                success: false,
                message: 'Error en debug',
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
            
            // Lógica especial para tickets
            if (tipo === 'tickets') {
                console.log('[ReportController] Procesando consolidación de tickets');
                
                // Usar la carpeta tickets como directorio base (para la función consolidarTicketsCsvs)
                const carpeta = path.join(__dirname, '..', 'data', 'tickets');
                console.log(`[ReportController] Carpeta base: ${carpeta}`);
                
                // Verificar carpeta reportes donde están los archivos de atención
                const carpetaReportes = path.join(path.dirname(carpeta), 'reportes');
                console.log(`[ReportController] Carpeta reportes: ${carpetaReportes}`);
                console.log(`[ReportController] ¿Existe carpeta reportes?: ${fs.existsSync(carpetaReportes)}`);
                
                if (!fs.existsSync(carpetaReportes)) {
                    console.log(`[ReportController] Carpeta reportes no existe: ${carpetaReportes}`);
                    return res.status(404).json({
                        success: false,
                        message: 'No se encontró el directorio de reportes.'
                    });
                }
                
                // Verificar contenido de la carpeta reportes
                const archivosReportes = fs.readdirSync(carpetaReportes);
                console.log(`[ReportController] Archivos en carpeta reportes:`, archivosReportes);
                
                // Buscar archivos de atención específicamente
                const archivosAtencion = archivosReportes.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
                console.log(`[ReportController] Archivos de atención encontrados:`, archivosAtencion);
                
                if (archivosAtencion.length === 0) {
                    console.log(`[ReportController] No hay archivos de atención para procesar`);
                    return res.status(404).json({
                        success: false,
                        message: 'No hay datos de tickets para exportar.'
                    });
                }
                
                const fechas = (fechaInicio && fechaFin) ? { fechaInicio, fechaFin } : null;
                console.log(`[ReportController] Fechas para filtrado:`, fechas);
                
                // Consolidar tickets en dos archivos separados
                console.log(`[ReportController] Llamando a consolidarTicketsCsvs...`);
                const { botPath, plantillaPath } = await consolidarTicketsCsvs(carpeta, fechas);
                console.log(`[ReportController] Resultado consolidarTicketsCsvs - botPath: ${botPath}, plantillaPath: ${plantillaPath}`);
                
                if (!botPath && !plantillaPath) {
                    console.log(`[ReportController] No se encontraron archivos de tickets para consolidar`);
                    return res.status(404).json({
                        success: false,
                        message: 'No hay datos de tickets para exportar.'
                    });
                }
                
                // Crear ZIP con los dos archivos
                console.log(`[ReportController] Creando ZIP con archivos...`);
                const zipPath = await crearZipTickets(botPath, plantillaPath, carpeta, 'tickets');
                console.log(`[ReportController] ZIP creado en: ${zipPath}`);
                
                // Establecer el header Content-Disposition
                const nombreArchivo = `tickets_${new Date().toISOString().slice(0, 10)}.zip`;
                res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
                res.download(zipPath);
                
                return;
            }
            
            // Lógica original para otros tipos
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
    },
    // Descargar reporte de agentes filtrado
    downloadAgentes: async (req, res) => {
        try {
            const { fechaInicio, fechaFin, nombrePlantilla, correoAgente } = req.query;
            if (!correoAgente) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar el correo del agente.'
                });
            }
            const fechas = (fechaInicio && fechaFin) ? { fechaInicio, fechaFin } : null;
            const carpeta = path.join(__dirname, '..', 'data', 'tickets');
            const { botPath, plantillaPath } = await consolidarTicketsPorAgenteCsvs(carpeta, correoAgente, fechas, nombrePlantilla);
            if (!botPath && !plantillaPath) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay tickets BOT ni PLANTILLA para exportar para este agente y filtros.'
                });
            }
            // Crear ZIP con los archivos generados
            const zipPath = await crearZipTickets(botPath, plantillaPath, carpeta, 'agentes');
            if (!fs.existsSync(zipPath)) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al generar el archivo ZIP.'
                });
            }
            res.download(zipPath, err => {
                if (err) {
                    console.error('[downloadAgentes] Error al enviar ZIP:', err);
                    res.status(500).json({
                        success: false,
                        message: 'Error al descargar el archivo ZIP.'
                    });
                }
            });
        } catch (error) {
            console.error('[downloadAgentes] Error:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno al exportar los tickets de agentes.',
                error: error.message
            });
        }
    },
    // Endpoint para obtener lista única de agentes
    getAgentesList: (req, res) => {
        try {
            const carpeta = path.join(__dirname, '..', 'data', 'tickets');
            const agentes = obtenerAgentesUnicos(carpeta);
            res.json(agentes);
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al obtener la lista de agentes', error: error.message });
        }
    },
    // Endpoint para obtener lista única de plantillas
    getPlantillasList: (req, res) => {
        try {
            const carpeta = path.join(__dirname, '..', 'data', 'tickets');
            const plantillas = obtenerPlantillasUnicas(carpeta);
            res.json(plantillas);
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al obtener la lista de plantillas', error: error.message });
        }
    }
};

module.exports = reportController; 