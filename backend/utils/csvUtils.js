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
    
    // Validar que la fecha tenga el formato correcto (yyyy-mm-dd)
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fechaStr.trim())) {
        console.log(`[fechaEnRango] Fecha inválida ignorada: '${fechaStr}'`);
        return false;
    }
    
    // Tomar solo la parte yyyy-mm-dd de cada fecha
    const fechaLimpia = fechaStr.trim();
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
const consolidarCsvsMejorado = async (directorio, tipo, fechas = null) => {
    const archivos = fs.readdirSync(directorio)
        .filter(archivo => archivo.endsWith('.csv') && !archivo.includes('consolidado'));
    
    if (archivos.length === 0) {
        console.log(`[consolidarCsvsMejorado] No hay archivos CSV de ${tipo} para consolidar`);
        return null;
    }
    
    console.log(`[consolidarCsvsMejorado] Archivos encontrados para ${tipo}:`, archivos);
    
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
        
        const columnas = encabezados.split(',').map(col => col.trim());
        const fechaIndex = columnas.findIndex(col => col === 'fechaFiltro');
        
        for (let i = 1; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (!linea) continue;
            
            if (fechas && fechaIndex !== -1) {
                try {
                    const valores = linea.match(/(?:\"[^\"]*\"|[^,])+/g).map(v => v.trim().replace(/^\"|\"$/g, ''));
                    const fecha = valores[fechaIndex];
                    
                    if (fechaEnRango(fecha, fechas)) {
                        incluidas++;
                        datosCombinados.push(linea);
                    } else {
                        descartadas++;
                    }
                } catch (error) {
                    console.warn(`[consolidarCsvsMejorado] Error procesando línea ${i}:`, error.message);
                    descartadas++;
                }
            } else {
                datosCombinados.push(linea);
                incluidas++;
            }
        }
    }
    
    console.log(`[consolidarCsvsMejorado] Total líneas incluidas: ${incluidas}, descartadas: ${descartadas}`);
    
    if (datosCombinados.length <= 1) {
        console.log('[consolidarCsvsMejorado] No hay datos después del filtrado.');
        return null;
    }
    
    // Usar un nombre único para cada tipo de archivo consolidado
    const now = new Date();
    const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
    const fecha = now.toISOString().slice(0,10);
    const nombreArchivo = `${tipo}_consolidado_${hora}_${fecha}.csv`;
    const rutaConsolidada = path.join(directorio, nombreArchivo);
    
    fs.writeFileSync(rutaConsolidada, datosCombinados.join('\n'));
    console.log(`[consolidarCsvsMejorado] Archivo consolidado generado: ${rutaConsolidada}`);
    
    return rutaConsolidada;
};

/**
 * Genera un archivo CSV individual para un ticket cerrado con estructura limpia
 * @param {Object} ticketInfo - Información del ticket cerrado
 * @param {string} directorio - Directorio base donde guardar el archivo
 * @returns {string} - Ruta del archivo generado
 */
const generarTicketIndividual = (ticketInfo, directorio) => {
    try {
        const ticket = ticketInfo.ticket;
        const seqId = ticket['content.sequentialId'];
        const contacto = ticketInfo.contacto;
        
        // Ordenar mensajes por fecha
        ticketInfo.mensajes.sort((a, b) => {
            const fa = new Date(a['metadata.#envelope.storageDate'] || a['storageDate'] || a['fechaFiltro'] || 0).getTime();
            const fb = new Date(b['metadata.#envelope.storageDate'] || b['storageDate'] || b['fechaFiltro'] || 0).getTime();
            return fa - fb;
        });

        // Crear conversación (solo una vez, sin duplicados)
        const mensajesUnicos = [];
        const mensajesVistos = new Set();
        
        for (const m of ticketInfo.mensajes) {
            const contenido = m.content || '';
            const fecha = m['metadata.#envelope.storageDate'] || m['storageDate'] || m['fechaFiltro'] || '';
            const clave = `${fecha}_${contenido}`;
            
            if (!mensajesVistos.has(clave)) {
                mensajesUnicos.push(m);
                mensajesVistos.add(clave);
            }
        }

        const conversacion = mensajesUnicos.map(m => {
            const fecha = m['metadata.#envelope.storageDate'] || m['storageDate'] || m['fechaFiltro'] || '';
            return `[${fecha}] ${m.content || ''}`;
        }).join('\n');

        // Preparar datos del ticket con estructura limpia
        const ticketData = {
            // Campos básicos del ticket
            id: ticket.id || '',
            sequentialId: ticket['content.sequentialId'] || '',
            status: ticket['content.status'] || '',
            team: ticket['content.team'] || '',
            unreadMessages: ticket['content.unreadMessages'] || '',
            
            // Campos de metadatos
            storageDate: ticket['metadata.#envelope.storageDate'] || ticket.storageDate || '',
            timestamp: ticket['metadata.#wa.timestamp'] || ticket.timestamp || '',
            
            // Campos de estado actualizados
            estadoTicket: 'cerrado',
            fechaCierre: ticketInfo.fechaCierre || '',
            
            // Campos de sistema
            fechaFiltro: obtenerFechaFiltro(ticket),
            tipoDato: 'ticket',
            procesadoEn: new Date().toISOString(),
            
            // Campo especial para tickets cerrados
            conversacion: conversacion,
            contacto: contacto
        };

        // Generar nombre del archivo con el formato ticket_{sequentialId}_{fecha}
        const fechaCierre = new Date(ticketInfo.fechaCierre || ticket.fechaFiltro);
        const fechaFormateada = fechaCierre.toISOString().slice(0, 10);
        const nombreArchivo = `ticket_${seqId}_${fechaFormateada}.csv`;
        
        // Crear carpeta de reportes si no existe
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
        }

        // Generar CSV con campos específicos para tickets cerrados
        const campos = [
            'id', 'sequentialId', 'status', 'team', 'unreadMessages',
            'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre',
            'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'contacto'
        ];
        
        const parser = new Parser({ fields: campos, header: true });
        const csv = parser.parse([ticketData]);

        const rutaArchivo = path.join(carpetaReportes, nombreArchivo);
        fs.writeFileSync(rutaArchivo, csv);
        
        console.log(`[generarTicketIndividual] Archivo generado: ${nombreArchivo} para contacto ${contacto}`);
        return rutaArchivo;
    } catch (error) {
        console.error('[generarTicketIndividual] Error:', error);
        throw error;
    }
};

/**
 * Consolida todos los archivos CSV individuales de tickets en uno solo
 * @param {string} directorio - Ruta del directorio que contiene los archivos CSV de tickets
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @returns {Promise<string>} - Ruta del archivo CSV consolidado
 */
const consolidarTicketsCsvs = async (directorio, fechas = null) => {
    try {
        // Buscar archivos CSV individuales de tickets en la carpeta de reportes
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            console.log('[consolidarTicketsCsvs] No existe carpeta de reportes');
            return null;
        }

        const archivos = fs.readdirSync(carpetaReportes)
            .filter(archivo => archivo.startsWith('ticket_') && archivo.endsWith('.csv'));
        
        console.log('[consolidarTicketsCsvs] Archivos de tickets encontrados:', archivos);
        
        if (archivos.length === 0) {
            console.log('[consolidarTicketsCsvs] No hay archivos de tickets para consolidar');
            return null;
        }

        let datosCombinados = [];
        let encabezados = null;
        let incluidas = 0;
        let descartadas = 0;

        for (const archivo of archivos) {
            const rutaArchivo = path.join(carpetaReportes, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const lineas = contenido.split('\n');
            
            if (!encabezados) {
                encabezados = lineas[0];
                datosCombinados.push(encabezados);
            }
            
            const columnas = encabezados.split(',').map(col => col.trim());
            const fechaIndex = columnas.findIndex(col => col === 'fechaCierre');
            
            for (let i = 1; i < lineas.length; i++) {
                const linea = lineas[i].trim();
                if (!linea) continue;
                
                if (fechas && fechaIndex !== -1) {
                    try {
                        const valores = linea.match(/(?:"[^"]*"|[^,])+/g).map(v => v.trim().replace(/^"|"$/g, ''));
                        const fecha = valores[fechaIndex];
                        
                        if (fechaEnRango(fecha, fechas)) {
                            incluidas++;
                            datosCombinados.push(linea);
                        } else {
                            descartadas++;
                        }
                    } catch (error) {
                        console.warn(`[consolidarTicketsCsvs] Error procesando línea ${i}:`, error.message);
                        descartadas++;
                    }
                } else {
                    datosCombinados.push(linea);
                    incluidas++;
                }
            }
        }

        console.log(`[consolidarTicketsCsvs] Total líneas incluidas: ${incluidas}, descartadas: ${descartadas}`);
        
        if (datosCombinados.length <= 1) {
            console.log('[consolidarTicketsCsvs] No hay datos después del filtrado.');
            return null;
        }

        // Generar archivo consolidado
        const now = new Date();
        const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
        const fecha = now.toISOString().slice(0,10);
        const nombreArchivo = `tickets_consolidado_${hora}_${fecha}.csv`;
        const rutaConsolidada = path.join(carpetaReportes, nombreArchivo);
        
        fs.writeFileSync(rutaConsolidada, datosCombinados.join('\n'));
        console.log('[consolidarTicketsCsvs] Archivo consolidado generado:', rutaConsolidada);
        
        return rutaConsolidada;
    } catch (error) {
        console.error('[consolidarTicketsCsvs] Error:', error);
        throw error;
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
            // Extraer solo campos relevantes de mensajes
            const mensajeLimpio = {
                // Campos básicos del mensaje
                id: mensaje.id || '',
                from: mensaje.from || '',
                to: mensaje.to || '',
                type: mensaje.type || '',
                content: mensaje.content || '',
                
                // Campos de metadatos
                storageDate: mensaje['metadata.#envelope.storageDate'] || mensaje.storageDate || '',
                timestamp: mensaje['metadata.#wa.timestamp'] || mensaje.timestamp || '',
                
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
            const eventoLimpio = {
                // Campos básicos del evento
                id: evento.id || '',
                category: evento.category || '',
                action: evento.action || '',
                from: evento.from || '',
                to: evento.to || '',
                
                // Campos de metadatos
                storageDate: evento['metadata.#envelope.storageDate'] || evento.storageDate || '',
                timestamp: evento['metadata.#wa.timestamp'] || evento.timestamp || '',
                
                // Campos específicos de eventos
                previousStateName: evento['extras.#previousStateName'] || '',
                previousStateId: evento['extras.#previousStateId'] || '',
                currentStateName: evento['extras.#currentStateName'] || '',
                currentStateId: evento['extras.#currentStateId'] || '',
                
                // Campos de sistema
                fechaFiltro: obtenerFechaFiltro(evento),
                tipoDato: 'evento',
                procesadoEn: new Date().toISOString()
            };
            
            return eventoLimpio;
        });

        const campos = [
            'id', 'category', 'action', 'from', 'to',
            'storageDate', 'timestamp', 'previousStateName', 'previousStateId',
            'currentStateName', 'currentStateId', 'fechaFiltro', 'tipoDato', 'procesadoEn'
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
 * @returns {Promise<string>} - Ruta del archivo generado
 */
const procesarTickets = async (jsonData, outputPath) => {
    try {
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        const ticketsProcesados = dataArray.map(ticket => {
            const ticketLimpio = {
                // Campos básicos del ticket
                id: ticket.id || '',
                sequentialId: ticket['content.sequentialId'] || '',
                status: ticket['content.status'] || '',
                team: ticket['content.team'] || '',
                unreadMessages: ticket['content.unreadMessages'] || '',
                
                // Campos de metadatos
                storageDate: ticket['metadata.#envelope.storageDate'] || ticket.storageDate || '',
                timestamp: ticket['metadata.#wa.timestamp'] || ticket.timestamp || '',
                
                // Campos de estado (se actualizarán cuando se cierre)
                estadoTicket: 'abierto',
                fechaCierre: '',
                
                // Campos de sistema
                fechaFiltro: obtenerFechaFiltro(ticket),
                tipoDato: 'ticket',
                procesadoEn: new Date().toISOString()
            };
            
            return ticketLimpio;
        });

        const campos = [
            'id', 'sequentialId', 'status', 'team', 'unreadMessages',
            'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre',
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
 * Obtiene la fecha de filtro de un objeto
 * @param {Object} obj - Objeto del webhook
 * @returns {string} - Fecha en formato YYYY-MM-DD
 */
const obtenerFechaFiltro = (obj) => {
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

module.exports = {
    convertJsonToCsv,
    consolidarCsvs,
    consolidarCsvsMejorado,
    flattenObject,
    consolidarTicketsCsvs,
    generarTicketIndividual,
    procesarMensajes,
    procesarContactos,
    procesarEventos,
    procesarTickets
}; 