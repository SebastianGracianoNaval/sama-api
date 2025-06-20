const { convertJsonToCsv, consolidarCsvs, flattenObject, consolidarTicketsCsvs, generarTicketIndividual } = require('../utils/csvUtils');
const { identificarTipoJson, obtenerRutaCarpeta, generarNombreArchivo, detectarCierreTicket } = require('../utils/blipUtils');
const path = require('path');

// Mapa global para mantener tickets abiertos por contacto
const ticketsAbiertos = new Map();

/**
 * Maneja las solicitudes POST del webhook
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const handleWebhook = async (req, res) => {
    try {
        const jsonData = req.body;
        console.log('[Webhook] Datos recibidos:', JSON.stringify(jsonData, null, 2));
        
        if (!jsonData || Object.keys(jsonData).length === 0) {
            console.error('[Webhook] No se recibieron datos JSON');
            return res.status(400).json({
                success: false,
                message: 'No se recibieron datos JSON'
            });
        }

        // Buscar la fecha más relevante y formatearla a yyyy-mm-dd
        function obtenerFechaFiltro(obj) {
            let fecha = null;
            
            // Priorizar campos de fecha en orden de importancia
            const fechaFields = [
                'metadata.#envelope.storageDate',
                'metadata.#wa.timestamp',
                'storageDate',
                '#envelope.storageDate',
                '#wa.timestamp',
                '#date_processed',
                'date_created',
                'lastMessageDate'
            ];
            
            for (const field of fechaFields) {
                const value = obj[field];
                if (!value) continue;
                
                if (typeof value === 'string') {
                    // Intentar extraer fecha de formato ISO
                    const fechaMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
                    if (fechaMatch) {
                        fecha = fechaMatch[0];
                        break;
                    }
                } else if (typeof value === 'number') {
                    // Intentar convertir timestamp a fecha
                    try {
                        const fechaObj = new Date(value);
                        if (!isNaN(fechaObj.getTime())) {
                            fecha = fechaObj.toISOString().slice(0, 10);
                            break;
                        }
                    } catch (e) {
                        // Ignorar errores de conversión
                    }
                }
            }
            
            // Validar que sea una fecha válida en formato yyyy-mm-dd
            if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
                console.log('[fechaFiltro válido]', fecha);
                return fecha;
            }
            
            // Si no hay fecha válida, usar la fecha actual y loguear el objeto
            const hoy = new Date().toISOString().slice(0, 10);
            console.warn('[fechaFiltro inválido, asignando fecha actual]', hoy, 'obj:', JSON.stringify(obj, null, 2));
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
        console.log('[Webhook] Datos con fechaFiltro:', dataConFechaFiltro);
        // Convertir JSON a CSV (siempre como array de objetos planos)
        const tipo = identificarTipoJson(jsonData);
        console.log('[Webhook] Tipo identificado:', tipo);
        if (!tipo) {
            console.error('[Webhook] No se pudo identificar el tipo de datos del JSON recibido');
            return res.status(400).json({
                success: false,
                message: 'No se pudo identificar el tipo de datos del JSON recibido'
            });
        }
        // Si es ticket, agregar campos cerrado y fechaCierre
        if (tipo === 'ticket') {
            dataConFechaFiltro = dataConFechaFiltro.map(ticket => {
                const cierre = detectarCierreTicket(ticket);
                console.log(`[Webhook] Ticket ${ticket['content.sequentialId'] || ''} cerrado:`, cierre);
                return { ...ticket, cerrado: cierre.cerrado, fechaCierre: cierre.fechaCierre };
            });
        }

        // --- LÓGICA DE TICKETS (generación automática de archivos individuales) ---
        if (tipo === 'ticket' || tipo === 'mensaje' || tipo === 'evento') {
            // Función para extraer el número de teléfono del contacto
            const extraerContacto = (obj) => {
                const campos = [
                    obj['from'],
                    obj['to'],
                    obj['identity']
                ].filter(Boolean);

                for (const campo of campos) {
                    if (campo && campo.endsWith('@wa.gw.msging.net')) {
                        const numero = campo.split('@')[0];
                        if (/^\d+$/.test(numero)) {
                            return numero;
                        }
                    }
                }
                return null;
            };

            // Procesar cada elemento del webhook
            for (const item of dataConFechaFiltro) {
                const contacto = extraerContacto(item);
                if (!contacto) continue;

                // Si es un ticket de apertura
                if (tipo === 'ticket' && item['type'] === 'application/vnd.iris.ticket+json') {
                    if (!ticketsAbiertos.has(contacto) || ticketsAbiertos.get(contacto).cerrado) {
                        ticketsAbiertos.set(contacto, {
                            ticket: item,
                            mensajes: [],
                            eventos: [],
                            cerrado: false,
                            fechaCierre: null,
                            contacto: contacto
                        });
                        console.log(`[Ticket] Caja ABIERTA para contacto ${contacto} (seqId: ${item['content.sequentialId']})`);
                    }
                }

                // Si ya existe un ticket para este contacto, procesar mensajes y eventos
                const ticketInfo = ticketsAbiertos.get(contacto);
                if (ticketInfo && !ticketInfo.cerrado) {
                    // Agregar mensajes
                    if (tipo === 'mensaje') {
                        ticketInfo.mensajes.push(item);
                    }
                    
                    // Agregar eventos y verificar cierre
                    if (tipo === 'evento') {
                        ticketInfo.eventos.push(item);
                        
                        // Verificar si es un evento de cierre
                        const prevName = (item['extras.#previousStateName'] || '').toLowerCase();
                        const prevId = (item['extras.#previousStateId'] || '').toLowerCase();
                        const action = (item['action'] || '').toLowerCase();
                        
                        if (prevName.includes('atendimento humano') || 
                            prevName.includes('atencion humana') || 
                            prevId.startsWith('desk') || 
                            action.includes('encuesta')) {
                            
                            ticketInfo.cerrado = true;
                            ticketInfo.fechaCierre = item['storageDate'] || item['fechaFiltro'];
                            console.log(`[Ticket] Caja CERRADA para contacto ${contacto} (seqId: ${ticketInfo.ticket['content.sequentialId']})`);
                            
                            // Generar archivo individual del ticket
                            try {
                                const carpeta = obtenerRutaCarpeta('ticket');
                                const rutaCarpeta = path.join(__dirname, '..', carpeta);
                                generarTicketIndividual(ticketInfo, rutaCarpeta);
                                console.log(`[Ticket] Archivo individual generado para contacto ${contacto}`);
                            } catch (error) {
                                console.error(`[Ticket] Error al generar archivo individual para contacto ${contacto}:`, error);
                            }
                        }
                    }
                }
            }
        }

        const carpeta = obtenerRutaCarpeta(tipo);
        const nombreArchivo = generarNombreArchivo(tipo);
        const outputPath = path.join(__dirname, '..', carpeta, nombreArchivo);
        console.log('[Webhook] Guardando CSV en:', outputPath);
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