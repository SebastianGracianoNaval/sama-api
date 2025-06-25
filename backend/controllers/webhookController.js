const { 
    procesarMensajes, 
    procesarContactos, 
    procesarEventos, 
    procesarTickets,
    procesarPlantillas,
    consolidarCsvs,
    consolidarTicketsCsvs, 
    consolidarCampanas,
    obtenerCampanasDisponibles,
    generarTicketIndividual 
} = require('../utils/csvUtils');
const { identificarTipoJson, obtenerRutaCarpeta, generarNombreArchivo, extraerInfoPlantilla } = require('../utils/blipUtils');
const path = require('path');
const { Parser } = require('json2csv');
const fs = require('fs');

// Mapa para rastrear interacciones de campañas antes de que se cree un ticket
// Clave: contactIdentity (ej. '5491169007611@wa.gw.msging.net')
// Valor: { templateName, originator, sentTime, replied, replyContent, replyTime, templateContent, campaignId, templateParameters }
const campaignTracking = new Map();

// Mapa para mantener atenciones abiertas por contacto
// Clave: contactIdentity
// Valor: { contacto, tipoBase, fechaApertura, tickets: [], cerrada }
const atencionesAbiertas = new Map();

/**
 * Función para extraer la identidad del contacto de un objeto de webhook
 * @param {Object} obj - El objeto del webhook
 * @returns {string|null} - La identidad completa del contacto (e.g., '54911...@wa.gw.msging.net')
 */
const extraerContactoIdentity = (obj) => {
    const campos = [
        obj['from'],
        obj['to'],
        obj['identity'],
        obj['customerIdentity']
    ].filter(Boolean);

    for (const campo of campos) {
        if (typeof campo === 'string' && campo.endsWith('@wa.gw.msging.net')) {
            return campo; // Devuelve la identidad completa
        }
    }
    return null;
};

/**
 * Construye el contenido de la plantilla reemplazando las variables
 * @param {string} templateText - Texto de la plantilla con placeholders {{1}}, {{2}}, etc.
 * @param {Array} parameters - Array de parámetros para reemplazar
 * @returns {string} - Contenido de la plantilla con variables reemplazadas
 */
const construirContenidoPlantilla = (templateText, parameters) => {
    if (!templateText || !parameters) return templateText;
    
    let contenido = templateText;
    parameters.forEach((param, index) => {
        const placeholder = `{{${index + 1}}}`;
        contenido = contenido.replace(new RegExp(placeholder, 'g'), param.text || param);
    });
    
    return contenido;
};

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

        // --- LÓGICA MEJORADA DE TRACKING DE CAMPAÑAS ---
        // Identificar el tipo de JSON de BLiP antes de procesar
        const tipo = identificarTipoJson(jsonData);
        
        if (tipo === 'plantilla') {
            const templateName = jsonData.content?.template?.name;
            const to = jsonData.to;
            const metadata = jsonData.metadata || {};
            
            // Si es un mensaje de plantilla enviado a un usuario, registrar la información
            if (templateName && to && to.endsWith('@wa.gw.msging.net')) {
                const contactId = to;
                const campaign = campaignTracking.get(contactId) || {};
                
                // Extraer información de la plantilla
                const templateContent = jsonData.content?.templateContent?.components?.find(c => c.type === 'BODY')?.text || '';
                const templateParameters = jsonData.content?.template?.components?.find(c => c.type === 'body')?.parameters || [];
                
                campaign.sentTime = metadata['#envelope.storageDate'] || new Date().toISOString();
                campaign.templateName = templateName;
                campaign.templateContent = templateContent;
                campaign.templateParameters = templateParameters;
                campaign.campaignId = metadata['#activecampaign.flowId'] || '';
                campaign.campaignName = metadata['#activecampaign.name'] || '';
                
                // Construir contenido con variables reemplazadas
                campaign.templateContentWithParams = construirContenidoPlantilla(templateContent, templateParameters);
                
                campaignTracking.set(contactId, campaign);
                console.log(`[CampaignTracking] Registrada plantilla para ${contactId}:`, {
                    templateName: campaign.templateName,
                    sentTime: campaign.sentTime,
                    campaignId: campaign.campaignId,
                    templateContentWithParams: campaign.templateContentWithParams
                });
            }
        } else if (tipo === 'contacto') {
            // Si es una actualización de contacto con info de campaña, registrar emisor
            if (jsonData.extras?.campaignMessageTemplate) {
                const contactId = jsonData.identity;
                const campaign = campaignTracking.get(contactId) || {};
                
                // Actualizar con información del emisor
                campaign.originator = jsonData.extras.campaignOriginator || '';
                campaign.templateName = jsonData.extras.campaignMessageTemplate;
                campaign.campaignId = jsonData.extras.campaignId || '';
                
                // Extraer variables de extras (0, 1, 2, etc.)
                const parameters = [];
                for (let i = 0; i < 10; i++) {
                    if (jsonData.extras[i.toString()] !== undefined) {
                        parameters.push({ text: jsonData.extras[i.toString()] });
                    }
                }
                campaign.templateParameters = parameters;
                
                // Si ya tenemos contenido de plantilla, construir con parámetros de extras
                if (campaign.templateContent && parameters.length > 0) {
                    campaign.templateContentWithParams = construirContenidoPlantilla(campaign.templateContent, parameters);
                }
                
                campaignTracking.set(contactId, campaign);
                console.log(`[CampaignTracking] Registrado emisor de campaña para ${contactId}:`, {
                    originator: campaign.originator,
                    templateName: campaign.templateName,
                    campaignId: campaign.campaignId,
                    templateContentWithParams: campaign.templateContentWithParams,
                    parameters: parameters.map(p => p.text)
                });
            }
        } else if (tipo === 'mensaje') {
            const contactId = jsonData.from;
            // Si es una respuesta de un usuario que recibió una campaña, registrar la respuesta
            if (contactId && campaignTracking.has(contactId)) {
                const campaign = campaignTracking.get(contactId);
                if (!campaign.replied) { // Solo registrar la primera respuesta
                    campaign.replied = true;
                    
                    // Lógica simplificada: Capturar el type y el content de la respuesta
                    campaign.replyType = jsonData.type || 'desconocido';
                    
                    if (jsonData.type === 'application/vnd.lime.reply+json') {
                        campaign.replyContent = jsonData.content?.replied?.value || '';
                    } else {
                        campaign.replyContent = jsonData.content || '';
                    }

                    campaign.replyTime = jsonData.metadata?.['#envelope.storageDate'] || new Date().toISOString();
                    
                    console.log(`[CampaignTracking] Registrada respuesta a campaña para ${contactId}:`, {
                        replyContent: campaign.replyContent,
                        replyType: campaign.replyType,
                        replyTime: campaign.replyTime
                    });
                }
            }
        }
        
        // --- LÓGICA MEJORADA PARA TICKETS (tracking de conversaciones) ---
        if (tipo === 'ticket' || tipo === 'mensaje') {
            // Procesar cada elemento del webhook para tracking de tickets
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
            for (const item of dataArray) {
                const contactoIdentity = extraerContactoIdentity(item);
                if (!contactoIdentity) continue;

                // Si es un ticket de apertura
                if (tipo === 'ticket' && item['type'] === 'application/vnd.iris.ticket+json') {
                    const content = item.content || {};
                    const metadata = item.metadata || {};
                    const sequentialId = content.sequentialId;
                    const parentSequentialId = content.parentSequentialId;
                    const fechaApertura = metadata['#envelope.storageDate'] || content.storageDate || item.storageDate || new Date().toISOString();

                    // MEJORADA: Determinar si es un ticket de campaña usando múltiples criterios
                    const campaignDetails = campaignTracking.get(contactoIdentity);
                    let ticketType = 'BOT';
                    
                    // Criterio 1: Si hay tracking de campaña para este contacto
                    if (campaignDetails && campaignDetails.templateName) {
                        ticketType = 'PLANTILLA';
                    }
                    // Criterio 2: Si el ticket tiene CampaignId en el content
                    else if (content.CampaignId) {
                        ticketType = 'PLANTILLA';
                        // Si no teníamos tracking, crear uno básico
                        if (!campaignDetails) {
                            campaignTracking.set(contactoIdentity, {
                                templateName: 'Plantilla sin nombre',
                                originator: '',
                                sentTime: fechaApertura,
                                replied: false,
                                replyContent: '',
                                replyTime: '',
                                templateContent: '',
                                templateContentWithParams: '',
                                campaignId: content.CampaignId
                            });
                        }
                    }
                    // Criterio 3: Si el ticket tiene metadata de ActiveCampaign
                    else if (metadata['#activecampaign.flowId'] || metadata['#activecampaign.name']) {
                        ticketType = 'PLANTILLA';
                    }

                    const finalCampaignDetails = campaignTracking.get(contactoIdentity);
                    
                    // NUEVA LÓGICA: Manejar tickets como parte de una atención
                    if (parentSequentialId) {
                        // Es un ticket de transferencia
                        console.log(`[Ticket] TRANSFERENCIA detectada - Hijo: ${sequentialId}, Padre: ${parentSequentialId}`);
                        
                        // Buscar la atención existente para este contacto
                        let atencion = atencionesAbiertas.get(contactoIdentity);
                        if (!atencion) {
                            console.log(`[Ticket] No se encontró atención para ${contactoIdentity}, creando nueva`);
                            atencion = {
                                contacto: contactoIdentity.split('@')[0],
                                tipoBase: ticketType, // Usar el tipo del ticket de transferencia
                                fechaApertura: fechaApertura,
                                tickets: [],
                                cerrada: false
                            };
                            atencionesAbiertas.set(contactoIdentity, atencion);
                        }
                        
                        // Agregar el ticket de transferencia a la atención
                        atencion.tickets.push({
                            ticket: item,
                            mensajes: [],
                            eventos: [],
                            cerrado: false,
                            fechaCierre: null,
                            fechaApertura: fechaApertura,
                            contacto: contactoIdentity.split('@')[0],
                            tipo: 'TRANSFERENCIA', // Tipo específico para transferencias
                            campaignDetails: finalCampaignDetails || null,
                            sequentialId: sequentialId,
                            parentSequentialId: parentSequentialId,
                            team: content.team || '',
                            agentIdentity: content.agentIdentity || ''
                        });
                        
                        console.log(`[Ticket] Ticket de transferencia agregado a atención: ${contactoIdentity} - Tipo: ${ticketType}, Transfer: ${content.team}`);
                        
                    } else {
                        // Es un ticket raíz (inicio de atención)
                        console.log(`[Ticket] TICKET RAÍZ detectado - SequentialId: ${sequentialId}`);
                        
                        // Si ya existe una atención para este contacto, cerrarla primero
                        const existingAtencion = atencionesAbiertas.get(contactoIdentity);
                        if (existingAtencion && !existingAtencion.cerrada) {
                            console.log(`[Ticket] Cerrando atención anterior para ${contactoIdentity}`);
                            existingAtencion.cerrada = true;
                            existingAtencion.fechaCierre = fechaApertura;
                        }
                        
                        // Crear nueva atención
                        const nuevaAtencion = {
                            contacto: contactoIdentity.split('@')[0],
                            tipoBase: ticketType, // BOT o PLANTILLA
                            fechaApertura: fechaApertura,
                            tickets: [],
                            cerrada: false
                        };
                        
                        // Agregar el ticket raíz a la atención
                        nuevaAtencion.tickets.push({
                            ticket: item,
                            mensajes: [],
                            eventos: [],
                            cerrado: false,
                            fechaCierre: null,
                            fechaApertura: fechaApertura,
                            contacto: contactoIdentity.split('@')[0],
                            tipo: ticketType, // BOT o PLANTILLA
                            campaignDetails: finalCampaignDetails || null,
                            sequentialId: sequentialId,
                            parentSequentialId: null,
                            team: content.team || '',
                            agentIdentity: ''
                        });
                        
                        atencionesAbiertas.set(contactoIdentity, nuevaAtencion);
                        console.log(`[Ticket] Nueva atención creada para ${contactoIdentity} (seqId: ${sequentialId}) - Tipo: ${ticketType}`);
                    }
                    
                    // Una vez que el ticket se abre, podemos limpiar el tracking para este contacto
                    if (finalCampaignDetails) {
                        campaignTracking.delete(contactoIdentity);
                    }
                }

                // Si ya existe una atención para este contacto, procesar mensajes
                const atencion = atencionesAbiertas.get(contactoIdentity);
                if (atencion && !atencion.cerrada) {
                    // Buscar el ticket más reciente (último en el array) para agregar mensajes
                    const ticketActual = atencion.tickets[atencion.tickets.length - 1];
                    if (ticketActual && !ticketActual.cerrado) {
                        // Agregar mensajes
                        if (tipo === 'mensaje') {
                            ticketActual.mensajes.push(item);
                        }
                    }
                }
            }
        }
        
        // --- LÓGICA MEJORADA DE TRACKING DE TICKETS ---
        // Validar que el tipo sea válido
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
            case 'plantilla':
                rutaArchivo = await procesarPlantillas(jsonData, outputPath);
                break;
            default:
                throw new Error(`Tipo no soportado: ${tipo}`);
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
 * Registra una plantilla en el mapa global para tracking
 * @param {Object} jsonData - Datos JSON de la plantilla
 */
const registrarPlantilla = (jsonData) => {
    try {
        const infoPlantilla = extraerInfoPlantilla(jsonData);
        if (infoPlantilla.campaignId) {
            campaignTracking.set(infoPlantilla.campaignId, infoPlantilla);
            console.log(`[Plantilla] Registrada plantilla: ${infoPlantilla.templateName} con campaignId: ${infoPlantilla.campaignId}`);
        }
    } catch (error) {
        console.error('[registrarPlantilla] Error:', error);
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

/**
 * Maneja eventos específicos del bot de WhatsApp (finalización de tickets, etc.)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const handleBotEvent = async (req, res) => {
    try {
        const { correoAgente, ticketFinalizo, identity, tipoEvento = 'finalizacion_ticket', tipoCierre } = req.body;
        
        console.log('[BotEvent] Datos recibidos:', JSON.stringify(req.body, null, 2));
        
        // Validar datos requeridos
        if (!correoAgente || !identity) {
            return res.status(400).json({
                success: false,
                message: 'correoAgente e identity son requeridos'
            });
        }
        
        // El 'identity' del evento del bot es la clave para encontrar el ticket
        const contactoIdentity = identity;
        
        // Crear evento del bot con estructura consistente
        const eventoBot = {
            id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            correoAgente,
            identity,
            numeroTelefono: contactoIdentity.replace('@wa.gw.msging.net', ''),
            ticketFinalizo: ticketFinalizo === 'true' || ticketFinalizo === true,
            tipoEvento,
            tipoCierre: tipoCierre || '',
            timestamp: new Date().toISOString(),
            procesadoEn: new Date().toISOString(),
            // Campos adicionales para compatibilidad con el sistema existente
            storageDate: new Date().toISOString(),
            fechaFiltro: new Date().toISOString().slice(0, 10),
            tipoDato: 'evento_bot'
        };
        
        console.log('[BotEvent] Evento procesado:', eventoBot);
        
        // Si es finalización de ticket, buscar la atención correspondiente
        if (eventoBot.ticketFinalizo) {
            // Buscar la atención abierta para este contacto
            const atencion = atencionesAbiertas.get(contactoIdentity);
            
            console.log(`[BotEvent] Buscando atención para cerrar en contacto ${contactoIdentity}`);
            
            if (atencion && !atencion.cerrada) {
                // Marcar toda la atención como cerrada
                atencion.cerrada = true;
                atencion.fechaCierre = eventoBot.timestamp;
                
                // Cerrar todos los tickets de la atención
                atencion.tickets.forEach(ticketInfo => {
                    ticketInfo.cerrado = true;
                    ticketInfo.fechaCierre = eventoBot.timestamp;
                    ticketInfo.correoAgente = correoAgente;
                    ticketInfo.tipoCierre = tipoCierre || '';

                    // Calcular y guardar la duración del ticket
                    const duracion = calcularDuracionTicket(ticketInfo.fechaApertura, ticketInfo.fechaCierre);
                    ticketInfo.duracion = duracion;
                    
                    console.log(`[BotEvent] Ticket cerrado: ${ticketInfo.sequentialId} por agente ${correoAgente}. Duración: ${duracion}`);
                });
                
                // Calcular duración total de la atención
                const duracionTotal = calcularDuracionTicket(atencion.fechaApertura, atencion.fechaCierre);
                atencion.duracionTotal = duracionTotal;
                
                console.log(`[BotEvent] Atención cerrada: ${contactoIdentity} - Duración total: ${duracionTotal}`);
                
                // Generar archivo de atención completa
                try {
                    const carpeta = obtenerRutaCarpeta('ticket');
                    const rutaCarpeta = path.join(__dirname, '..', carpeta);
                    
                    // Agregar información del agente y tipoCierre a todos los tickets
                    atencion.tickets.forEach(ticketInfo => {
                        ticketInfo.agente = correoAgente;
                        ticketInfo.fechaCierre = eventoBot.timestamp;
                        ticketInfo.tipoCierre = tipoCierre || '';
                    });
                    
                    generarAtencionCompleta(atencion, rutaCarpeta);
                    console.log(`[BotEvent] Archivo de atención completa generado para: ${contactoIdentity}`);
                } catch (error) {
                    console.error(`[BotEvent] Error al generar archivo de atención para ${contactoIdentity}:`, error);
                }
            } else {
                console.log(`[BotEvent] No se encontró atención abierta para contacto ${contactoIdentity}`);
            }
        }
        
        // Guardar evento del bot en CSV
        try {
            const carpeta = obtenerRutaCarpeta('evento');
            const nombreArchivo = generarNombreArchivo('evento_bot');
            const outputPath = path.join(__dirname, '..', carpeta, nombreArchivo);
            
            // Crear CSV con el evento del bot
            const campos = [
                'id', 'correoAgente', 'identity', 'numeroTelefono', 'ticketFinalizo',
                'tipoEvento', 'tipoCierre', 'timestamp', 'procesadoEn', 'storageDate', 'fechaFiltro', 'tipoDato'
            ];
            
            const parser = new Parser({ fields: campos, header: true });
            const csv = parser.parse([eventoBot]);
            
            // Asegurar directorio
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(outputPath, csv);
            console.log(`[BotEvent] Evento guardado en: ${outputPath}`);
            
        } catch (error) {
            console.error('[BotEvent] Error al guardar evento:', error);
        }
        
        // IMPORTANTE: Guardar en el array de webhooks para que aparezca en el frontend
        // Necesitamos acceder al array webhooksRecibidos desde index.js
        // Esto se manejará en la ruta del index.js
        
        res.status(200).json({
            success: true,
            message: 'Evento del bot procesado correctamente',
            eventoId: eventoBot.id,
            ticketFinalizo: eventoBot.ticketFinalizo,
            contacto: contactoIdentity,
            // Incluir datos para el frontend
            webhookData: {
                fecha: new Date().toISOString(),
                tipo: 'BOT EVENT',
                body: {
                    correoAgente: eventoBot.correoAgente,
                    identity: eventoBot.identity,
                    ticketFinalizo: eventoBot.ticketFinalizo,
                    tipoEvento: eventoBot.tipoEvento,
                    tipoCierre: eventoBot.tipoCierre,
                    timestamp: eventoBot.timestamp,
                    numeroTelefono: eventoBot.numeroTelefono
                }
            }
        });
        
    } catch (error) {
        console.error('[BotEvent] Error procesando evento del bot:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar el evento del bot',
            error: error.message
        });
    }
};

/**
 * Calcula la duración entre dos fechas y la formatea
 * @param {string} inicio - Fecha de inicio en formato ISO
 * @param {string} fin - Fecha de fin en formato ISO
 * @returns {string} - Duración formateada (e.g., "1d 2h 30m 15s")
 */
function calcularDuracionTicket(inicio, fin) {
    if (!inicio || !fin) return '';
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    let diff = fechaFin.getTime() - fechaInicio.getTime();

    if (isNaN(diff) || diff < 0) return '';

    let dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= dias * (1000 * 60 * 60 * 24);

    let horas = Math.floor(diff / (1000 * 60 * 60));
    diff -= horas * (1000 * 60 * 60);

    let mins = Math.floor(diff / (1000 * 60));
    diff -= mins * (1000 * 60);

    let segs = Math.floor(diff / 1000);

    return `${dias}d ${horas}h ${mins}m ${segs}s`;
}

/**
 * Maneja eventos específicos de campañas (envío de plantillas, respuestas, etc.)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const handleCampaignEvent = async (req, res) => {
    try {
        const { 
            agentePlantilla, 
            identity, 
            numeroTelefono, 
            esPlantilla, 
            respuesta
        } = req.body;
        
        console.log('[CampaignEvent] Datos recibidos:', JSON.stringify(req.body, null, 2));
        
        // Validar datos requeridos
        if (!identity || esPlantilla === undefined) {
            return res.status(400).json({
                success: false,
                message: 'identity y esPlantilla son requeridos'
            });
        }
        
        // La clave para el tracking de campañas es siempre la identidad completa
        const contactoIdentity = identity;
        
        // Crear evento de campaña con estructura consistente
        const campaignEvent = {
            id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agentePlantilla: agentePlantilla || '',
            identity,
            numeroTelefono: numeroTelefono || contactoIdentity.replace('@wa.gw.msging.net', ''),
            esPlantilla: esPlantilla === true || esPlantilla === 'true',
            respuesta: respuesta || '',
            timestamp: new Date().toISOString(),
            procesadoEn: new Date().toISOString(),
            // Campos adicionales para compatibilidad
            storageDate: new Date().toISOString(),
            fechaFiltro: new Date().toISOString().slice(0, 10),
            tipoDato: 'evento_campaña'
        };
        
        console.log('[CampaignEvent] Evento procesado:', campaignEvent);
        
        // Si es una plantilla, actualizar el tracking de campañas
        if (campaignEvent.esPlantilla) {
            const campaign = campaignTracking.get(contactoIdentity) || {};
            
            // Actualizar con información del agente
            campaign.originator = agentePlantilla;
            
            // Si hay respuesta del usuario, actualizarla
            if (respuesta) {
                campaign.replied = true;
                campaign.replyContent = respuesta;
                campaign.replyTime = campaignEvent.timestamp;
            }
            
            campaignTracking.set(contactoIdentity, campaign);
            
            console.log(`[CampaignEvent] Tracking actualizado para ${contactoIdentity}:`, {
                originator: campaign.originator,
                replyContent: campaign.replyContent,
                replied: campaign.replied,
                templateName: campaign.templateName,
                templateContentWithParams: campaign.templateContentWithParams
            });
        }
        
        // Guardar evento de campaña en CSV
        try {
            const carpeta = obtenerRutaCarpeta('evento');
            const nombreArchivo = generarNombreArchivo('evento_campaña');
            const outputPath = path.join(__dirname, '..', carpeta, nombreArchivo);
            
            // Crear CSV con el evento de campaña
            const campos = [
                'id', 'agentePlantilla', 'identity', 'numeroTelefono', 'esPlantilla', 
                'respuesta', 'timestamp', 'procesadoEn', 'storageDate', 'fechaFiltro', 'tipoDato'
            ];
            
            const parser = new Parser({ fields: campos, header: true });
            const csv = parser.parse([campaignEvent]);
            
            // Asegurar directorio
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(outputPath, csv);
            console.log(`[CampaignEvent] Evento guardado en: ${outputPath}`);
            
        } catch (error) {
            console.error('[CampaignEvent] Error al guardar evento:', error);
        }
        
        res.status(200).json({
            success: true,
            message: 'Evento de campaña procesado correctamente',
            eventoId: campaignEvent.id,
            esPlantilla: campaignEvent.esPlantilla,
            contacto: contactoIdentity,
            // Incluir datos para el frontend
            webhookData: {
                fecha: new Date().toISOString(),
                tipo: 'CAMPAIGN EVENT',
                body: campaignEvent
            }
        });
        
    } catch (error) {
        console.error('[CampaignEvent] Error procesando evento de campaña:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar el evento de campaña',
            error: error.message
        });
    }
};

module.exports = {
    handleWebhook,
    consolidarArchivos,
    consolidarTickets,
    handleBotEvent,
    handleCampaignEvent,
    atencionesAbiertas
}; 