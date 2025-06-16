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

        let ticketsPorId = {};
        let encabezados = null;
        let totalProcesados = 0, totalCerrados = 0, totalDescartados = 0;

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
            if (!encabezados && records.length > 0) {
                encabezados = Object.keys(records[0] || {});
            }

            for (const row of records) {
                totalProcesados++;
                const seqId = row['content.sequentialId'];
                const contacto = (row['content.customerIdentity'] || row['from'] || '').split('@')[0];
                if (!seqId || !contacto) {
                    totalDescartados++;
                    console.warn(`[consolidarTicketsCsvs] Ticket descartado por falta de sequentialId/contacto:`, row);
                    continue;
                }

                // Buscar eventos y mensajes relacionados para cierre
                const eventosRelacionados = eventos.filter(e => 
                    e['identity']?.split('@')[0] === contacto &&
                    (e['extras.#previousStateName']?.toLowerCase().includes('atencion humana') ||
                     e['extras.#stateName'] === '4.0 - Encuesta')
                );
                const mensajesRelacionadosCierre = mensajes.filter(m => 
                    (m['to']?.split('@')[0] === contacto || m['from']?.split('@')[0] === contacto) &&
                    (m.content?.toLowerCase().includes('finalizo el ticket') ||
                     m['metadata.#stateName'] === '4.0 - Encuesta')
                );

                // Si hay eventos o mensajes de cierre, marcar el ticket como cerrado
                if (eventosRelacionados.length > 0 || mensajesRelacionadosCierre.length > 0) {
                    row.cerrado = true;
                    const fechaCierre = eventosRelacionados[0]?.storageDate || 
                                      mensajesRelacionadosCierre[0]?.['metadata.#envelope.storageDate'] ||
                                      row['content.storageDate'];
                    row.fechaCierre = fechaCierre;
                }

                // Filtrar por fecha si corresponde (usar fechaCierre si existe, sino fechaFiltro)
                const fechaParaFiltro = row.fechaCierre || row.fechaFiltro;
                if (fechas && fechas.fechaInicio && fechas.fechaFin) {
                    if (!fechaParaFiltro || !fechaEnRango(fechaParaFiltro, fechas)) {
                        totalDescartados++;
                        console.log(`[consolidarTicketsCsvs] Ticket ${seqId} descartado por fecha fuera de rango (${fechaParaFiltro}).`);
                        continue;
                    }
                }

                // Buscar mensajes de la conversación del ticket
                // Filtrar mensajes por contacto y por rango de fechas del ticket
                let fechaInicioTicket = row['content.storageDate'] || row.fechaFiltro;
                let fechaFinTicket = row.fechaCierre || row.fechaFiltro;
                const mensajesConversacion = mensajes.filter(m => {
                    const contactoMsg = (m['to']?.split('@')[0] === contacto || m['from']?.split('@')[0] === contacto);
                    let fechaMsg = m['metadata.#envelope.storageDate'] || m['storageDate'] || m['fechaFiltro'];
                    if (!fechaMsg) return false;
                    // Normalizar a formato ISO si es posible
                    fechaMsg = fechaMsg.length > 10 ? fechaMsg : fechaMsg + 'T00:00:00Z';
                    return contactoMsg && fechaMsg >= fechaInicioTicket && fechaMsg <= fechaFinTicket;
                });
                // Ordenar mensajes por fecha
                mensajesConversacion.sort((a, b) => {
                    const fa = new Date(a['metadata.#envelope.storageDate'] || a['storageDate'] || a['fechaFiltro'] || 0).getTime();
                    const fb = new Date(b['metadata.#envelope.storageDate'] || b['storageDate'] || b['fechaFiltro'] || 0).getTime();
                    return fa - fb;
                });
                // Concatenar mensajes con fecha/hora
                const conversacion = mensajesConversacion.map(m => {
                    const fecha = m['metadata.#envelope.storageDate'] || m['storageDate'] || m['fechaFiltro'] || '';
                    return `[${fecha}] ${m.content || ''}`;
                }).join('\n');
                row.conversacion = conversacion;

                // Guardar solo el último ticket por sequentialId
                const prev = ticketsPorId[seqId];
                const fechaActual = new Date(row.fechaCierre || row['content.storageDate'] || row.fechaFiltro || 0).getTime();
                const fechaPrev = prev ? new Date(prev.fechaCierre || prev['content.storageDate'] || prev.fechaFiltro || 0).getTime() : 0;
                if (!prev || fechaActual > fechaPrev) {
                    ticketsPorId[seqId] = row;
                    totalCerrados++;
                }
            }
        }

        const tickets = Object.values(ticketsPorId);
        console.log(`[consolidarTicketsCsvs] Total procesados: ${totalProcesados}, cerrados exportados: ${tickets.length}, descartados: ${totalDescartados}`);
        if (tickets.length === 0) {
            throw new Error('No hay datos para el período especificado');
        }

        // Crear CSV
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
        }
        // Asegurar que la columna conversacion esté al final
        const encabezadosFinal = [...encabezados.filter(e => e !== 'conversacion'), 'conversacion'];
        const csvLines = [encabezadosFinal.join(',')];
        for (const t of tickets) {
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