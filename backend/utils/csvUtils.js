const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const archiver = require('archiver');

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
 * Genera un archivo CSV para una atención completa con todos sus tickets
 * @param {Object} atencion - Información de la atención completa
 * @param {string} directorio - Directorio base donde guardar el archivo
 * @returns {string} - Ruta del archivo generado
 */
const generarAtencionCompleta = (atencion, directorio) => {
    try {
        const contacto = atencion.contacto;
        const tipoBase = atencion.tipoBase; // BOT o PLANTILLA
        const fechaApertura = atencion.fechaApertura;
        const fechaCierre = atencion.fechaCierre;
        const duracionTotal = atencion.duracionTotal;
        
        // Generar ID único de atención con timestamp para evitar sobrescrituras
        const timestamp = new Date().getTime();
        const fechaAperturaFormateada = new Date(fechaApertura).toISOString().slice(0, 10);
        const atencionId = `atencion_${contacto}_${fechaAperturaFormateada}_${timestamp}`;
        
        console.log(`[generarAtencionCompleta] Generando atención: ${atencionId} - Tipo: ${tipoBase} - Tickets: ${atencion.tickets.length}`);
        
        // --- Cargar mensajes desde archivos si es necesario ---
        // Leer todos los mensajes del contacto desde los archivos CSV de mensajes
        let mensajesGlobales = [];
        try {
            const carpetaMensajes = path.join(path.dirname(directorio), 'mensajes');
            if (fs.existsSync(carpetaMensajes)) {
                const archivosMensajes = fs.readdirSync(carpetaMensajes).filter(f => f.endsWith('.csv'));
                for (const archivo of archivosMensajes) {
                    const contenido = fs.readFileSync(path.join(carpetaMensajes, archivo), 'utf-8');
                    const registros = parse(contenido, { columns: true, skip_empty_lines: true });
                    // Filtrar solo los mensajes de este contacto
                    mensajesGlobales.push(...registros.filter(m => (m.from && m.from.includes(contacto)) || (m.to && m.to.includes(contacto))));
                }
            }
        } catch (e) {
            console.warn('[generarAtencionCompleta] No se pudieron cargar mensajes globales:', e.message);
        }
        // Procesar cada ticket de la atención
        const ticketsProcesados = [];
        for (const ticketInfo of atencion.tickets) {
            const ticket = ticketInfo.ticket;
            const content = ticket.content || {};
            const metadata = ticket.metadata || {};
            const seqId = content.sequentialId;
            const tipoTicket = ticketInfo.tipo; // BOT, PLANTILLA, o TRANSFERENCIA

            // Ordenar mensajes por fecha
            ticketInfo.mensajes.sort((a, b) => {
                const fa = new Date(a['metadata.#envelope.storageDate'] || a['storageDate'] || 0).getTime();
                const fb = new Date(b['metadata.#envelope.storageDate'] || b['storageDate'] || 0).getTime();
                return fa - fb;
            });
            // Si no hay mensajes en memoria, buscar en mensajesGlobales
            let mensajesTicket = ticketInfo.mensajes;
            if (!mensajesTicket || mensajesTicket.length === 0) {
                // Determinar rango temporal del ticket
                const fechaAperturaTicket = new Date(ticketInfo.fechaApertura);
                let fechaCorte = new Date(ticketInfo.fechaCierre || fechaCierre || Date.now());
                const hijosTicket = atencion.tickets.filter(t => t.parentSequentialId === content.sequentialId);
                if (hijosTicket.length > 0) {
                    const fechasHijos = hijosTicket.map(h => new Date(h.fechaApertura));
                    const fechaPrimerHijo = new Date(Math.min(...fechasHijos.map(f => f.getTime())));
                    if (fechaPrimerHijo > fechaAperturaTicket) {
                        fechaCorte = fechaPrimerHijo;
                    }
                }
                mensajesTicket = mensajesGlobales.filter(m => {
                    const fechaMsg = new Date(m['metadata.#envelope.storageDate'] || m['storageDate'] || m['timestamp'] || 0);
                    return fechaMsg >= fechaAperturaTicket && fechaMsg < fechaCorte;
                });
                // Ordenar por fecha
                mensajesTicket.sort((a, b) => {
                    const fa = new Date(a['metadata.#envelope.storageDate'] || a['storageDate'] || 0).getTime();
                    const fb = new Date(b['metadata.#envelope.storageDate'] || b['storageDate'] || 0).getTime();
                    return fa - fb;
                });
            }
            // --- Buscar primer mensaje del agente humano ---
            const primerMensajeAgente = mensajesTicket.find(m => m.metadata?.['#messageEmitter'] === 'Human' || m['metadata.#messageEmitter'] === 'Human');
            let primerContacto = '';
            if (primerMensajeAgente) {
                let fechaCompleta = primerMensajeAgente['metadata.#envelope.storageDate'] || primerMensajeAgente['metadata.#wa.timestamp'] || primerMensajeAgente['storageDate'] || primerMensajeAgente['timestamp'] || new Date().toISOString();
                const contenido = primerMensajeAgente.content || '';
                if (fechaCompleta && !fechaCompleta.includes('T')) {
                    try {
                        const fechaObj = new Date(fechaCompleta);
                        if (!isNaN(fechaObj.getTime())) {
                            fechaCompleta = fechaObj.toISOString();
                        }
                    } catch (e) {
                        fechaCompleta = new Date().toISOString();
                    }
                }
                primerContacto = fechaCompleta ? `${fechaCompleta} - ${contenido}` : contenido;
            }

            // --- Construir conversación mejorada ---
            const conversacion = mensajesTicket.map(m => {
                const from = m.from || '';
                let emisor = 'desconocido';
                if (m.metadata?.['#messageEmitter'] === 'Human' || m['metadata.#messageEmitter'] === 'Human') {
                    emisor = 'agente';
                } else if (from.includes('@msging.net')) {
                    emisor = 'bot';
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
                primer_contacto: primerContacto,
                contacto: contacto,
                agente: ticketInfo.correoAgente || '',
                duracion: ticketInfo.duracion || '',
                TIPO: tipoTicket
            };
            
            // --- AGREGAR CAMPOS DE TRANSFERENCIA ---
            const isTransfer = tipoTicket === 'TRANSFERENCIA';
            const parentSeqId = content.parentSequentialId || '';
            const agentIdentity = ticketInfo.agentIdentity || content.agentIdentity || '';
            
            // NUEVA LÓGICA: Determinar si es el último ticket de la atención
            // Ordenar tickets por fecha de apertura para determinar el orden cronológico
            const ticketsOrdenados = [...atencion.tickets].sort((a, b) => {
                const fechaA = new Date(a.fechaApertura || 0);
                const fechaB = new Date(b.fechaApertura || 0);
                return fechaA - fechaB;
            });
            
            // El último ticket es el que se abrió más recientemente
            const ultimoTicket = ticketsOrdenados[ticketsOrdenados.length - 1];
            const esUltimoTicket = content.sequentialId === ultimoTicket.sequentialId;
            
            // Campos de transferencia
            ticketData.transferencia = 'FALSE'; // Por defecto FALSE
            ticketData.ticket_padre = isTransfer ? parentSeqId : '';
            // ticket_hijo: para el padre, todos los sequentialId de los hijos separados por coma; para los hijos, vacío
            const hijos = atencion.tickets.filter(t => t.parentSequentialId === content.sequentialId);
            ticketData.ticket_hijo = (!isTransfer && hijos.length > 0) ? hijos.map(h => h.sequentialId).join(',') : '';
            ticketData.tipo_transferencia = '';
            ticketData.agente_transferido = '';
            ticketData.cola_transferida = '';
            ticketData.cantidad_transferencias = 0;
            
            // NUEVA LÓGICA: Si NO es el último ticket, entonces es una transferencia
            if (!esUltimoTicket) {
                ticketData.transferencia = 'TRUE';
                
                // Si es una transferencia (tiene parentSequentialId), obtener información del agente transferido
                if (isTransfer) {
                    if (content.team === 'DIRECT_TRANSFER' && agentIdentity) {
                        try {
                            const decodedAgent = decodeURIComponent(agentIdentity.split('@')[0].replace(/%40/g, '@')) + '@' + agentIdentity.split('@').slice(1).join('@');
                            ticketData.agente_transferido = decodedAgent;
                        } catch {
                            ticketData.agente_transferido = agentIdentity;
                        }
                        ticketData.cola_transferida = 'DIRECT_TRANSFER';
                    } else if (content.team && content.team !== 'DIRECT_TRANSFER') {
                        ticketData.cola_transferida = content.team;
                    }
                    ticketData.cantidad_transferencias = 1;
                } else {
                    // Es un ticket padre que tiene transferencias
                    // tipo_transferencia y otros campos según el primer hijo
                    const primerHijo = hijos[0];
                    const team = primerHijo.team || '';
                    const agentIdentity = primerHijo.agentIdentity || '';
                    if (team === 'DIRECT_TRANSFER' && agentIdentity) {
                        ticketData.tipo_transferencia = 'AGENTE';
                        try {
                            ticketData.agente_transferido = decodeURIComponent(agentIdentity.split('@')[0].replace(/%40/g, '@')) + '@' + agentIdentity.split('@').slice(1).join('@');
                        } catch {
                            ticketData.agente_transferido = agentIdentity;
                        }
                        ticketData.cola_transferida = 'DIRECT_TRANSFER';
                    } else if (team && team !== 'DIRECT_TRANSFER') {
                        ticketData.tipo_transferencia = 'COLA';
                        ticketData.cola_transferida = team;
                    }
                    ticketData.cantidad_transferencias = hijos.length;
                }
            } else {
                // Es el último ticket, transferencia FALSE
                ticketData.transferencia = 'FALSE';
                ticketData.cantidad_transferencias = 0;
            }
            
            // --- AGREGAR CAMPOS DE ATENCIÓN ---
            ticketData.atencion_id = atencionId;
            ticketData.atencion_fecha_apertura = fechaApertura;
            ticketData.atencion_fecha_cierre = fechaCierre;
            ticketData.atencion_duracion_total = duracionTotal;
            
            // --- Añadir campos específicos según el tipo base ---
            if (tipoBase === 'PLANTILLA') {
                const details = ticketInfo.campaignDetails || {};
                
                // Campos específicos de plantilla
                ticketData.plantilla_id = details.campaignId || '';
                ticketData.plantilla_nombre = details.templateName || '';
                ticketData.plantilla_contenido = details.templateContent || '';
                ticketData.plantilla_parametros = (details.templateParameters || []).map(p => p.text || p).join('|');
                ticketData.plantilla_campaignId = details.campaignId || '';
                ticketData.plantilla_campaignName = details.campaignName || '';
                ticketData.plantilla_fecha_envio = details.sentTime || '';
                ticketData.contacto_identity = `${contacto}@wa.gw.msging.net`;
                ticketData.contacto_numero = contacto;
                ticketData.usuario_respuesta = details.replied ? 'SI' : 'NO';
                ticketData.usuario_tipo_respuesta = details.replyType || '';
                ticketData.usuario_contenido = details.replyContent || '';
                ticketData.usuario_fecha_respuesta = details.replyTime || '';
                ticketData.ticket_generado = 'SI';
                ticketData.ticket_id = ticket.id || '';
                ticketData.ticket_sequentialId = content.sequentialId || '';
                ticketData.ticket_estado = 'cerrado';
                ticketData.ticket_fecha_cierre = ticketInfo.fechaCierre || '';
                ticketData.ticket_tipo_cierre = ticketInfo.tipoCierre || '';
                ticketData.ticket_agente = ticketInfo.correoAgente || '';
                ticketData.ticket_duracion = ticketInfo.duracion || '';
            }
            
            ticketsProcesados.push(ticketData);
        }
        
        // Determinar campos según el tipo base
        let campos;
        if (tipoBase === 'PLANTILLA') {
            campos = [
                'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
                'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
                'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'primer_contacto', 'contacto', 'agente', 'duracion', 'TIPO',
                'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'cantidad_transferencias',
                'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total',
                'plantilla_id', 'plantilla_nombre', 'plantilla_contenido', 'plantilla_parametros', 'plantilla_campaignId', 'plantilla_campaignName', 'plantilla_fecha_envio',
                'contacto_identity', 'contacto_numero', 'usuario_respuesta', 'usuario_tipo_respuesta', 'usuario_contenido', 'usuario_fecha_respuesta',
                'ticket_generado', 'ticket_id', 'ticket_sequentialId', 'ticket_estado', 'ticket_fecha_cierre', 'ticket_tipo_cierre', 'ticket_agente', 'ticket_duracion'
            ];
        } else { // BOT
            campos = [
                'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
                'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
                'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'primer_contacto', 'contacto', 'agente', 'duracion', 'TIPO',
                'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'cantidad_transferencias',
                'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total'
            ];
        }

        // Generar nombre único de archivo con timestamp para evitar sobrescrituras
        const fechaCierreFormateada = new Date(fechaCierre || Date.now()).toISOString().slice(0, 10);
        const hora = new Date().toTimeString().slice(0,8).replace(/:/g, '-');
        const nombreArchivo = `atencion_${contacto}_${fechaCierreFormateada}_${hora}_${timestamp}.csv`;
        
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
        }

        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse(ticketsProcesados);

        const rutaArchivo = path.join(carpetaReportes, nombreArchivo);
        fs.writeFileSync(rutaArchivo, csv);
        
        console.log(`[generarAtencionCompleta] Archivo de atención generado: ${nombreArchivo} (Tipo: ${tipoBase}, Tickets: ${ticketsProcesados.length})`);
        
        return rutaArchivo;
    } catch (error) {
        console.error('[generarAtencionCompleta] Error:', error);
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
 * Consolida todos los archivos CSV de atenciones en dos archivos separados (BOT y PLANTILLA)
 * @param {string} directorio - Ruta del directorio que contiene los archivos CSV de atenciones
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @returns {Promise<{botPath: string, plantillaPath: string}>} - Rutas de los archivos CSV consolidados
 */
const consolidarTicketsCsvs = async (directorio, fechas = null) => {
    try {
        console.log(`[consolidarTicketsCsvs] Iniciando consolidación - directorio: ${directorio}`);
        console.log(`[consolidarTicketsCsvs] Fechas recibidas:`, fechas);
        
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        console.log(`[consolidarTicketsCsvs] Carpeta reportes: ${carpetaReportes}`);
        console.log(`[consolidarTicketsCsvs] ¿Existe carpeta reportes?: ${fs.existsSync(carpetaReportes)}`);
        
        if (!fs.existsSync(carpetaReportes)) {
            console.log(`[consolidarTicketsCsvs] Carpeta reportes no existe, creando...`);
            fs.mkdirSync(carpetaReportes, { recursive: true });
            console.log(`[consolidarTicketsCsvs] Carpeta reportes creada`);
            return { botPath: null, plantillaPath: null };
        }
        
        const archivos = fs.readdirSync(carpetaReportes);
        console.log(`[consolidarTicketsCsvs] Todos los archivos en reportes:`, archivos);
        // Filtrar todos los archivos de atención
        const archivosAtencion = archivos.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
        console.log(`[consolidarTicketsCsvs] Archivos de atención filtrados:`, archivosAtencion);
        if (archivosAtencion.length === 0) {
            console.log(`[consolidarTicketsCsvs] No hay archivos de atención para procesar`);
            return { botPath: null, plantillaPath: null };
        }
        console.log(`[consolidarTicketsCsvs] Archivos de atención encontrados: ${archivosAtencion.length}`);
        // Leer y parsear todos los archivos de atención
        let todosLosTickets = [];
        for (const archivo of archivosAtencion) {
            const rutaArchivo = path.join(carpetaReportes, archivo);
            console.log(`[consolidarTicketsCsvs] Procesando archivo: ${rutaArchivo}`);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const registros = parse(contenido, { columns: true, skip_empty_lines: true });
            console.log(`[consolidarTicketsCsvs] Registros leídos de ${archivo}: ${registros.length}`);
            todosLosTickets.push(...registros);
        }
        
        console.log(`[consolidarTicketsCsvs] Total tickets leídos: ${todosLosTickets.length}`);
        
        // Filtrar por fechas si aplica
        if (fechas) {
            const ticketsAntes = todosLosTickets.length;
            todosLosTickets = todosLosTickets.filter(t => fechaEnRango(t.atencion_fecha_cierre, fechas));
            console.log(`[consolidarTicketsCsvs] Tickets después del filtro de fechas: ${todosLosTickets.length} (antes: ${ticketsAntes})`);
        }
        
        // Separar tickets por tipo base
        const ticketsBot = [];
        const ticketsPlantilla = [];
        
        for (const ticket of todosLosTickets) {
            // Determinar tipo base por las columnas disponibles
            if (ticket.plantilla_id || ticket.plantilla_nombre) {
                ticketsPlantilla.push(ticket);
            } else {
                ticketsBot.push(ticket);
            }
        }
        
        console.log(`[consolidarTicketsCsvs] Tickets BOT: ${ticketsBot.length}, Tickets PLANTILLA: ${ticketsPlantilla.length}`);
        
        // Crear carpeta de exportaciones de tickets
        const carpetaExportacionesTickets = path.join(path.dirname(directorio), 'exportaciones', 'tickets');
        if (!fs.existsSync(carpetaExportacionesTickets)) {
            fs.mkdirSync(carpetaExportacionesTickets, { recursive: true });
        }
        
        // Generar CSV de tickets BOT
        let botPath = null;
        if (ticketsBot.length > 0) {
            const camposBot = [
                'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
                'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
                'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'primer_contacto', 'contacto', 'agente', 'duracion', 'TIPO',
                'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'cantidad_transferencias',
                'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total'
            ];
            const parserBot = new Parser({ fields: camposBot, header: true });
            const csvBot = parserBot.parse(ticketsBot);
            const nombreArchivoBot = 'tickets_bot.csv';
            const rutaBot = path.join(carpetaExportacionesTickets, nombreArchivoBot);
            fs.writeFileSync(rutaBot, csvBot);
            botPath = rutaBot;
            console.log(`[consolidarTicketsCsvs] Archivo BOT consolidado generado: ${rutaBot}`);
        }
        
        // Generar CSV de tickets PLANTILLA
        let plantillaPath = null;
        if (ticketsPlantilla.length > 0) {
            const camposPlantilla = [
                'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
                'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
                'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'primer_contacto', 'contacto', 'agente', 'duracion', 'TIPO',
                'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'cantidad_transferencias',
                'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total',
                'plantilla_id', 'plantilla_nombre', 'plantilla_contenido', 'plantilla_parametros', 'plantilla_campaignId', 'plantilla_campaignName', 'plantilla_fecha_envio',
                'contacto_identity', 'contacto_numero', 'usuario_respuesta', 'usuario_tipo_respuesta', 'usuario_contenido', 'usuario_fecha_respuesta',
                'ticket_generado', 'ticket_id', 'ticket_sequentialId', 'ticket_estado', 'ticket_fecha_cierre', 'ticket_tipo_cierre', 'ticket_agente', 'ticket_duracion'
            ];
            const parserPlantilla = new Parser({ fields: camposPlantilla, header: true });
            const csvPlantilla = parserPlantilla.parse(ticketsPlantilla);
            const nombreArchivoPlantilla = 'tickets_plantilla.csv';
            const rutaPlantilla = path.join(carpetaExportacionesTickets, nombreArchivoPlantilla);
            fs.writeFileSync(rutaPlantilla, csvPlantilla);
            plantillaPath = rutaPlantilla;
            console.log(`[consolidarTicketsCsvs] Archivo PLANTILLA consolidado generado: ${rutaPlantilla}`);
        }
        
        console.log(`[consolidarTicketsCsvs] Resumen de consolidación:`);
        console.log(`  - Tickets BOT: ${ticketsBot.length}`);
        console.log(`  - Tickets PLANTILLA: ${ticketsPlantilla.length}`);
        console.log(`  - Total: ${todosLosTickets.length}`);
        
        return { botPath, plantillaPath };
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
    if (archivosPlantillas.length === 0) {
        console.log('[consolidarCampanas] No hay archivos de plantillas para procesar');
        return { filePath: null, data: [] };
    }

    // 2. OBTENER TODOS LOS TICKETS DE ATENCIONES (atencion_*.csv)
    const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
    let ticketsPlantilla = [];
    if (fs.existsSync(carpetaReportes)) {
        const archivosAtencion = fs.readdirSync(carpetaReportes)
            .filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
        for (const archivo of archivosAtencion) {
            const rutaArchivo = path.join(carpetaReportes, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const registros = parse(contenido, { columns: true, skip_empty_lines: true });
            // Solo tickets de tipo PLANTILLA
            ticketsPlantilla.push(...registros.filter(t => t.TIPO === 'PLANTILLA' || t.TIPO === 'TRANSFERENCIA'));
        }
    }

    // 3. PROCESAR CADA PLANTILLA ENVIADA Y ASOCIAR TODOS LOS TICKETS DE PLANTILLA
    let campanasIncluidas = [];
    let incluidas = 0;
    let descartadas = 0;

    // Definir los campos finales (igual que tickets_plantilla.csv, pero los de plantilla primero)
    const campos = [
        // CAMPOS DE PLANTILLA
        'plantilla_id', 'plantilla_nombre', 'plantilla_contenido', 'plantilla_parametros', 'plantilla_campaignId', 'plantilla_campaignName', 'plantilla_fecha_envio',
        'contacto_identity', 'contacto_numero',
        'usuario_respuesta', 'usuario_tipo_respuesta', 'usuario_contenido', 'usuario_fecha_respuesta',
        // CAMPOS DE TICKET (igual que tickets_plantilla.csv)
        'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
        'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
        'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'primer_contacto', 'contacto', 'agente', 'duracion', 'TIPO',
        'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'cantidad_transferencias',
        'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total',
        // CAMPOS DE PLANTILLA REPETIDOS EN TICKET (para compatibilidad)
        'ticket_generado', 'ticket_id', 'ticket_sequentialId', 'ticket_estado', 'ticket_fecha_cierre', 'ticket_tipo_cierre', 'ticket_agente', 'ticket_duracion'
    ];

    for (const archivo of archivosPlantillas) {
        const rutaArchivo = path.join(carpetaPlantillas, archivo);
        const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
        const registros = parse(contenido, { columns: true, skip_empty_lines: true });
        for (const plantilla of registros) {
            // Filtrar por nombre de plantilla si se especifica
            if (nombrePlantilla && plantilla.nombrePlantilla !== nombrePlantilla) {
                descartadas++;
                continue;
            }
            // Filtrar por fechas si se especifican
            if (fechas && plantilla.fechaFiltro) {
                if (!fechaEnRango(plantilla.fechaFiltro, fechas)) {
                    descartadas++;
                    continue;
                }
            }
            // Buscar todos los tickets de tipo plantilla para este contacto y campaña
            const contactIdentity = plantilla.to;
            const plantillaId = plantilla.id || '';
            // Buscar todos los tickets que coincidan con el contacto y la campaña
            const ticketsAsociados = ticketsPlantilla.filter(t =>
                t.contacto_identity === contactIdentity &&
                (t.plantilla_id === plantillaId || t.plantilla_nombre === plantilla.nombrePlantilla)
            );
            if (ticketsAsociados.length === 0) {
                // Si no hay tickets asociados, incluir solo la fila de la plantilla (sin datos de ticket)
                const registroCampana = {};
                // Copiar campos de plantilla
                registroCampana['plantilla_id'] = plantilla.id || '';
                registroCampana['plantilla_nombre'] = plantilla.nombrePlantilla || '';
                registroCampana['plantilla_contenido'] = plantilla.contenidoPlantilla || '';
                registroCampana['plantilla_parametros'] = plantilla.parametros || '';
                registroCampana['plantilla_campaignId'] = plantilla.campaignId || '';
                registroCampana['plantilla_campaignName'] = plantilla.campaignName || '';
                registroCampana['plantilla_fecha_envio'] = plantilla.storageDate || plantilla.timestamp || '';
                registroCampana['contacto_identity'] = contactIdentity;
                registroCampana['contacto_numero'] = contactIdentity ? contactIdentity.replace('@wa.gw.msging.net', '') : '';
                registroCampana['usuario_respuesta'] = '';
                registroCampana['usuario_tipo_respuesta'] = '';
                registroCampana['usuario_contenido'] = '';
                registroCampana['usuario_fecha_respuesta'] = '';
                // Campos de ticket vacíos
                campos.slice(13).forEach(c => registroCampana[c] = '');
                campanasIncluidas.push(registroCampana);
                incluidas++;
            } else {
                // Por cada ticket asociado, crear una fila combinando datos de la plantilla y del ticket
                for (const ticket of ticketsAsociados) {
                    const registroCampana = {};
                    // Copiar campos de plantilla
                    registroCampana['plantilla_id'] = plantilla.id || '';
                    registroCampana['plantilla_nombre'] = plantilla.nombrePlantilla || '';
                    registroCampana['plantilla_contenido'] = plantilla.contenidoPlantilla || '';
                    registroCampana['plantilla_parametros'] = plantilla.parametros || '';
                    registroCampana['plantilla_campaignId'] = plantilla.campaignId || '';
                    registroCampana['plantilla_campaignName'] = plantilla.campaignName || '';
                    registroCampana['plantilla_fecha_envio'] = plantilla.storageDate || plantilla.timestamp || '';
                    registroCampana['contacto_identity'] = contactIdentity;
                    registroCampana['contacto_numero'] = contactIdentity ? contactIdentity.replace('@wa.gw.msging.net', '') : '';
                    registroCampana['usuario_respuesta'] = ticket.usuario_respuesta || '';
                    registroCampana['usuario_tipo_respuesta'] = ticket.usuario_tipo_respuesta || '';
                    registroCampana['usuario_contenido'] = ticket.usuario_contenido || '';
                    registroCampana['usuario_fecha_respuesta'] = ticket.usuario_fecha_respuesta || '';
                    // Copiar todos los campos de ticket
                    campos.slice(13).forEach(c => registroCampana[c] = ticket[c] || '');
                    campanasIncluidas.push(registroCampana);
                    incluidas++;
                }
            }
        }
    }

    console.log(`[consolidarCampanas] Total campañas incluidas: ${incluidas}, descartadas: ${descartadas}`);
    if (incluidas === 0) {
        console.log('[consolidarCampanas] No hay datos después del filtrado.');
        return { filePath: null, data: [] };
    }

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

    // Guardar archivo en la carpeta de exportaciones de campañas
    const dirExportacionesCampanas = path.join(baseDir, '..', 'exportaciones', 'campanas');
    if (!fs.existsSync(dirExportacionesCampanas)) {
        fs.mkdirSync(dirExportacionesCampanas, { recursive: true });
    }
    const now = new Date();
    const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
    const fecha = now.toISOString().slice(0,10);
    const nombreArchivo = `resumen_campanas_${hora}_${fecha}.csv`;
    const rutaCsv = path.join(dirExportacionesCampanas, nombreArchivo);

    fs.writeFileSync(rutaCsv, csv);
    console.log(`[generarResumenDeCampanas] Archivo de resumen generado: ${rutaCsv}`);

    return rutaCsv;
}

/**
 * Crea un archivo ZIP con los dos archivos CSV de tickets (BOT y PLANTILLA)
 * @param {string} botPath - Ruta del archivo CSV de tickets BOT
 * @param {string} plantillaPath - Ruta del archivo CSV de tickets PLANTILLA
 * @param {string} directorio - Directorio donde guardar el ZIP
 * @returns {Promise<string>} - Ruta del archivo ZIP generado
 */
const crearZipTickets = async (botPath, plantillaPath, directorio, tipoExportacion = 'tickets') => {
    try {
        // Determinar carpeta de destino según el tipo de exportación
        let carpetaDestino;
        if (tipoExportacion === 'agentes') {
            carpetaDestino = path.join(path.dirname(directorio), 'exportaciones', 'agentes');
        } else {
            carpetaDestino = path.join(path.dirname(directorio), 'exportaciones', 'tickets');
        }
        
        if (!fs.existsSync(carpetaDestino)) {
            fs.mkdirSync(carpetaDestino, { recursive: true });
        }
        
        const now = new Date();
        const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
        const fecha = now.toISOString().slice(0,10);
        const nombreZip = `${tipoExportacion}_${hora}_${fecha}.zip`;
        const rutaZip = path.join(carpetaDestino, nombreZip);
        
        // Crear stream de escritura para el ZIP
        const output = fs.createWriteStream(rutaZip);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Máxima compresión
        });
        
        // Manejar eventos del archiver
        output.on('close', () => {
            console.log(`[crearZipTickets] ZIP creado: ${rutaZip} (${archive.pointer()} bytes)`);
        });
        
        archive.on('error', (err) => {
            throw err;
        });
        
        // Pipe archive data to the file
        archive.pipe(output);
        
        // Agregar archivos al ZIP
        if (botPath && fs.existsSync(botPath)) {
            archive.file(botPath, { name: 'tickets_bot.csv' });
            console.log(`[crearZipTickets] Agregado al ZIP: tickets_bot.csv`);
        }
        
        if (plantillaPath && fs.existsSync(plantillaPath)) {
            archive.file(plantillaPath, { name: 'tickets_plantilla.csv' });
            console.log(`[crearZipTickets] Agregado al ZIP: tickets_plantilla.csv`);
        }
        
        // Finalizar el archivo
        await archive.finalize();
        
        return rutaZip;
    } catch (error) {
        console.error('[crearZipTickets] Error:', error);
        throw error;
    }
};

/**
 * Exporta el CSV de campañas detallado a partir de tickets_plantilla.csv, aplicando filtros de fecha y nombre de plantilla.
 * @param {string} directorio - Directorio base (usualmente 'data/tickets')
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @param {string} nombrePlantilla - Nombre de la plantilla para filtrar (opcional)
 * @returns {Promise<{filePath: string, data: Array}>} - Objeto con la ruta del archivo CSV y los datos filtrados
 */
const exportarCampanasDetallado = async (directorio, fechas = null, nombrePlantilla = null) => {
    const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
    const rutaTicketsPlantilla = path.join(carpetaReportes, 'tickets_plantilla.csv');
    if (!fs.existsSync(rutaTicketsPlantilla)) {
        return { filePath: null, data: [] };
    }
    const contenido = fs.readFileSync(rutaTicketsPlantilla, 'utf-8');
    const registros = parse(contenido, { columns: true, skip_empty_lines: true });
    let filtrados = registros;
    // Filtro por fechas (atencion_fecha_cierre)
    if (fechas && fechas.fechaInicio && fechas.fechaFin) {
        filtrados = filtrados.filter(t => fechaEnRango(t.atencion_fecha_cierre, fechas));
    }
    // Filtro por nombre de plantilla
    if (nombrePlantilla) {
        filtrados = filtrados.filter(t => t.plantilla_nombre === nombrePlantilla);
    }
    if (filtrados.length === 0) {
        return { filePath: null, data: [] };
    }
    // Generar nombre de archivo en la carpeta de exportaciones de campañas
    const carpetaExportacionesCampanas = path.join(path.dirname(directorio), 'exportaciones', 'campanas');
    if (!fs.existsSync(carpetaExportacionesCampanas)) {
        fs.mkdirSync(carpetaExportacionesCampanas, { recursive: true });
    }
    const now = new Date();
    const nombreArchivo = `campanas_detallado_${now.toISOString().replace(/:/g, '_')}.csv`;
    const rutaCsv = path.join(carpetaExportacionesCampanas, nombreArchivo);
    // Usar los mismos campos que tickets_plantilla.csv
    const campos = Object.keys(filtrados[0]);
    const parser = new Parser({ fields: campos, header: true });
    const csv = parser.parse(filtrados);
    fs.writeFileSync(rutaCsv, csv);
    return { filePath: rutaCsv, data: filtrados };
};

/**
 * Consolida los datos de campañas de forma independiente, leyendo directamente los archivos de atención
 * @param {string} directorio - Directorio base (usualmente 'data/tickets')
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @param {string} nombrePlantilla - Nombre de la plantilla para filtrar (opcional)
 * @returns {Promise<{filePath: string, data: Array}>} - Objeto con la ruta del archivo CSV y los datos consolidados
 */
const consolidarCampanasIndependiente = async (directorio, fechas = null, nombrePlantilla = null) => {
    console.log(`[consolidarCampanasIndependiente] Iniciando consolidación independiente de campanas`);
    console.log(`[consolidarCampanasIndependiente] Directorio: ${directorio}`);
    console.log(`[consolidarCampanasIndependiente] Fechas recibidas:`, fechas);
    console.log(`[consolidarCampanasIndependiente] Nombre de plantilla filtro:`, nombrePlantilla);
    
    try {
        // 1. OBTENER TODOS LOS ARCHIVOS DE ATENCIÓN
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        console.log(`[consolidarCampanasIndependiente] Carpeta reportes: ${carpetaReportes}`);
        
        if (!fs.existsSync(carpetaReportes)) {
            console.log(`[consolidarCampanasIndependiente] Carpeta reportes no existe`);
            return { filePath: null, data: [] };
        }
        
        const archivos = fs.readdirSync(carpetaReportes);
        console.log(`[consolidarCampanasIndependiente] Todos los archivos en reportes:`, archivos);
        
        // Filtrar solo archivos de atención
        const archivosAtencion = archivos.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
        console.log(`[consolidarCampanasIndependiente] Archivos de atención encontrados:`, archivosAtencion);
        
        if (archivosAtencion.length === 0) {
            console.log(`[consolidarCampanasIndependiente] No hay archivos de atención para procesar`);
            return { filePath: null, data: [] };
        }
        
        // 2. LEER Y PROCESAR TODOS LOS TICKETS DE ATENCIONES
        let todosLosTickets = [];
        for (const archivo of archivosAtencion) {
            const rutaArchivo = path.join(carpetaReportes, archivo);
            console.log(`[consolidarCampanasIndependiente] Procesando archivo: ${rutaArchivo}`);
            
            try {
                const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
                const registros = parse(contenido, { columns: true, skip_empty_lines: true });
                console.log(`[consolidarCampanasIndependiente] Registros leídos de ${archivo}: ${registros.length}`);
                
                // Solo incluir tickets de tipo PLANTILLA y TRANSFERENCIA
                const ticketsPlantilla = registros.filter(t => 
                    t.TIPO === 'PLANTILLA' || t.TIPO === 'TRANSFERENCIA'
                );
                console.log(`[consolidarCampanasIndependiente] Tickets PLANTILLA/TRANSFERENCIA en ${archivo}: ${ticketsPlantilla.length}`);
                
                todosLosTickets.push(...ticketsPlantilla);
            } catch (error) {
                console.error(`[consolidarCampanasIndependiente] Error procesando archivo ${archivo}:`, error);
            }
        }
        
        console.log(`[consolidarCampanasIndependiente] Total tickets PLANTILLA/TRANSFERENCIA leídos: ${todosLosTickets.length}`);
        
        if (todosLosTickets.length === 0) {
            console.log(`[consolidarCampanasIndependiente] No hay tickets de plantilla para procesar`);
            return { filePath: null, data: [] };
        }
        
        // 3. APLICAR FILTROS
        let ticketsFiltrados = todosLosTickets;
        
        // Filtro por fechas (atencion_fecha_cierre)
        if (fechas && fechas.fechaInicio && fechas.fechaFin) {
            const ticketsAntes = ticketsFiltrados.length;
            ticketsFiltrados = ticketsFiltrados.filter(t => fechaEnRango(t.atencion_fecha_cierre, fechas));
            console.log(`[consolidarCampanasIndependiente] Tickets después del filtro de fechas: ${ticketsFiltrados.length} (antes: ${ticketsAntes})`);
        }
        
        // Filtro por nombre de plantilla
        if (nombrePlantilla) {
            const ticketsAntes = ticketsFiltrados.length;
            ticketsFiltrados = ticketsFiltrados.filter(t => t.plantilla_nombre === nombrePlantilla);
            console.log(`[consolidarCampanasIndependiente] Tickets después del filtro de plantilla: ${ticketsFiltrados.length} (antes: ${ticketsAntes})`);
        }
        
        if (ticketsFiltrados.length === 0) {
            console.log(`[consolidarCampanasIndependiente] No hay tickets después de aplicar filtros`);
            return { filePath: null, data: [] };
        }
        
        // 4. GENERAR CSV CON EL MISMO FORMATO QUE tickets_plantilla.csv
        const campos = [
            'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
            'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
            'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'primer_contacto', 'contacto', 'agente', 'duracion', 'TIPO',
            'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'cantidad_transferencias',
            'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total',
            'plantilla_id', 'plantilla_nombre', 'plantilla_contenido', 'plantilla_parametros', 'plantilla_campaignId', 'plantilla_campaignName', 'plantilla_fecha_envio',
            'contacto_identity', 'contacto_numero', 'usuario_respuesta', 'usuario_tipo_respuesta', 'usuario_contenido', 'usuario_fecha_respuesta',
            'ticket_generado', 'ticket_id', 'ticket_sequentialId', 'ticket_estado', 'ticket_fecha_cierre', 'ticket_tipo_cierre', 'ticket_agente', 'ticket_duracion'
        ];
        
        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse(ticketsFiltrados);
        
        // 5. GENERAR NOMBRE DE ARCHIVO Y GUARDAR
        const carpetaExportacionesCampanas = path.join(path.dirname(directorio), 'exportaciones', 'campanas');
        if (!fs.existsSync(carpetaExportacionesCampanas)) {
            fs.mkdirSync(carpetaExportacionesCampanas, { recursive: true });
        }
        const now = new Date();
        const nombreArchivo = `campanas_detallado_${now.toISOString().replace(/:/g, '_')}.csv`;
        const rutaCsv = path.join(carpetaExportacionesCampanas, nombreArchivo);
        
        fs.writeFileSync(rutaCsv, csv);
        console.log(`[consolidarCampanasIndependiente] Archivo CSV generado: ${rutaCsv}`);
        console.log(`[consolidarCampanasIndependiente] Total registros exportados: ${ticketsFiltrados.length}`);
        
        return { filePath: rutaCsv, data: ticketsFiltrados };
        
    } catch (error) {
        console.error(`[consolidarCampanasIndependiente] Error:`, error);
        throw error;
    }
};

/**
 * Exporta únicamente tickets de campañas (plantillas), excluyendo completamente tickets BOT
 * @param {string} directorio - Directorio base (usualmente 'data/tickets')
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @param {string} nombrePlantilla - Nombre de la plantilla para filtrar (opcional)
 * @returns {Promise<{filePath: string, data: Array}>} - Objeto con la ruta del archivo CSV y los datos consolidados
 */
const exportarSoloCampanas = async (directorio, fechas = null, nombrePlantilla = null) => {
    console.log(`[exportarSoloCampanas] Iniciando exportación exclusiva de campañas`);
    console.log(`[exportarSoloCampanas] Directorio: ${directorio}`);
    console.log(`[exportarSoloCampanas] Fechas recibidas:`, fechas);
    console.log(`[exportarSoloCampanas] Nombre de plantilla filtro:`, nombrePlantilla);
    
    try {
        // 1. OBTENER TODOS LOS ARCHIVOS DE ATENCIÓN
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        console.log(`[exportarSoloCampanas] Carpeta reportes: ${carpetaReportes}`);
        
        if (!fs.existsSync(carpetaReportes)) {
            console.log(`[exportarSoloCampanas] Carpeta reportes no existe`);
            return { filePath: null, data: [] };
        }
        
        const archivos = fs.readdirSync(carpetaReportes);
        console.log(`[exportarSoloCampanas] Todos los archivos en reportes:`, archivos);
        
        // Filtrar solo archivos de atención
        const archivosAtencion = archivos.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
        console.log(`[exportarSoloCampanas] Archivos de atención encontrados:`, archivosAtencion);
        
        if (archivosAtencion.length === 0) {
            console.log(`[exportarSoloCampanas] No hay archivos de atención para procesar`);
            return { filePath: null, data: [] };
        }
        
        // 2. LEER Y PROCESAR SOLO ATENCIONES DE TIPO PLANTILLA
        let ticketsCampanas = [];
        
        for (const archivo of archivosAtencion) {
            const rutaArchivo = path.join(carpetaReportes, archivo);
            console.log(`[exportarSoloCampanas] Procesando archivo: ${rutaArchivo}`);
            
            try {
                const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
                const registros = parse(contenido, { columns: true, skip_empty_lines: true });
                console.log(`[exportarSoloCampanas] Registros leídos de ${archivo}: ${registros.length}`);
                
                if (registros.length === 0) continue;
                
                // Verificar si esta atención es de tipo PLANTILLA
                const primerTicket = registros[0];
                const atencionTipoBase = primerTicket.atencion_tipo_base || primerTicket.TIPO || 'BOT';
                
                console.log(`[exportarSoloCampanas] Atención ${archivo} - Tipo base: ${atencionTipoBase}`);
                
                // SOLO procesar si la atención es de tipo PLANTILLA
                if (atencionTipoBase === 'PLANTILLA') {
                    console.log(`[exportarSoloCampanas] ✅ Procesando atención PLANTILLA: ${archivo}`);
                    
                    // Incluir todos los tickets de esta atención (PLANTILLA y TRANSFERENCIA)
                    const ticketsAtencion = registros.filter(t => 
                        t.TIPO === 'PLANTILLA' || t.TIPO === 'TRANSFERENCIA'
                    );
                    
                    console.log(`[exportarSoloCampanas] Tickets PLANTILLA/TRANSFERENCIA en ${archivo}: ${ticketsAtencion.length}`);
                    ticketsCampanas.push(...ticketsAtencion);
                } else {
                    console.log(`[exportarSoloCampanas] ❌ Excluyendo atención BOT: ${archivo}`);
                }
                
            } catch (error) {
                console.error(`[exportarSoloCampanas] Error procesando archivo ${archivo}:`, error);
            }
        }
        
        console.log(`[exportarSoloCampanas] Total tickets de campañas encontrados: ${ticketsCampanas.length}`);
        
        if (ticketsCampanas.length === 0) {
            console.log(`[exportarSoloCampanas] No hay tickets de campañas para procesar`);
            return { filePath: null, data: [] };
        }
        
        // 3. APLICAR FILTROS
        let ticketsFiltrados = ticketsCampanas;
        
        // Filtro por fechas (atencion_fecha_cierre)
        if (fechas && fechas.fechaInicio && fechas.fechaFin) {
            const ticketsAntes = ticketsFiltrados.length;
            ticketsFiltrados = ticketsFiltrados.filter(t => fechaEnRango(t.atencion_fecha_cierre, fechas));
            console.log(`[exportarSoloCampanas] Tickets después del filtro de fechas: ${ticketsFiltrados.length} (antes: ${ticketsAntes})`);
        }
        
        // Filtro por nombre de plantilla
        if (nombrePlantilla) {
            const ticketsAntes = ticketsFiltrados.length;
            ticketsFiltrados = ticketsFiltrados.filter(t => t.plantilla_nombre === nombrePlantilla);
            console.log(`[exportarSoloCampanas] Tickets después del filtro de plantilla: ${ticketsFiltrados.length} (antes: ${ticketsAntes})`);
        }
        
        if (ticketsFiltrados.length === 0) {
            console.log(`[exportarSoloCampanas] No hay tickets después de aplicar filtros`);
            return { filePath: null, data: [] };
        }
        
        // 4. VERIFICAR QUE NO HAY TICKETS BOT
        const ticketsBot = ticketsFiltrados.filter(t => t.TIPO === 'BOT');
        if (ticketsBot.length > 0) {
            console.error(`[exportarSoloCampanas] ERROR: Se encontraron ${ticketsBot.length} tickets BOT en el resultado`);
            console.error(`[exportarSoloCampanas] Esto no debería pasar. Revisar lógica de filtrado.`);
        } else {
            console.log(`[exportarSoloCampanas] ✅ Verificación exitosa: No hay tickets BOT en el resultado`);
        }
        
        // 5. GENERAR CSV CON EL MISMO FORMATO QUE tickets_plantilla.csv
        const campos = [
            'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
            'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
            'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'primer_contacto', 'contacto', 'agente', 'duracion', 'TIPO',
            'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'cantidad_transferencias',
            'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total',
            'plantilla_id', 'plantilla_nombre', 'plantilla_contenido', 'plantilla_parametros', 'plantilla_campaignId', 'plantilla_campaignName', 'plantilla_fecha_envio',
            'contacto_identity', 'contacto_numero', 'usuario_respuesta', 'usuario_tipo_respuesta', 'usuario_contenido', 'usuario_fecha_respuesta',
            'ticket_generado', 'ticket_id', 'ticket_sequentialId', 'ticket_estado', 'ticket_fecha_cierre', 'ticket_tipo_cierre', 'ticket_agente', 'ticket_duracion'
        ];
        
        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse(ticketsFiltrados);
        
        // 6. GENERAR NOMBRE DE ARCHIVO Y GUARDAR
        const carpetaExportacionesCampanas = path.join(path.dirname(directorio), 'exportaciones', 'campanas');
        if (!fs.existsSync(carpetaExportacionesCampanas)) {
            fs.mkdirSync(carpetaExportacionesCampanas, { recursive: true });
        }
        
        const now = new Date();
        const nombreArchivo = `campanas_exclusivas_${now.toISOString().replace(/:/g, '_')}.csv`;
        const rutaCsv = path.join(carpetaExportacionesCampanas, nombreArchivo);
        
        fs.writeFileSync(rutaCsv, csv);
        console.log(`[exportarSoloCampanas] Archivo CSV generado: ${rutaCsv}`);
        console.log(`[exportarSoloCampanas] Total registros exportados: ${ticketsFiltrados.length}`);
        
        // 7. RESUMEN FINAL
        const tiposEnResultado = {};
        ticketsFiltrados.forEach(t => {
            tiposEnResultado[t.TIPO] = (tiposEnResultado[t.TIPO] || 0) + 1;
        });
        console.log(`[exportarSoloCampanas] Resumen final - Tipos exportados:`, tiposEnResultado);
        
        return { filePath: rutaCsv, data: ticketsFiltrados };
        
    } catch (error) {
        console.error(`[exportarSoloCampanas] Error:`, error);
        throw error;
    }
};

/**
 * Consolida los tickets BOT y PLANTILLA filtrando por correo de agente, fechas y nombre de plantilla
 * @param {string} directorio - Directorio base (usualmente 'data/tickets')
 * @param {string} correoAgente - Correo del agente a filtrar (obligatorio)
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar (opcional)
 * @param {string} nombrePlantilla - Nombre de la plantilla para filtrar (opcional)
 * @returns {Promise<{botPath: string|null, plantillaPath: string|null}>}
 */
const consolidarTicketsPorAgenteCsvs = async (directorio, correoAgente, fechas = null, nombrePlantilla = null) => {
    try {
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
            return { botPath: null, plantillaPath: null };
        }
        const archivos = fs.readdirSync(carpetaReportes);
        const archivosAtencion = archivos.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
        if (archivosAtencion.length === 0) {
            return { botPath: null, plantillaPath: null };
        }
        let todosLosTickets = [];
        for (const archivo of archivosAtencion) {
            const rutaArchivo = path.join(carpetaReportes, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const registros = parse(contenido, { columns: true, skip_empty_lines: true });
            todosLosTickets.push(...registros);
        }
        // Filtrar por correo de agente (en 'agente' o 'ticket_agente')
        todosLosTickets = todosLosTickets.filter(t =>
            (t.agente === correoAgente || t.ticket_agente === correoAgente)
        );
        // Filtrar por fechas si aplica
        if (fechas) {
            todosLosTickets = todosLosTickets.filter(t => fechaEnRango(t.atencion_fecha_cierre, fechas));
        }
        // Filtrar por nombre de plantilla si aplica
        if (nombrePlantilla) {
            todosLosTickets = todosLosTickets.filter(t => t.plantilla_nombre === nombrePlantilla);
        }
        // Separar tickets por tipo base
        const ticketsBot = [];
        const ticketsPlantilla = [];
        for (const ticket of todosLosTickets) {
            if (ticket.plantilla_id || ticket.plantilla_nombre) {
                ticketsPlantilla.push(ticket);
            } else {
                ticketsBot.push(ticket);
            }
        }
        // Crear carpeta de exportaciones de agentes
        const carpetaExportacionesAgentes = path.join(path.dirname(directorio), 'exportaciones', 'agentes');
        if (!fs.existsSync(carpetaExportacionesAgentes)) {
            fs.mkdirSync(carpetaExportacionesAgentes, { recursive: true });
        }
        
        // Generar CSV de tickets BOT
        let botPath = null;
        if (ticketsBot.length > 0) {
            const camposBot = [
                'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
                'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
                'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'primer_contacto', 'contacto', 'agente', 'duracion', 'TIPO',
                'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'cantidad_transferencias',
                'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total'
            ];
            const parserBot = new Parser({ fields: camposBot, header: true });
            const csvBot = parserBot.parse(ticketsBot);
            const nombreArchivoBot = `tickets_bot_${correoAgente.replace(/[@.]/g, '_')}.csv`;
            const rutaBot = path.join(carpetaExportacionesAgentes, nombreArchivoBot);
            fs.writeFileSync(rutaBot, csvBot);
            botPath = rutaBot;
        }
        // Generar CSV de tickets PLANTILLA
        let plantillaPath = null;
        if (ticketsPlantilla.length > 0) {
            const camposPlantilla = [
                'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
                'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
                'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'primer_contacto', 'contacto', 'agente', 'duracion', 'TIPO',
                'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'cantidad_transferencias',
                'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total',
                'plantilla_id', 'plantilla_nombre', 'plantilla_contenido', 'plantilla_parametros', 'plantilla_campaignId', 'plantilla_campaignName', 'plantilla_fecha_envio',
                'contacto_identity', 'contacto_numero', 'usuario_respuesta', 'usuario_tipo_respuesta', 'usuario_contenido', 'usuario_fecha_respuesta',
                'ticket_generado', 'ticket_id', 'ticket_sequentialId', 'ticket_estado', 'ticket_fecha_cierre', 'ticket_tipo_cierre', 'ticket_agente', 'ticket_duracion'
            ];
            const parserPlantilla = new Parser({ fields: camposPlantilla, header: true });
            const csvPlantilla = parserPlantilla.parse(ticketsPlantilla);
            const nombreArchivoPlantilla = `tickets_plantilla_${correoAgente.replace(/[@.]/g, '_')}.csv`;
            const rutaPlantilla = path.join(carpetaExportacionesAgentes, nombreArchivoPlantilla);
            fs.writeFileSync(rutaPlantilla, csvPlantilla);
            plantillaPath = rutaPlantilla;
        }
        return { botPath, plantillaPath };
    } catch (error) {
        console.error('[consolidarTicketsPorAgenteCsvs] Error:', error);
        throw error;
    }
};

/**
 * Obtiene la lista única de correos de agentes (agente y ticket_agente) de los archivos de atención
 * @param {string} directorio - Directorio base (usualmente 'data/tickets')
 * @returns {string[]} - Lista única de correos de agentes
 */
const obtenerAgentesUnicos = (directorio) => {
    const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
    if (!fs.existsSync(carpetaReportes)) return [];
    const archivos = fs.readdirSync(carpetaReportes);
    const archivosAtencion = archivos.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
    const agentesSet = new Set();
    for (const archivo of archivosAtencion) {
        const rutaArchivo = path.join(carpetaReportes, archivo);
        const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
        const registros = parse(contenido, { columns: true, skip_empty_lines: true });
        registros.forEach(t => {
            if (t.agente) agentesSet.add(t.agente);
            if (t.ticket_agente) agentesSet.add(t.ticket_agente);
        });
    }
    return Array.from(agentesSet).filter(Boolean).sort();
};

/**
 * Obtiene la lista única de nombres de plantillas de los archivos de atención
 * @param {string} directorio - Directorio base (usualmente 'data/tickets')
 * @returns {string[]} - Lista única de nombres de plantillas
 */
const obtenerPlantillasUnicas = (directorio) => {
    const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
    if (!fs.existsSync(carpetaReportes)) return [];
    const archivos = fs.readdirSync(carpetaReportes);
    const archivosAtencion = archivos.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
    const plantillasSet = new Set();
    for (const archivo of archivosAtencion) {
        const rutaArchivo = path.join(carpetaReportes, archivo);
        const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
        const registros = parse(contenido, { columns: true, skip_empty_lines: true });
        registros.forEach(t => {
            if (t.plantilla_nombre) plantillasSet.add(t.plantilla_nombre);
        });
    }
    return Array.from(plantillasSet).filter(Boolean).sort();
};

module.exports = {
    convertJsonToCsv,
    consolidarCsvs,
    flattenObject,
    consolidarTicketsCsvs,
    generarAtencionCompleta,
    procesarMensajes,
    procesarContactos,
    procesarEventos,
    procesarTickets,
    procesarPlantillas,
    consolidarCampanas,
    obtenerCampanasDisponibles,
    generarResumenDeCampanas,
    procesarTransferenciasTicketsV4,
    crearZipTickets,
    exportarCampanasDetallado,
    consolidarCampanasIndependiente,
    exportarSoloCampanas,
    consolidarTicketsPorAgenteCsvs,
    obtenerAgentesUnicos,
    obtenerPlantillasUnicas
}; 