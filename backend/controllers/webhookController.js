const { 
    procesarMensajes, 
    procesarContactos, 
    procesarEventos, 
    procesarTickets,
    consolidarCsvs,
    consolidarTicketsCsvs, 
    generarTicketIndividual 
} = require('../utils/csvUtils');
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

        // Identificar el tipo de dato
        const tipo = identificarTipoJson(jsonData);
        console.log('[Webhook] Tipo identificado:', tipo);
        
        if (!tipo || tipo === 'desconocido') {
            console.error('[Webhook] No se pudo identificar el tipo de datos del JSON recibido');
            return res.status(400).json({
                success: false,
                message: 'No se pudo identificar el tipo de datos del JSON recibido'
            });
        }

        // Procesar según el tipo usando las funciones específicas
        const carpeta = obtenerRutaCarpeta(tipo);
        const nombreArchivo = generarNombreArchivo(tipo);
        const outputPath = path.join(__dirname, '..', carpeta, nombreArchivo);
        
        console.log('[Webhook] Procesando con función específica para:', tipo);
        console.log('[Webhook] Guardando CSV en:', outputPath);

        let rutaArchivo;
        switch (tipo) {
            case 'mensaje':
                rutaArchivo = await procesarMensajes(jsonData, outputPath);
                break;
            case 'contacto':
                rutaArchivo = await procesarContactos(jsonData, outputPath);
                break;
            case 'evento':
                rutaArchivo = await procesarEventos(jsonData, outputPath);
                break;
            case 'ticket':
                rutaArchivo = await procesarTickets(jsonData, outputPath);
                break;
            default:
                throw new Error(`Tipo no soportado: ${tipo}`);
        }

        // --- LÓGICA ESPECIAL PARA TICKETS (tracking de conversaciones) ---
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

            // Procesar cada elemento del webhook para tracking de tickets
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
            for (const item of dataArray) {
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
                            
                            // Generar archivo individual del ticket con conversación
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

        res.status(200).json({
            success: true,
            message: 'Datos procesados correctamente',
            tipo: tipo,
            filePath: rutaArchivo
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
        const rutaConsolidada = await consolidarCsvs(pathCarpeta, tipo, fechas);
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