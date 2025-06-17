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

        // Aplanar todos los objetos y asegurar que todos tengan fechaFiltro
        const flattenedData = dataArray.map(obj => {
            const flat = flattenObject(obj);
            // Forzar que fechaFiltro esté presente y al final
            flat['fechaFiltro'] = obj['fechaFiltro'] || '';
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
    // Tomar solo la parte yyyy-mm-dd de cada fecha
    const fechaLimpia = fechaStr.trim().slice(0, 10);
    const inicio = fechas.fechaInicio;
    const fin = fechas.fechaFin;
    const entra = (fechaLimpia >= inicio && fechaLimpia <= fin);
    // Debug
    console.log(`[fechaEnRango] fechaFiltro: '${fechaLimpia}', inicio: '${inicio}', fin: '${fin}', entra: ${entra}`);
    return entra;
};

/**
 * Consolida todos los archivos CSV de un directorio en uno solo
 * @param {string} directorio - Ruta del directorio que contiene los archivos CSV
 * @param {string} tipo - Tipo de datos ('mensaje', 'evento', 'contacto')
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @returns {Promise<string>} - Ruta del archivo CSV consolidado
 */
const consolidarCsvs = async (directorio, tipo, fechas = null) => {
    try {
        // Leer todos los archivos CSV del directorio
        const archivos = fs.readdirSync(directorio)
            .filter(archivo => archivo.endsWith('.csv'));

        console.log('Archivos encontrados:', archivos);

        if (archivos.length === 0) {
            throw new Error('No hay archivos CSV para consolidar');
        }

        let datosCombinados = [];
        let encabezados = null;
        let datosFiltrados = false;

        for (const archivo of archivos) {
            console.log('Procesando archivo:', archivo);
            const rutaArchivo = path.join(directorio, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            // Parsear el CSV usando csv-parse
            const records = parse(contenido, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
                relax_quotes: true
            });
            // Guardar encabezados solo una vez
            if (!encabezados) {
                encabezados = Object.keys(records[0] || {}).join(',');
                datosCombinados.push(encabezados);
                console.log('Encabezados:', encabezados);
            }
            for (const row of records) {
                if (fechas && fechas.fechaInicio && fechas.fechaFin) {
                    if (row.fechaFiltro && fechaEnRango(row.fechaFiltro, fechas)) {
                        datosFiltrados = true;
                        // Convertir el objeto a línea CSV respetando el orden de encabezados
                        const linea = Object.values(encabezados.split(',').map(col => row[col] !== undefined ? row[col] : '')).join(',');
                        datosCombinados.push(linea);
                    }
                } else {
                    const linea = Object.values(encabezados.split(',').map(col => row[col] !== undefined ? row[col] : '')).join(',');
                    datosCombinados.push(linea);
                }
            }
        }

        // Si no hay datos después del filtrado, lanzar error
        if (datosCombinados.length <= 1) {
            throw new Error('No hay datos para el período especificado');
        }

        // Si hay fechas pero no se encontraron datos en ese rango
        if (fechas && !datosFiltrados) {
            throw new Error('No hay datos para el período especificado');
        }

        // Eliminar líneas duplicadas
        datosCombinados = [...new Set(datosCombinados)];

        // Crear archivo consolidado en la carpeta reportes
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
        }
        const rutaConsolidada = path.join(carpetaReportes, `${tipo}-consolidado-${timestamp}.csv`);
        fs.writeFileSync(rutaConsolidada, datosCombinados.join('\n'));
        return rutaConsolidada;
    } catch (error) {
        throw error; // Propagar el error para manejarlo en el controlador
    }
};

/**
 * Consolida todos los archivos CSV de tickets en uno solo, deduplicando por sequentialId
 * @param {string} directorio - Ruta del directorio que contiene los archivos CSV de tickets
 * @param {Object} fechas - Objeto con fechas de inicio y fin para filtrar
 * @returns {Promise<string>} - Ruta del archivo CSV consolidado
 */
const consolidarTicketsCsvs = async (directorio, fechas = null) => {
    try {
        const archivos = fs.readdirSync(directorio)
            .filter(archivo => archivo.endsWith('.csv'));
        console.log('[consolidarTicketsCsvs] Archivos encontrados:', archivos);
        if (archivos.length === 0) {
            throw new Error('No hay archivos CSV para consolidar');
        }

        // Leer eventos y mensajes para asociar cierres y conversación
        const eventosDir = path.join(path.dirname(directorio), 'eventos');
        const mensajesDir = path.join(path.dirname(directorio), 'mensajes');
        const eventos = [];
        const mensajes = [];

        if (fs.existsSync(eventosDir)) {
            const archivosEventos = fs.readdirSync(eventosDir).filter(archivo => archivo.endsWith('.csv'));
            for (const archivo of archivosEventos) {
                const contenido = fs.readFileSync(path.join(eventosDir, archivo), 'utf-8');
                const records = parse(contenido, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                    relax_column_count: true,
                    relax_quotes: true
                });
                eventos.push(...records);
            }
        }

        if (fs.existsSync(mensajesDir)) {
            const archivosMensajes = fs.readdirSync(mensajesDir).filter(archivo => archivo.endsWith('.csv'));
            for (const archivo of archivosMensajes) {
                const contenido = fs.readFileSync(path.join(mensajesDir, archivo), 'utf-8');
                const records = parse(contenido, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                    relax_column_count: true,
                    relax_quotes: true
                });
                mensajes.push(...records);
            }
        }

        // Mapa para mantener tickets abiertos por contacto
        const ticketsAbiertos = new Map();
        let totalProcesados = 0, totalCerrados = 0, totalDescartados = 0;

        // Función para extraer el número de teléfono del contacto
        const extraerContacto = (row) => {
            // Buscar en from, to e identity
            const campos = [
                row['from'],
                row['to'],
                row['identity']
            ].filter(Boolean);

            for (const campo of campos) {
                if (campo.endsWith('@wa.gw.msging.net')) {
                    const numero = campo.split('@')[0];
                    // Verificar que sea un número de teléfono (solo dígitos)
                    if (/^\d+$/.test(numero)) {
                        console.log(`[consolidarTicketsCsvs] Contacto encontrado: ${numero} en campo ${campo}`);
                        return numero;
                    }
                }
            }
            return null;
        };

        // Procesar tickets
        for (const archivo of archivos) {
            const rutaArchivo = path.join(directorio, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const records = parse(contenido, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
                relax_quotes: true
            });

            for (const row of records) {
                totalProcesados++;
                const seqId = row['content.sequentialId'];
                const tipo = row['type'];
                const contacto = extraerContacto(row);

                if (!contacto) {
                    totalDescartados++;
                    console.warn(`[consolidarTicketsCsvs] Ticket descartado por falta de contacto:`, row);
                    continue;
                }

                // Solo crear ticket si es de tipo ticket
                if (tipo === 'application/vnd.iris.ticket+json') {
                    if (!ticketsAbiertos.has(contacto)) {
                        ticketsAbiertos.set(contacto, {
                            ticket: row,
                            mensajes: [],
                            eventos: [],
                            cerrado: false,
                            fechaCierre: null
                        });
                        console.log(`[consolidarTicketsCsvs] Nuevo ticket abierto para contacto ${contacto}`);
                    }
                }

                // Si ya existe un ticket para este contacto, agregar mensajes
                const ticketInfo = ticketsAbiertos.get(contacto);
                if (ticketInfo && !ticketInfo.cerrado) {
                    // Buscar eventos de cierre para este contacto
                    const eventosCierre = eventos.filter(e => {
                        const eContacto = extraerContacto(e);
                        if (!eContacto) return false;

                        const prevName = (e['extras.#previousStateName'] || '').toLowerCase();
                        const prevId = e['extras.#previousStateId'] || '';
                        const action = (e['action'] || '').toLowerCase();

                        return eContacto === contacto && (
                            prevName.includes('atendimento humano') ||
                            prevName.includes('atencion humana') ||
                            prevId.startsWith('desk') ||
                            action.includes('encuesta')
                        );
                    });

                    // Si encontramos un evento de cierre, marcar el ticket como cerrado
                    if (eventosCierre.length > 0 && !ticketInfo.cerrado) {
                        ticketInfo.cerrado = true;
                        ticketInfo.fechaCierre = eventosCierre[0]['storageDate'] || eventosCierre[0]['fechaFiltro'];
                        console.log(`===================TICKET CERRADO [${seqId}] para contacto [${contacto}]================`);
                    }

                    // Acumular mensajes relacionados con este ticket
                    const mensajesTicket = mensajes.filter(m => {
                        const contactoMsg = extraerContacto(m);
                        return contactoMsg === contacto;
                    });

                    ticketInfo.mensajes = [...new Set([...ticketInfo.mensajes, ...mensajesTicket])];
                    ticketInfo.eventos = [...new Set([...ticketInfo.eventos, ...eventosCierre])];
                }
            }
        }

        // Procesar tickets cerrados
        const ticketsCerrados = [];
        for (const [contacto, ticketInfo] of ticketsAbiertos) {
            if (ticketInfo.cerrado) {
                const ticket = ticketInfo.ticket;
                ticket.cerrado = true;
                ticket.fechaCierre = ticketInfo.fechaCierre;

                // Ordenar mensajes por fecha
                ticketInfo.mensajes.sort((a, b) => {
                    const fa = new Date(a['metadata.#envelope.storageDate'] || a['storageDate'] || a['fechaFiltro'] || 0).getTime();
                    const fb = new Date(b['metadata.#envelope.storageDate'] || b['storageDate'] || b['fechaFiltro'] || 0).getTime();
                    return fa - fb;
                });

                // Crear conversación
                const conversacion = ticketInfo.mensajes.map(m => {
                    const fecha = m['metadata.#envelope.storageDate'] || m['storageDate'] || m['fechaFiltro'] || '';
                    return `[${fecha}] ${m.content || ''}`;
                }).join('\n');
                ticket.conversacion = conversacion;

                // Filtrar por fecha si corresponde
                const fechaParaFiltro = ticket.fechaCierre || ticket.fechaFiltro;
                if (fechas && fechas.fechaInicio && fechas.fechaFin) {
                    if (!fechaParaFiltro || !fechaEnRango(fechaParaFiltro, fechas)) {
                        totalDescartados++;
                        console.log(`[consolidarTicketsCsvs] Ticket ${ticket['content.sequentialId']} descartado por fecha fuera de rango (${fechaParaFiltro}).`);
                        continue;
                    }
                }

                ticketsCerrados.push(ticket);
                totalCerrados++;
            }
        }

        console.log(`[consolidarTicketsCsvs] Total procesados: ${totalProcesados}, cerrados exportados: ${ticketsCerrados.length}, descartados: ${totalDescartados}`);
        if (ticketsCerrados.length === 0) {
            console.log('[consolidarTicketsCsvs] No hay tickets cerrados para exportar.');
            return null;
        }

        // Crear CSV
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
        }

        const encabezados = Object.keys(ticketsCerrados[0]);
        const encabezadosFinal = [...encabezados.filter(e => e !== 'conversacion'), 'conversacion'];
        const csvLines = [encabezadosFinal.join(',')];
        
        for (const t of ticketsCerrados) {
            const line = encabezadosFinal.map(col => t[col] !== undefined ? (`"${String(t[col]).replace(/"/g, '""')}"`) : '').join(',');
            csvLines.push(line);
        }

        const rutaConsolidada = path.join(carpetaReportes, `ticket-consolidado-${timestamp}.csv`);
        fs.writeFileSync(rutaConsolidada, csvLines.join('\n'));
        console.log('[consolidarTicketsCsvs] Archivo consolidado generado en:', rutaConsolidada);
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

module.exports = {
    convertJsonToCsv,
    consolidarCsvs,
    flattenObject,
    consolidarTicketsCsvs
}; 