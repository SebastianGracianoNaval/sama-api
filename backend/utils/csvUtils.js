const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * Convierte un objeto JSON a formato CSV
 * @param {Object} jsonData - Los datos JSON a convertir
 * @param {string} outputPath - Ruta donde se guardará el archivo CSV
 * @returns {Promise<string>} - Ruta del archivo CSV generado
 */
const convertJsonToCsv = async (jsonData, outputPath) => {
    try {
        // Asegurarnos que jsonData sea un array
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

        // Aplanar todos los objetos y asegurar que todos tengan fechaFiltro al final
        const flattenedData = dataArray.map(obj => {
            let objCopy = { ...obj };
            // Si el objeto ya trae fechaFiltro, lo renombramos a fechaFiltroOriginal
            if (Object.prototype.hasOwnProperty.call(objCopy, 'fechaFiltro')) {
                objCopy['fechaFiltroOriginal'] = objCopy['fechaFiltro'];
                delete objCopy['fechaFiltro'];
            }
            const flat = flattenObject(objCopy);
            
            // Buscar una fecha válida para el campo de sistema fechaFiltro
            let fechaFiltro = '';
            const fechaKeys = Object.keys(flat).filter(key => 
                key.includes('date') || 
                key.includes('Date') || 
                key.includes('timestamp') || 
                key.includes('Timestamp') ||
                key.includes('storageDate')
            );
            for (const key of fechaKeys) {
                const valor = flat[key];
                if (valor && typeof valor === 'string') {
                    const fechaMatch = valor.match(/^\d{4}-\d{2}-\d{2}/);
                    if (fechaMatch) {
                        fechaFiltro = fechaMatch[0];
                        break;
                    }
                } else if (valor && typeof valor === 'number') {
                    try {
                        const fecha = new Date(valor);
                        if (!isNaN(fecha.getTime())) {
                            fechaFiltro = fecha.toISOString().slice(0, 10);
                            break;
                        }
                    } catch (e) {}
                }
            }
            if (!fechaFiltro) {
                fechaFiltro = new Date().toISOString().slice(0, 10);
            }
            // Agregar el campo fechaFiltro al final
            flat['fechaFiltro'] = fechaFiltro;
            return flat;
        });

        // Obtener todos los campos únicos de todos los objetos
        const fields = new Set();
        flattenedData.forEach(obj => {
            Object.keys(obj).forEach(key => fields.add(key));
        });

        // Convertir Set a Array y asegurarnos que fechaFiltro esté al final
        let fieldsArray = Array.from(fields);
        if (!fieldsArray.includes('fechaFiltro')) {
            fieldsArray.push('fechaFiltro');
        } else {
            fieldsArray = fieldsArray.filter(f => f !== 'fechaFiltro');
            fieldsArray.push('fechaFiltro');
        }

        // Crear el parser con los campos explícitos y opciones adicionales
        const parser = new Parser({
            fields: fieldsArray,
            header: true,
            quote: '"',
            delimiter: ',',
            eol: '\n',
            // Asegurarnos que los valores nulos o undefined se manejen correctamente
            defaultValue: '',
            // Mantener el orden de las columnas
            preserveOrder: true
        });
        
        // Convertir el JSON a CSV
        const csv = parser.parse(flattenedData);
        
        // Asegurarse de que el directorio existe
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Escribir el archivo CSV
        fs.writeFileSync(outputPath, csv);
        
        return outputPath;
    } catch (error) {
        throw new Error(`Error al convertir JSON a CSV: ${error.message}`);
    }
};

/**
 * Verifica si una fecha está dentro del rango especificado
 * @param {string} fechaStr - Fecha a verificar en formato ISO
 * @param {Object} fechas - Objeto con fechas de inicio y fin
 * @returns {boolean} - true si la fecha está dentro del rango
 */
const fechaEnRango = (fechaStr, fechas) => {
    if (!fechas) return true;
    if (!fechaStr) return false;

    // Extraer solo la parte de la fecha si viene en formato ISO o similar
    const match = fechaStr.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (!match) {
        console.log(`[fechaEnRango] Fecha inválida ignorada: '${fechaStr}'`);
        return false;
    }
    const fechaLimpia = match[1];
    const inicio = fechas.fechaInicio;
    const fin = fechas.fechaFin;
    const entra = (fechaLimpia >= inicio && fechaLimpia <= fin);

    // Debug
    console.log(`[fechaEnRango] fechaFiltro: '${fechaLimpia}', inicio: '${inicio}', fin: '${fin}', entra: ${entra}`);
    return entra;
};

/**
 * Consolida archivos CSV con estructura mejorada según el tipo
 * @param {string} directorio - Ruta del directorio que contiene los archivos CSV
 * @param {string} tipo - Tipo de datos ('mensaje', 'evento', 'contacto')
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @returns {Promise<string>} - Ruta del archivo CSV consolidado
 */
const consolidarCsvs = async (directorio, tipo, fechas = null) => {
    console.log(`[consolidarCsvs] Iniciando consolidación para tipo: ${tipo}, directorio: ${directorio}`);
    console.log(`[consolidarCsvs] Fechas recibidas:`, fechas);
    
    const archivos = fs.readdirSync(directorio)
        .filter(archivo => archivo.endsWith('.csv') && !archivo.includes('consolidado'));
    
    if (archivos.length === 0) {
        console.log(`[consolidarCsvs] No hay archivos CSV de ${tipo} para consolidar`);
        return null;
    }
    
    console.log(`[consolidarCsvs] Archivos encontrados para ${tipo}:`, archivos);
    
    let datosCombinados = [];
    let encabezados = null;
    let incluidas = 0;
    let descartadas = 0;
    
    for (const archivo of archivos) {
        const rutaArchivo = path.join(directorio, archivo);
        const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
        const lineas = contenido.split('\n');
        
        if (!encabezados) {
            encabezados = lineas[0];
            datosCombinados.push(encabezados);
        }
        
        const columnas = encabezados.match(/(?:"[^"]*"|[^,])+/g).map(v => v.trim().replace(/^"|"$/g, ''));
        const fechaIndex = columnas.findIndex(col => col === 'fechaFiltro');
        const storageDateIndex = columnas.findIndex(col => col === 'storageDate');
        console.log(`[consolidarCsvs] Índice de fechaFiltro en columnas: ${fechaIndex}`);
        console.log(`[consolidarCsvs] Índice de storageDate en columnas: ${storageDateIndex}`);
        
        // Usar fechaFiltro si existe, sino usar storageDate como fallback
        const campoFechaIndex = fechaIndex !== -1 ? fechaIndex : storageDateIndex;
        const campoFechaNombre = fechaIndex !== -1 ? 'fechaFiltro' : 'storageDate';
        
        if (campoFechaIndex === -1) {
            console.log(`[consolidarCsvs] No se encontró campo de fecha para filtrar`);
        } else {
            console.log(`[consolidarCsvs] Usando campo '${campoFechaNombre}' en índice ${campoFechaIndex} para filtrado`);
        }
        
        for (let i = 1; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (!linea) continue;
            
            if (fechas && campoFechaIndex !== -1) {
                try {
                    const valores = linea.match(/(?:\"[^\"]*\"|[^,])+/g).map(v => v.trim().replace(/^\"|\"$/g, ''));
                    const fecha = valores[campoFechaIndex];
                    console.log(`[consolidarCsvs] Procesando línea ${i}, ${campoFechaNombre}: '${fecha}'`);
                    
                    if (fechaEnRango(fecha, fechas)) {
                        incluidas++;
                        datosCombinados.push(linea);
                        console.log(`[consolidarCsvs] Línea ${i} INCLUIDA`);
                    } else {
                        descartadas++;
                        console.log(`[consolidarCsvs] Línea ${i} DESCARTADA`);
                    }
                } catch (error) {
                    console.warn(`[consolidarCsvs] Error procesando línea ${i}:`, error.message);
                    descartadas++;
                }
            } else {
                datosCombinados.push(linea);
                incluidas++;
            }
        }
    }
    
    console.log(`[consolidarCsvs] Total líneas incluidas: ${incluidas}, descartadas: ${descartadas}`);
    
    if (datosCombinados.length <= 1) {
        console.log('[consolidarCsvs] No hay datos después del filtrado.');
        return null;
    }
    
    // Usar un nombre único para cada tipo de archivo consolidado
    const now = new Date();
    const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
    const fecha = now.toISOString().slice(0,10);
    const nombreArchivo = `${tipo}_consolidado_${hora}_${fecha}.csv`;
    const rutaConsolidada = path.join(directorio, nombreArchivo);
    
    fs.writeFileSync(rutaConsolidada, datosCombinados.join('\n'));
    console.log(`[consolidarCsvs] Archivo consolidado generado: ${rutaConsolidada}`);
    
    return rutaConsolidada;
};

/**
 * Genera un archivo CSV individual para un ticket cerrado con estructura limpia
 * @param {Object} ticketInfo - Información del ticket cerrado
 * @param {string} directorio - Directorio base donde guardar el archivo
 * @param {Map} ticketsAbiertos - Mapa de tickets abiertos para buscar relaciones (opcional)
 * @returns {string} - Ruta del archivo generado
 */
const generarTicketIndividual = (ticketInfo, directorio, ticketsAbiertos = null) => {
    try {
        const ticket = ticketInfo.ticket;
        const content = ticket.content || {};
        const metadata = ticket.metadata || {};
        const seqId = content.sequentialId;
        const contacto = ticketInfo.contacto;
        const tipoTicket = ticketInfo.tipo || 'BOT';

        // Ordenar mensajes por fecha
        ticketInfo.mensajes.sort((a, b) => {
            const fa = new Date(a['metadata.#envelope.storageDate'] || a['storageDate'] || 0).getTime();
            const fb = new Date(b['metadata.#envelope.storageDate'] || b['storageDate'] || 0).getTime();
            return fa - fb;
        });
        
        // --- Extraer Primer Contacto del Agente ---
        const primerMensajeAgente = ticketInfo.mensajes.find(m => {
            const from = m.from || '';
            const messageEmitter = m.metadata?.['#messageEmitter'];
            // Un mensaje es del agente si NO es del cliente de WhatsApp, O si está marcado como 'Human'
            return (from.includes('@msging.net') && !from.includes('@wa.gw.msging.net')) || messageEmitter === 'Human';
        });

        let primerContacto = '';
        if (primerMensajeAgente) {
            // Buscar la fecha completa en múltiples campos posibles
            let fechaCompleta = '';
            
            // Priorizar metadata.#envelope.storageDate (formato ISO completo)
            if (primerMensajeAgente['metadata.#envelope.storageDate']) {
                fechaCompleta = primerMensajeAgente['metadata.#envelope.storageDate'];
            }
            // Luego metadata.#wa.timestamp
            else if (primerMensajeAgente['metadata.#wa.timestamp']) {
                fechaCompleta = primerMensajeAgente['metadata.#wa.timestamp'];
            }
            // Luego storageDate directo
            else if (primerMensajeAgente['storageDate']) {
                fechaCompleta = primerMensajeAgente['storageDate'];
            }
            // Luego timestamp directo
            else if (primerMensajeAgente['timestamp']) {
                fechaCompleta = primerMensajeAgente['timestamp'];
            }
            // Si no hay fecha, usar la fecha actual
            else {
                fechaCompleta = new Date().toISOString();
            }
            
            const contenido = primerMensajeAgente.content || '';
            
            // Asegurar que la fecha esté en formato ISO completo
            if (fechaCompleta && !fechaCompleta.includes('T')) {
                // Si es solo fecha (YYYY-MM-DD), convertir a ISO completo
                try {
                    const fechaObj = new Date(fechaCompleta);
                    if (!isNaN(fechaObj.getTime())) {
                        fechaCompleta = fechaObj.toISOString();
                    }
                } catch (e) {
                    // Si falla, usar la fecha actual
                    fechaCompleta = new Date().toISOString();
                }
            }
            
            // Formatear como "FECHA_COMPLETA - CONTENIDO"
            primerContacto = fechaCompleta ? `${fechaCompleta} - ${contenido}` : contenido;
            
            console.log(`[generarTicketIndividual] Primer contacto construido:`, {
                fechaCompleta,
                contenido,
                primerContacto
            });
        }
        
        // Crear conversación con formato [agente]: y [cliente]:
        const conversacion = ticketInfo.mensajes.map(m => {
            const from = m.from || '';
            const to = m.to || '';
            let emisor = 'desconocido';
            if ((from.includes('@msging.net') && !from.includes('@wa.gw.msging.net')) || m.metadata?.['#messageEmitter'] === 'Human') {
                emisor = 'agente';
            } else if (from.includes('@wa.gw.msging.net')) {
                emisor = 'cliente';
            }
            return `[${emisor}]: ${m.content || ''}`;
        }).join('\\n');

        // --- Preparar datos base del ticket ---
        const ticketData = {
            id: ticket.id || '',
            sequentialId: content.sequentialId || '',
            parentSequentialId: content.parentSequentialId || '',
            status: content.status || '',
            team: content.team || '',
            unreadMessages: content.unreadMessages || 0,
            storageDate: metadata['#envelope.storageDate'] || content.storageDate || '',
            timestamp: metadata['#wa.timestamp'] || metadata['#envelope.storageDate'] || content.storageDate || '',
            estadoTicket: 'cerrado',
            fechaCierre: ticketInfo.fechaCierre || '',
            tipoCierre: ticketInfo.tipoCierre || '',
            fechaFiltro: obtenerFechaFiltro(ticket),
            tipoDato: 'ticket_reporte',
            procesadoEn: new Date().toISOString(),
            conversacion: conversacion,
            contacto: contacto,
            agente: ticketInfo.correoAgente || '',
            duracion: ticketInfo.duracion || '',
            TIPO: tipoTicket
        };
        
        // --- AGREGAR CAMPOS DE TRANSFERENCIA ---
        // Determinar si es transferencia y tipo
        const isTransfer = ticketInfo.isTransfer || false;
        const parentSeqId = ticketInfo.parentSequentialId || content.parentSequentialId || '';
        const transferType = ticketInfo.transferType || '';
        const agentIdentity = ticketInfo.agentIdentity || content.agentIdentity || '';
        
        // Campos de transferencia
        ticketData.transferencia = isTransfer ? 'TRUE' : 'FALSE';
        ticketData.ticket_padre = isTransfer ? parentSeqId : '';
        ticketData.ticket_hijo = '';
        ticketData.tipo_transferencia = isTransfer ? transferType : '';
        ticketData.agente_transferido = '';
        ticketData.cola_transferida = '';
        ticketData.historial_transferencias = '';
        ticketData.cantidad_transferencias = 0;
        
        // Si es transferencia, procesar información específica
        if (isTransfer) {
            if (transferType === 'AGENTE' && agentIdentity) {
                try {
                    // Decodificar el agentIdentity (ej: "hola%40bewise.com.es@blip.ai")
                    const decodedAgent = decodeURIComponent(agentIdentity.split('@')[0].replace(/%40/g, '@')) + '@' + agentIdentity.split('@').slice(1).join('@');
                    ticketData.agente_transferido = decodedAgent;
                } catch {
                    ticketData.agente_transferido = agentIdentity;
                }
                ticketData.cola_transferida = 'DIRECT_TRANSFER';
            } else if (transferType === 'COLA') {
                ticketData.cola_transferida = content.team || '';
            }
            
            // Historial básico para transferencias individuales
            ticketData.historial_transferencias = `${parentSeqId} → ${content.sequentialId}`;
            ticketData.cantidad_transferencias = 1;
        } else {
            // Es un ticket padre, buscar si tiene hijos para completar la información
            if (ticketsAbiertos) {
                const ticketKeys = Array.from(ticketsAbiertos.keys()).filter(key => 
                    key.startsWith(`${contactoIdentity}_`) && key !== `${contactoIdentity}_${content.sequentialId}`
                );
                
                if (ticketKeys.length > 0) {
                    // Tiene transferencias, completar información
                    ticketData.transferencia = 'TRUE';
                    const primerHijo = ticketsAbiertos.get(ticketKeys[0]);
                    if (primerHijo) {
                        ticketData.ticket_hijo = primerHijo.sequentialId || '';
                        ticketData.tipo_transferencia = primerHijo.transferType || '';
                        ticketData.agente_transferido = primerHijo.agentIdentity || '';
                        ticketData.cola_transferida = primerHijo.team === 'DIRECT_TRANSFER' ? 'DIRECT_TRANSFER' : primerHijo.team || '';
                        ticketData.historial_transferencias = `${content.sequentialId} → ${primerHijo.sequentialId}`;
                        ticketData.cantidad_transferencias = 1;
                    }
                }
            }
        }
        
        let campos;

        // --- Añadir campos específicos y definir columnas ---
        if (tipoTicket === 'PLANTILLA') {
            const details = ticketInfo.campaignDetails || {};
            
            // Usar el nombre real de la plantilla
            ticketData.plantilla = details.templateName || '';
            
            // *** NUEVAS COLUMNAS ***
            ticketData.plantilla_contenido = details.templateContent || '';
            ticketData.plantilla_variables = (details.templateParameters || [])
                .map(p => p.text || p) // Manejar objetos {text: val} o strings
                .join('|');

            // Determinar si hubo respuesta: si hay mensajes del cliente O si el tracking lo indica
            const huboRespuesta = ticketInfo.mensajes.some(m => 
                m.from && m.from.endsWith('@wa.gw.msging.net')
            ) || details.replied;
            ticketData.respuesta_usuario = huboRespuesta ? 'TRUE' : 'FALSE';
            
            // Usar el contenido de respuesta del cliente si existe
            ticketData.contenido_usuario = details.replyContent || '';
            
            // Usar el emisor real de la campaña
            ticketData.emisor = details.originator || '';
            ticketData.envio_plantilla = details.sentTime || '';
            ticketData.primer_contacto = primerContacto;
            ticketData.tipo_contenido = details.replyType || '';

            campos = [
                'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages', 'storageDate', 
                'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre', 'fechaFiltro', 
                'tipoDato', 'procesadoEn', 'conversacion', 'contacto', 'agente', 'duracion',
                'plantilla', 'plantilla_contenido', 'plantilla_variables', 'respuesta_usuario', 'contenido_usuario', 'emisor', 'envio_plantilla', 'primer_contacto', 'tipo_contenido', 'TIPO',
                'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'historial_transferencias', 'cantidad_transferencias'
            ];
        } else { // BOT
            // Asegurar que los tickets BOT tengan todos los campos requeridos
            campos = [
                'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages', 'storageDate', 
                'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre', 'fechaFiltro', 
                'tipoDato', 'procesadoEn', 'conversacion', 'contacto', 'agente', 'duracion', 'TIPO',
                'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'historial_transferencias', 'cantidad_transferencias'
            ];
        }

        const fechaFormateada = new Date(ticketInfo.fechaCierre || Date.now()).toISOString().slice(0, 10);
        const nombreArchivo = `ticket_${seqId}_${fechaFormateada}.csv`;
        
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
        }

        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse([ticketData]);

        const rutaArchivo = path.join(carpetaReportes, nombreArchivo);
        fs.writeFileSync(rutaArchivo, csv);
        
        console.log(`[generarTicketIndividual] Archivo de reporte generado: ${nombreArchivo} (Tipo: ${tipoTicket})`);
        console.log(`[generarTicketIndividual] Campos generados:`, campos);
        console.log(`[generarTicketIndividual] Datos del ticket:`, {
            id: ticketData.id,
            sequentialId: ticketData.sequentialId,
            tipo: ticketData.TIPO,
            plantilla: ticketData.plantilla || 'N/A',
            respuesta_usuario: ticketData.respuesta_usuario || 'N/A',
            emisor: ticketData.emisor || 'N/A'
        });
        
        // Logs adicionales para debugging de plantillas
        if (tipoTicket === 'PLANTILLA') {
            const details = ticketInfo.campaignDetails || {};
            console.log(`[generarTicketIndividual] Detalles de campaña:`, {
                templateName: details.templateName,
                originator: details.originator,
                templateContent: details.templateContent,
                templateContentWithParams: details.templateContentWithParams,
                replyContent: details.replyContent,
                replied: details.replied,
                mensajesCount: ticketInfo.mensajes.length,
                tieneRespuestaCliente: ticketInfo.mensajes.some(m => m.from && m.from.endsWith('@wa.gw.msging.net'))
            });
        }
        
        return rutaArchivo;
    } catch (error) {
        console.error('[generarTicketIndividual] Error:', error);
        throw error;
    }
};

/**
 * Procesa y agrega información de transferencias a los tickets de un contacto (v4: maneja tickets individuales y crea historial completo)
 * @param {Array} tickets - Array de tickets de un contacto
 * @returns {Array} - Array de tickets con columnas de transferencia
 */
function procesarTransferenciasTicketsV4(tickets) {
    // Ordenar por storageDate o sequentialId para asegurar el orden cronológico
    tickets.sort((a, b) => {
        const sa = a.storageDate || a['storageDate'] || '';
        const sb = b.storageDate || b['storageDate'] || '';
        if (sa && sb) return new Date(sa) - new Date(sb);
        // Fallback por sequentialId si no hay storageDate
        return (parseInt(a.sequentialId) || 0) - (parseInt(b.sequentialId) || 0);
    });
    
    // Crear un mapa de sequentialId a ticket para lookup rápido
    const mapaSeq = {};
    tickets.forEach(t => {
        if (t.sequentialId) mapaSeq[t.sequentialId] = t;
    });
    
    // Crear mapa de parentSequentialId a hijos
    const mapaHijos = {};
    tickets.forEach(t => {
        const parentSeq = t.parentSequentialId || t['parentSequentialId'] || '';
        if (parentSeq) {
            if (!mapaHijos[parentSeq]) mapaHijos[parentSeq] = [];
            mapaHijos[parentSeq].push(t);
        }
    });
    
    let resultado = [];
    
    for (let i = 0; i < tickets.length; i++) {
        const t = tickets[i];
        const parentSeq = t.parentSequentialId || t['parentSequentialId'] || '';
        const sequentialId = t.sequentialId || '';
        
        // Determinar si es transferencia
        const esTransferencia = parentSeq && mapaSeq[parentSeq];
        
        // Obtener hijos de este ticket
        const hijos = mapaHijos[sequentialId] || [];
        
        // Crear historial completo
        let historial = [];
        let cantidad_transferencias = 0;
        
        if (esTransferencia) {
            // Es un ticket hijo, construir historial desde el padre
            let ticketActual = t;
            while (ticketActual.parentSequentialId && mapaSeq[ticketActual.parentSequentialId]) {
                historial.unshift(ticketActual.sequentialId);
                ticketActual = mapaSeq[ticketActual.parentSequentialId];
                cantidad_transferencias++;
            }
            // Agregar el ticket raíz al inicio
            historial.unshift(ticketActual.sequentialId);
        } else {
            // Es un ticket raíz, construir historial hacia adelante
            historial = [sequentialId];
            let ticketActual = t;
            while (mapaHijos[ticketActual.sequentialId] && mapaHijos[ticketActual.sequentialId].length > 0) {
                const hijo = mapaHijos[ticketActual.sequentialId][0]; // Tomar el primer hijo
                historial.push(hijo.sequentialId);
                ticketActual = hijo;
                cantidad_transferencias++;
            }
        }
        
        // Determinar información de transferencia
        let transferencia = 'FALSE';
        let ticket_padre = '';
        let ticket_hijo = '';
        let tipo_transferencia = '';
        let agente_transferido = '';
        let cola_transferida = '';
        
        if (esTransferencia) {
            transferencia = 'TRUE';
            ticket_padre = parentSeq;
            ticket_hijo = sequentialId;
            
            // Detectar tipo de transferencia
            const team = t.team || t['team'] || '';
            const agentIdentity = t.agentIdentity || t['agentIdentity'] || '';
            
            if (team === 'DIRECT_TRANSFER' && agentIdentity) {
                tipo_transferencia = 'AGENTE';
                try {
                    agente_transferido = decodeURIComponent(agentIdentity.split('@')[0].replace(/%40/g, '@')) + '@' + agentIdentity.split('@').slice(1).join('@');
                } catch {
                    agente_transferido = agentIdentity;
                }
                cola_transferida = 'DIRECT_TRANSFER';
            } else if (team && team !== 'DIRECT_TRANSFER') {
                tipo_transferencia = 'COLA';
                cola_transferida = team;
            }
        } else if (hijos.length > 0) {
            // Es un ticket padre que tiene transferencias
            transferencia = 'TRUE';
            ticket_hijo = hijos[0].sequentialId;
            
            // Detectar tipo de transferencia del primer hijo
            const primerHijo = hijos[0];
            const team = primerHijo.team || primerHijo['team'] || '';
            const agentIdentity = primerHijo.agentIdentity || primerHijo['agentIdentity'] || '';
            
            if (team === 'DIRECT_TRANSFER' && agentIdentity) {
                tipo_transferencia = 'AGENTE';
                try {
                    agente_transferido = decodeURIComponent(agentIdentity.split('@')[0].replace(/%40/g, '@')) + '@' + agentIdentity.split('@').slice(1).join('@');
                } catch {
                    agente_transferido = agentIdentity;
                }
                cola_transferida = 'DIRECT_TRANSFER';
            } else if (team && team !== 'DIRECT_TRANSFER') {
                tipo_transferencia = 'COLA';
                cola_transferida = team;
            }
        }
        
        const historial_transferencias = historial.join(' → ');
        
        // Agregar columnas de transferencia
        t.transferencia = transferencia;
        t.ticket_padre = ticket_padre;
        t.ticket_hijo = ticket_hijo;
        t.tipo_transferencia = tipo_transferencia;
        t.agente_transferido = agente_transferido;
        t.cola_transferida = cola_transferida;
        t.historial_transferencias = historial_transferencias;
        t.cantidad_transferencias = cantidad_transferencias;
        
        resultado.push(t);
        
        console.log(`[TRANSFERENCIA V4] Ticket: ${sequentialId}, Transferencia: ${transferencia}, Historial: ${historial_transferencias}, Cantidad: ${cantidad_transferencias}`);
    }
    
    return resultado;
}

/**
 * Consolida todos los archivos CSV individuales de tickets en uno solo, agregando info de transferencias
 * @param {string} directorio - Ruta del directorio que contiene los archivos CSV de tickets
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @returns {Promise<string>} - Ruta del archivo CSV consolidado
 */
const consolidarTicketsCsvs = async (directorio, fechas = null) => {
    try {
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            return null;
        }
        const archivos = fs.readdirSync(carpetaReportes)
            .filter(archivo => archivo.startsWith('ticket_') && archivo.endsWith('.csv'));
        if (archivos.length === 0) {
            return null;
        }
        console.log(`[consolidarTicketsCsvs] Archivos encontrados: ${archivos.length}`);
        
        // Leer y parsear todos los tickets
        let tickets = [];
        for (const archivo of archivos) {
            const rutaArchivo = path.join(carpetaReportes, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const registros = parse(contenido, { columns: true, skip_empty_lines: true });
            tickets.push(...registros);
        }
        
        console.log(`[consolidarTicketsCsvs] Total tickets leídos: ${tickets.length}`);
        
        // Filtrar por fechas si aplica
        if (fechas) {
            const ticketsAntes = tickets.length;
            tickets = tickets.filter(t => fechaEnRango(t.fechaCierre, fechas));
            console.log(`[consolidarTicketsCsvs] Tickets después del filtro de fechas: ${tickets.length} (antes: ${ticketsAntes})`);
        }
        
        // Agrupar por contacto para procesar transferencias
        const grupos = {};
        for (const t of tickets) {
            const contacto = t.contacto || t.customerIdentity || t["customerIdentity"] || '';
            if (!grupos[contacto]) grupos[contacto] = [];
            grupos[contacto].push(t);
        }
        
        console.log(`[consolidarTicketsCsvs] Grupos de contacto encontrados: ${Object.keys(grupos).length}`);
        
        // Procesar transferencias por grupo con la nueva lógica
        let ticketsProcesados = [];
        for (const [contacto, arr] of Object.entries(grupos)) {
            console.log(`[consolidarTicketsCsvs] Procesando grupo de contacto ${contacto} con ${arr.length} tickets`);
            const procesados = procesarTransferenciasTicketsV4(arr);
            ticketsProcesados.push(...procesados);
        }
        
        console.log(`[consolidarTicketsCsvs] Total tickets procesados: ${ticketsProcesados.length}`);
        
        // Orden de columnas solicitado
        const camposPrincipales = [
            'id', 'sequentialId', 'status', 'team', 'unreadMessages',
            'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
            'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'contacto', 'agente', 'duracion', 'TIPO'
        ];
        const camposTransferencia = [
            'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia',
            'agente_transferido', 'cola_transferida', 'historial_transferencias', 'cantidad_transferencias'
        ];
        
        // Detectar campos extra (por si hay columnas adicionales de plantillas)
        const camposExtra = [];
        ticketsProcesados.forEach(t => {
            Object.keys(t).forEach(k => {
                if (!camposPrincipales.includes(k) && !camposTransferencia.includes(k) && !camposExtra.includes(k)) {
                    camposExtra.push(k);
                }
            });
        });
        
        const camposFinal = [...camposPrincipales, ...camposTransferencia, ...camposExtra];
        console.log(`[consolidarTicketsCsvs] Campos finales: ${camposFinal.length} campos`);
        
        // Generar CSV
        const parser = new Parser({ fields: camposFinal, header: true });
        const csv = parser.parse(ticketsProcesados);
        
        // Guardar archivo con nombre tickets_bot.csv
        const nombreArchivo = 'tickets_bot.csv';
        const rutaConsolidada = path.join(carpetaReportes, nombreArchivo);
        fs.writeFileSync(rutaConsolidada, csv);
        
        console.log(`[consolidarTicketsCsvs] Archivo consolidado generado: ${rutaConsolidada}`);
        console.log(`[consolidarTicketsCsvs] Resumen de transferencias:`);
        
        // Log de resumen de transferencias
        const transferencias = ticketsProcesados.filter(t => t.transferencia === 'TRUE');
        const ticketsRaiz = ticketsProcesados.filter(t => t.transferencia === 'FALSE');
        
        console.log(`  - Tickets raíz: ${ticketsRaiz.length}`);
        console.log(`  - Transferencias: ${transferencias.length}`);
        console.log(`  - Total: ${ticketsProcesados.length}`);
        
        return rutaConsolidada;
    } catch (error) {
        console.error('[consolidarTicketsCsvs] Error:', error);
        throw error;
    }
};

/**
 * Consolida los datos de campañas (plantillas enviadas, respuestas y tickets generados)
 * @param {string} directorio - Directorio base (usualmente 'data/tickets')
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @param {string} nombrePlantilla - Nombre de la plantilla para filtrar (opcional)
 * @returns {Promise<{filePath: string, data: Array}>} - Objeto con la ruta del archivo CSV y los datos consolidados
 */
const consolidarCampanas = async (directorio, fechas = null, nombrePlantilla = null) => {
    console.log(`[consolidarCampanas] Iniciando consolidación de campanas, directorio: ${directorio}`);
    console.log(`[consolidarCampanas] Fechas recibidas:`, fechas);
    console.log(`[consolidarCampanas] Nombre de plantilla filtro:`, nombrePlantilla);
    
    // 1. OBTENER TODAS LAS PLANTILLAS ENVIADAS
    const carpetaPlantillas = path.join(path.dirname(directorio), 'plantillas');
    if (!fs.existsSync(carpetaPlantillas)) {
        console.log('[consolidarCampanas] No existe carpeta de plantillas');
        return { filePath: null, data: [] };
    }

    const archivosPlantillas = fs.readdirSync(carpetaPlantillas)
        .filter(archivo => archivo.startsWith('plantilla_') && archivo.endsWith('.csv'));

    console.log('[consolidarCampanas] Archivos de plantillas encontrados:', archivosPlantillas);

    if (archivosPlantillas.length === 0) {
        console.log('[consolidarCampanas] No hay archivos de plantillas para procesar');
        return { filePath: null, data: [] };
    }

    // 2. OBTENER TODOS LOS MENSAJES (RESPUESTAS DE USUARIOS)
    const carpetaMensajes = path.join(path.dirname(directorio), 'mensajes');
    const mensajesPorContacto = new Map();
    
    if (fs.existsSync(carpetaMensajes)) {
        const archivosMensajes = fs.readdirSync(carpetaMensajes)
            .filter(archivo => archivo.startsWith('mensaje_') && archivo.endsWith('.csv'));
        
        console.log('[consolidarCampanas] Archivos de mensajes encontrados:', archivosMensajes);
        
        for (const archivo of archivosMensajes) {
            const rutaArchivo = path.join(carpetaMensajes, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const registros = parse(contenido, { columns: true, skip_empty_lines: true });
            
            for (const registro of registros) {
                const from = registro.from;
                if (from && from.endsWith('@wa.gw.msging.net')) {
                    if (!mensajesPorContacto.has(from)) {
                        mensajesPorContacto.set(from, []);
                    }
                    mensajesPorContacto.get(from).push(registro);
                }
            }
        }
    }

    // 3. OBTENER TODOS LOS TICKETS CERRADOS
    const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
    const ticketsPorContacto = new Map();
    
    if (fs.existsSync(carpetaReportes)) {
        const archivosTickets = fs.readdirSync(carpetaReportes)
            .filter(archivo => archivo.startsWith('ticket_') && archivo.endsWith('.csv'));
        
        console.log('[consolidarCampanas] Archivos de tickets encontrados:', archivosTickets);
        
        for (const archivo of archivosTickets) {
            const rutaArchivo = path.join(carpetaReportes, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const registros = parse(contenido, { columns: true, skip_empty_lines: true });
            
            for (const registro of registros) {
                const contacto = registro.contacto;
                if (contacto) {
                    const contactIdentity = `${contacto}@wa.gw.msging.net`;
                    if (!ticketsPorContacto.has(contactIdentity)) {
                        ticketsPorContacto.set(contactIdentity, []);
                    }
                    ticketsPorContacto.get(contactIdentity).push(registro);
                }
            }
        }
    }

    // 4. PROCESAR CADA PLANTILLA ENVIADA
    let campanasIncluidas = [];
    let incluidas = 0;
    let descartadas = 0;

    for (const archivo of archivosPlantillas) {
        const rutaArchivo = path.join(carpetaPlantillas, archivo);
        const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
        const registros = parse(contenido, { columns: true, skip_empty_lines: true });
        
        console.log(`[consolidarCampanas] Procesando archivo de plantillas: ${archivo}`);
        
        for (const plantilla of registros) {
            // Filtrar por nombre de plantilla si se especifica
            if (nombrePlantilla && plantilla.nombrePlantilla !== nombrePlantilla) {
                descartadas++;
                console.log(`[consolidarCampanas] Plantilla descartada - nombre no coincide: ${plantilla.nombrePlantilla} vs ${nombrePlantilla}`);
                continue;
            }

            // Filtrar por fechas si se especifican
            if (fechas && plantilla.fechaFiltro) {
                if (!fechaEnRango(plantilla.fechaFiltro, fechas)) {
                    descartadas++;
                    console.log(`[consolidarCampanas] Plantilla descartada - fecha fuera de rango: ${plantilla.fechaFiltro}`);
                    continue;
                }
            }

            // Buscar el contacto al que se envió la plantilla
            // En las plantillas, el campo 'to' contiene el contacto
            const contactIdentity = plantilla.to;
            if (!contactIdentity || !contactIdentity.endsWith('@wa.gw.msging.net')) {
                console.log(`[consolidarCampanas] Plantilla sin contacto válido: ${contactIdentity}`);
                continue;
            }

            // Buscar respuestas del usuario
            const mensajesUsuario = mensajesPorContacto.get(contactIdentity) || [];
            const respuestaUsuario = mensajesUsuario.find(m => {
                const mensajeTime = new Date(m.storageDate || m.timestamp || '');
                const plantillaTime = new Date(plantilla.storageDate || plantilla.timestamp || '');
                return mensajeTime > plantillaTime;
            });

            // Buscar ticket correspondiente
            const ticketsContacto = ticketsPorContacto.get(contactIdentity) || [];
            const ticketCorrespondiente = ticketsContacto.find(t => {
                const ticketTime = new Date(t.fechaCierre || t.storageDate || '');
                const plantillaTime = new Date(plantilla.storageDate || plantilla.timestamp || '');
                return ticketTime > plantillaTime;
            });

            // Crear registro de campaña
            const registroCampana = {
                // Información de la plantilla
                plantilla_id: plantilla.id || '',
                plantilla_nombre: plantilla.nombrePlantilla || '',
                plantilla_contenido: plantilla.contenidoPlantilla || '',
                plantilla_parametros: plantilla.parametros || '',
                plantilla_campaignId: plantilla.campaignId || '',
                plantilla_campaignName: plantilla.campaignName || '',
                plantilla_fecha_envio: plantilla.storageDate || plantilla.timestamp || '',
                
                // Información del contacto
                contacto_identity: contactIdentity,
                contacto_numero: contactIdentity.replace('@wa.gw.msging.net', ''),
                
                // Respuesta del usuario (si existe)
                usuario_respuesta: respuestaUsuario ? 'SI' : 'NO',
                usuario_tipo_respuesta: respuestaUsuario ? respuestaUsuario.type || '' : '',
                usuario_contenido: respuestaUsuario ? respuestaUsuario.content || '' : '',
                usuario_fecha_respuesta: respuestaUsuario ? (respuestaUsuario.storageDate || respuestaUsuario.timestamp || '') : '',
                
                // Ticket generado (si existe)
                ticket_generado: ticketCorrespondiente ? 'SI' : 'NO',
                ticket_id: ticketCorrespondiente ? ticketCorrespondiente.id || '' : '',
                ticket_sequentialId: ticketCorrespondiente ? ticketCorrespondiente.sequentialId || '' : '',
                ticket_estado: ticketCorrespondiente ? ticketCorrespondiente.estadoTicket || '' : '',
                ticket_fecha_cierre: ticketCorrespondiente ? ticketCorrespondiente.fechaCierre || '' : '',
                ticket_tipo_cierre: ticketCorrespondiente ? ticketCorrespondiente.tipoCierre || '' : '',
                ticket_agente: ticketCorrespondiente ? ticketCorrespondiente.agente || '' : '',
                ticket_duracion: ticketCorrespondiente ? ticketCorrespondiente.duracion || '' : '',
                
                // Campos de sistema
                fechaFiltro: plantilla.fechaFiltro || '',
                tipoDato: 'campaña',
                procesadoEn: new Date().toISOString()
            };

            campanasIncluidas.push(registroCampana);
            incluidas++;
            console.log(`[consolidarCampanas] Campaña incluida: ${plantilla.nombrePlantilla} -> ${contactIdentity} (respuesta: ${registroCampana.usuario_respuesta}, ticket: ${registroCampana.ticket_generado})`);
        }
    }

    console.log(`[consolidarCampanas] Total campañas incluidas: ${incluidas}, descartadas: ${descartadas}`);
    
    if (incluidas === 0) {
        console.log('[consolidarCampanas] No hay datos después del filtrado.');
        return { filePath: null, data: [] };
    }

    // Crear el CSV
    const campos = Object.keys(campanasIncluidas[0]);
    const parser = new Parser({ fields: campos, header: true });
    const csv = parser.parse(campanasIncluidas);

    const dirReportes = path.join(directorio, '..', 'reportes');
    if (!fs.existsSync(dirReportes)) {
        fs.mkdirSync(dirReportes, { recursive: true });
    }
    
    const now = new Date();
    const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
    const fecha = now.toISOString().slice(0,10);
    const nombreArchivoBase = nombrePlantilla ? `campana_${nombrePlantilla}` : 'campanas_consolidado';
    const nombreArchivo = `${nombreArchivoBase}_${hora}_${fecha}.csv`;
    const rutaConsolidada = path.join(dirReportes, nombreArchivo);

    fs.writeFileSync(rutaConsolidada, csv);
    console.log(`[consolidarCampanas] Archivo consolidado generado: ${rutaConsolidada}`);

    return { filePath: rutaConsolidada, data: campanasIncluidas };
};

/**
 * Obtiene la lista de campanas disponibles para filtrado
 * @param {string} directorioPlantillas - Ruta del directorio que contiene los archivos CSV de plantillas
 * @returns {Array} - Lista de nombres de campanas únicos
 */
const obtenerCampanasDisponibles = (directorioPlantillas) => {
    try {
        console.log(`[obtenerCampanasDisponibles] Buscando plantillas en directorio: ${directorioPlantillas}`);
        
        if (!fs.existsSync(directorioPlantillas)) {
            console.log('[obtenerCampanasDisponibles] No existe carpeta de plantillas, creando...');
            fs.mkdirSync(directorioPlantillas, { recursive: true });
            return [];
        }

        const archivos = fs.readdirSync(directorioPlantillas)
            .filter(archivo => archivo.startsWith('plantilla_') && archivo.endsWith('.csv'));

        console.log('[obtenerCampanasDisponibles] Archivos de plantillas encontrados:', archivos);

        if (archivos.length === 0) {
            console.log('[obtenerCampanasDisponibles] No hay archivos de plantillas');
            return [];
        }

        const campanas = new Set();

        for (const archivo of archivos) {
            const rutaArchivo = path.join(directorioPlantillas, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const registros = parse(contenido, {
                columns: true,
                skip_empty_lines: true
            });
            
            for (const registro of registros) {
                if (registro.nombrePlantilla) {
                    campanas.add(registro.nombrePlantilla);
                }
            }
        }

        const listaCampanas = Array.from(campanas).sort();
        console.log(`[obtenerCampanasDisponibles] Total campanas encontradas: ${listaCampanas.length}`);
        console.log(`[obtenerCampanasDisponibles] Lista de campanas:`, listaCampanas);
        
        return listaCampanas;
    } catch (error) {
        console.error('[obtenerCampanasDisponibles] Error:', error);
        return [];
    }
};

// Función para aplanar objetos anidados
function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

/**
 * Procesa mensajes y los convierte a CSV con estructura limpia
 * @param {Object|Array} jsonData - Datos JSON del webhook
 * @param {string} outputPath - Ruta donde guardar el CSV
 * @returns {Promise<string>} - Ruta del archivo generado
 */
const procesarMensajes = async (jsonData, outputPath) => {
    try {
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        const mensajesProcesados = dataArray.map(mensaje => {
            // Acceder correctamente a los campos anidados
            const metadata = mensaje.metadata || {};
            
            // Extraer solo campos relevantes de mensajes
            const mensajeLimpio = {
                // Campos básicos del mensaje
                id: mensaje.id || '',
                from: mensaje.from || '',
                to: mensaje.to || '',
                type: mensaje.type || '',
                content: mensaje.content || '',
                
                // Campos de metadatos - acceder correctamente a los campos anidados
                storageDate: metadata['#envelope.storageDate'] || mensaje.storageDate || '',
                timestamp: metadata['#wa.timestamp'] || metadata['#date_processed'] || mensaje.timestamp || '',
                
                // Campos de sistema
                fechaFiltro: obtenerFechaFiltro(mensaje),
                tipoDato: 'mensaje',
                procesadoEn: new Date().toISOString()
            };
            
            return mensajeLimpio;
        });

        // Generar CSV con campos específicos
        const campos = [
            'id', 'from', 'to', 'type', 'content', 
            'storageDate', 'timestamp', 'fechaFiltro', 'tipoDato', 'procesadoEn'
        ];
        
        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse(mensajesProcesados);
        
        // Asegurar directorio
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, csv);
        return outputPath;
    } catch (error) {
        throw new Error(`Error al procesar mensajes: ${error.message}`);
    }
};

/**
 * Procesa contactos y los convierte a CSV con estructura limpia
 * @param {Object|Array} jsonData - Datos JSON del webhook
 * @param {string} outputPath - Ruta donde guardar el CSV
 * @returns {Promise<string>} - Ruta del archivo generado
 */
const procesarContactos = async (jsonData, outputPath) => {
    try {
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        const contactosProcesados = dataArray.map(contacto => {
            const contactoLimpio = {
                // Campos básicos del contacto
                identity: contacto.identity || '',
                name: contacto.name || '',
                phoneNumber: contacto.phoneNumber || '',
                email: contacto.email || '',
                
                // Campos de estado
                lastMessageDate: contacto.lastMessageDate || '',
                status: contacto.status || '',
                
                // Campos de sistema
                fechaFiltro: obtenerFechaFiltro(contacto),
                tipoDato: 'contacto',
                procesadoEn: new Date().toISOString()
            };
            
            return contactoLimpio;
        });

        const campos = [
            'identity', 'name', 'phoneNumber', 'email', 
            'lastMessageDate', 'status', 'fechaFiltro', 'tipoDato', 'procesadoEn'
        ];
        
        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse(contactosProcesados);
        
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, csv);
        return outputPath;
    } catch (error) {
        throw new Error(`Error al procesar contactos: ${error.message}`);
    }
};

/**
 * Procesa eventos y los convierte a CSV con estructura limpia
 * @param {Object|Array} jsonData - Datos JSON del webhook
 * @param {string} outputPath - Ruta donde guardar el CSV
 * @returns {Promise<string>} - Ruta del archivo generado
 */
const procesarEventos = async (jsonData, outputPath) => {
    try {
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        const eventosProcesados = dataArray.map(evento => {
            // Extraer campos anidados correctamente
            const extras = evento.extras || {};
            const contact = evento.contact || {};
            
            const eventoLimpio = {
                // Campos básicos del evento
                id: evento.id || '',
                ownerIdentity: evento.ownerIdentity || '',
                identity: evento.identity || '',
                messageId: evento.messageId || '',
                category: evento.category || '',
                action: evento.action || '',
                
                // Campos de contacto
                contactIdentity: contact.Identity || '',
                
                // Campos de metadatos
                storageDate: evento.storageDate || '',
                timestamp: evento.timestamp || '',
                
                // Campos específicos de eventos (desde extras)
                previousStateName: extras['#previousStateName'] || '',
                previousStateId: extras['#previousStateId'] || '',
                currentStateName: extras['#stateName'] || '',
                currentStateId: extras['#stateId'] || '',
                stateName: extras['#stateName'] || '',
                stateId: extras['#stateId'] || '',
                
                // Campos adicionales de extras
                extrasMessageId: extras['#messageId'] || '',
                extrasStateName: extras['#stateName'] || '',
                extrasStateId: extras['#stateId'] || '',
                
                // Campos de sistema
                fechaFiltro: obtenerFechaFiltro(evento),
                tipoDato: 'evento',
                procesadoEn: new Date().toISOString()
            };
            
            return eventoLimpio;
        });

        const campos = [
            'id', 'ownerIdentity', 'identity', 'messageId', 'category', 'action',
            'contactIdentity', 'storageDate', 'timestamp', 
            'previousStateName', 'previousStateId', 'currentStateName', 'currentStateId',
            'stateName', 'stateId', 'extrasMessageId', 'extrasStateName', 'extrasStateId',
            'fechaFiltro', 'tipoDato', 'procesadoEn'
        ];
        
        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse(eventosProcesados);
        
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, csv);
        return outputPath;
    } catch (error) {
        throw new Error(`Error al procesar eventos: ${error.message}`);
    }
};

/**
 * Procesa tickets y los convierte a CSV con estructura limpia
 * @param {Object|Array} jsonData - Datos JSON del webhook
 * @param {string} outputPath - Ruta donde guardar el CSV
 * @param {Map} plantillasRegistradas - Mapa de plantillas registradas para determinar origen
 * @param {Map} contactCampaignInfo - Mapa con información de campañas por contacto
 * @returns {Promise<string>} - Ruta del archivo generado
 */
const procesarTickets = async (jsonData, outputPath, plantillasRegistradas = new Map(), contactCampaignInfo = new Map()) => {
    try {
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        const ticketsProcesados = dataArray.map(ticket => {
            const content = ticket.content || {};
            const metadata = ticket.metadata || {};
            
            // Determinar origen del ticket usando el nuevo mapa contactCampaignInfo
            const contactIdentity = ticket.from; // El 'from' en el ticket es el customer
            const campaignInfo = contactCampaignInfo.get(contactIdentity);

            let origen = 'bot';
            let nombrePlantilla = '';
            let agenteEnvio = '';
            
            if (campaignInfo) {
                origen = 'plantilla';
                nombrePlantilla = campaignInfo.templateName;
                agenteEnvio = campaignInfo.originator;
            }
            
            const ticketLimpio = {
                // Campos básicos del ticket
                id: ticket.id || '',
                sequentialId: content.sequentialId || '',
                parentSequentialId: content.parentSequentialId || '',
                status: content.status || '',
                team: content.team || '',
                unreadMessages: content.unreadMessages || '',
                
                // Campos de metadatos
                storageDate: metadata['#envelope.storageDate'] || content.storageDate || ticket.storageDate || '',
                timestamp: metadata['#wa.timestamp'] || ticket.timestamp || '',
                
                // Campos de estado (se actualizarán cuando se cierre)
                estadoTicket: ticket.estadoTicket || 'abierto',
                fechaCierre: ticket.fechaCierre || '',
                tipoCierre: ticket.tipoCierre || '',
                
                // Campos de origen (BOT vs Plantilla)
                origen: origen,
                nombrePlantilla: nombrePlantilla,
                agenteEnvio: agenteEnvio,
                
                // Campos de sistema
                fechaFiltro: obtenerFechaFiltro(ticket),
                tipoDato: 'ticket',
                procesadoEn: new Date().toISOString()
            };
            
            return ticketLimpio;
        });

        const campos = [
            'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
            'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
            'origen', 'nombrePlantilla', 'agenteEnvio',
            'fechaFiltro', 'tipoDato', 'procesadoEn'
        ];
        
        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse(ticketsProcesados);
        
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, csv);
        return outputPath;
    } catch (error) {
        throw new Error(`Error al procesar tickets: ${error.message}`);
    }
};

/**
 * Procesa plantillas y las convierte a CSV con estructura limpia
 * @param {Object|Array} jsonData - Datos JSON del webhook
 * @param {string} outputPath - Ruta donde guardar el CSV
 * @returns {Promise<string>} - Ruta del archivo generado
 */
const procesarPlantillas = async (jsonData, outputPath) => {
    try {
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        const plantillasProcesadas = dataArray.map(plantilla => {
            const content = plantilla.content || {};
            const template = content.template || {};
            const templateContent = content.templateContent || {};
            const metadata = plantilla.metadata || {};
            
            // Extraer parámetros
            const parametros = [];
            if (template.components) {
                const bodyComponent = template.components.find(comp => comp.type === 'body');
                if (bodyComponent && bodyComponent.parameters) {
                    parametros.push(...bodyComponent.parameters.map(param => param.text || ''));
                }
            }
            
            // Extraer contenido de la plantilla
            let contenidoPlantilla = '';
            if (templateContent.components) {
                const bodyComponent = templateContent.components.find(comp => comp.type === 'BODY');
                if (bodyComponent && bodyComponent.text) {
                    contenidoPlantilla = bodyComponent.text;
                }
            }
            
            const plantillaLimpia = {
                // Campos básicos de la plantilla
                id: plantilla.id || '',
                nombrePlantilla: template.name || templateContent.name || '',
                tipo: content.type || '',
                language: template.language?.code || templateContent.language || '',
                
                // Campo del destinatario (importante para tracking)
                to: plantilla.to || '',
                
                // Campos de contenido
                contenidoPlantilla: contenidoPlantilla,
                parametros: parametros.join('|'),
                numeroParametros: parametros.length,
                
                // Campos de metadatos
                storageDate: metadata['#envelope.storageDate'] || plantilla.storageDate || '',
                timestamp: metadata['#date_processed'] || metadata['date_created'] || plantilla.timestamp || '',
                
                // Campos de ActiveCampaign
                campaignId: metadata['#activecampaign.flowId'] || '',
                campaignName: metadata['#activecampaign.name'] || '',
                stateId: metadata['#activecampaign.stateId'] || '',
                masterState: metadata['#activecampaign.masterState'] || '',
                
                // Campos de sistema
                fechaFiltro: obtenerFechaFiltro(plantilla),
                tipoDato: 'plantilla',
                procesadoEn: new Date().toISOString()
            };
            
            return plantillaLimpia;
        });

        const campos = [
            'id', 'nombrePlantilla', 'tipo', 'language', 'to', 'contenidoPlantilla', 
            'parametros', 'numeroParametros', 'storageDate', 'timestamp',
            'campaignId', 'campaignName', 'stateId', 'masterState',
            'fechaFiltro', 'tipoDato', 'procesadoEn'
        ];
        
        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse(plantillasProcesadas);
        
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, csv);
        return outputPath;
    } catch (error) {
        throw new Error(`Error al procesar plantillas: ${error.message}`);
    }
};

/**
 * Obtiene la fecha de filtro de un objeto
 * @param {Object} obj - Objeto del webhook
 * @returns {string} - Fecha en formato YYYY-MM-DD
 */
const obtenerFechaFiltro = (obj) => {
    // Para eventos, priorizar storageDate
    if (obj.category && obj.action) {
        if (obj.storageDate) {
            const fechaMatch = obj.storageDate.match(/^\d{4}-\d{2}-\d{2}/);
            if (fechaMatch) {
                return fechaMatch[0];
            }
        }
    }
    
    // Para tickets, buscar en metadata y content primero
    if (obj.type === 'application/vnd.iris.ticket+json') {
        const metadata = obj.metadata || {};
        const content = obj.content || {};
        
        // Priorizar metadata.#envelope.storageDate
        if (metadata['#envelope.storageDate']) {
            const fechaMatch = metadata['#envelope.storageDate'].match(/^\d{4}-\d{2}-\d{2}/);
            if (fechaMatch) {
                return fechaMatch[0];
            }
        }
        
        // Luego content.storageDate
        if (content.storageDate) {
            const fechaMatch = content.storageDate.match(/^\d{4}-\d{2}-\d{2}/);
            if (fechaMatch) {
                return fechaMatch[0];
            }
        }
    }
    
    // Para mensajes, buscar en metadata primero
    if (obj.type && obj.type.includes('text/')) {
        const metadata = obj.metadata || {};
        
        // Priorizar metadata.#envelope.storageDate
        if (metadata['#envelope.storageDate']) {
            const fechaMatch = metadata['#envelope.storageDate'].match(/^\d{4}-\d{2}-\d{2}/);
            if (fechaMatch) {
                return fechaMatch[0];
            }
        }
        
        // Luego metadata.#date_processed (timestamp)
        if (metadata['#date_processed']) {
            try {
                const fechaObj = new Date(parseInt(metadata['#date_processed']));
                if (!isNaN(fechaObj.getTime())) {
                    return fechaObj.toISOString().slice(0, 10);
                }
            } catch (e) {}
        }
        
        // Luego metadata.date_created (timestamp)
        if (metadata['date_created']) {
            try {
                const fechaObj = new Date(parseInt(metadata['date_created']));
                if (!isNaN(fechaObj.getTime())) {
                    return fechaObj.toISOString().slice(0, 10);
                }
            } catch (e) {}
        }
    }
    
    // Para otros tipos, usar la lógica original
    const fechaFields = [
        'storageDate',
        'metadata.#envelope.storageDate',
        'metadata.#wa.timestamp',
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
            const fechaMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
            if (fechaMatch) {
                return fechaMatch[0];
            }
        } else if (typeof value === 'number') {
            try {
                const fechaObj = new Date(value);
                if (!isNaN(fechaObj.getTime())) {
                    return fechaObj.toISOString().slice(0, 10);
                }
            } catch (e) {}
        }
    }
    
    return new Date().toISOString().slice(0, 10);
};

/**
 * Genera un resumen de rendimiento de campañas a partir de datos ya consolidados.
 * @param {Array} campaignData - Array de datos de campañas (salida de consolidarCampanas).
 * @param {string} baseDir - Directorio base para guardar el reporte.
 * @param {string} periodo - String que representa el rango de fechas (ej: "2023-01-01 - 2023-01-31").
 * @returns {Promise<string|null>} - La ruta al archivo CSV del resumen, o null si no hay datos.
 */
async function generarResumenDeCampanas(campaignData, baseDir, periodo = 'No especificado') {
    console.log(`[generarResumenDeCampanas] Iniciando resumen a partir de ${campaignData.length} registros para el período: ${periodo}.`);

    if (!campaignData || campaignData.length === 0) {
        return null;
    }

    // Agrupar por nombre de plantilla
    const resumen = {};

    for (const campaign of campaignData) {
        const nombre = campaign.plantilla_nombre;
        if (!nombre) continue;

        if (!resumen[nombre]) {
            resumen[nombre] = {
                plantilla: nombre,
                cantidad: 0,
                respondidos: 0,
            };
        }
        
        resumen[nombre].cantidad++;
        if (campaign.usuario_respuesta === 'SI') {
            resumen[nombre].respondidos++;
        }
    }

    const resultadoFinal = Object.values(resumen).map(item => ({
        ...item,
        pendientes: item.cantidad - item.respondidos,
        tasa_de_respuesta: item.cantidad > 0 ? ((item.respondidos / item.cantidad) * 100).toFixed(2) : "0.00",
        periodo: periodo // Añadir el período a cada fila
    }));

    if (resultadoFinal.length === 0) {
        console.log('[generarResumenDeCampanas] No hay datos para generar el resumen.');
        return null;
    }

    // Crear CSV
    const campos = ['plantilla', 'cantidad', 'respondidos', 'pendientes', 'tasa_de_respuesta', 'periodo'];
    const parser = new Parser({ fields: campos, header: true });
    const csv = parser.parse(resultadoFinal);

    // Guardar archivo
    const dirReportes = path.join(baseDir, '..', 'reportes');
     if (!fs.existsSync(dirReportes)) {
        fs.mkdirSync(dirReportes, { recursive: true });
    }
    const now = new Date();
    const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
    const fecha = now.toISOString().slice(0,10);
    const nombreArchivo = `resumen_campanas_${hora}_${fecha}.csv`;
    const rutaCsv = path.join(dirReportes, nombreArchivo);

    fs.writeFileSync(rutaCsv, csv);
    console.log(`[generarResumenDeCampanas] Archivo de resumen generado: ${rutaCsv}`);

    return rutaCsv;
}

module.exports = {
    convertJsonToCsv,
    consolidarCsvs,
    flattenObject,
    consolidarTicketsCsvs,
    generarTicketIndividual,
    procesarMensajes,
    procesarContactos,
    procesarEventos,
    procesarTickets,
    procesarPlantillas,
    consolidarCampanas,
    obtenerCampanasDisponibles,
    generarResumenDeCampanas,
    procesarTransferenciasTicketsV4
}; 