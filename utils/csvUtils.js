const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

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
            if (!('fechaFiltro' in flat) && obj.fechaFiltro) {
                flat['fechaFiltro'] = obj.fechaFiltro;
            }
            return flat;
        });

        // Obtener todos los campos únicos de todos los objetos
        const fields = new Set();
        flattenedData.forEach(obj => {
            Object.keys(obj).forEach(key => fields.add(key));
        });

        // Convertir Set a Array y asegurarnos que fechaFiltro esté al final
        const fieldsArray = Array.from(fields);
        if (fieldsArray.includes('fechaFiltro')) {
            fieldsArray.splice(fieldsArray.indexOf('fechaFiltro'), 1);
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
    // fechaStr está en formato dd/mm/yyyy
    const [dia, mes, anio] = fechaStr.split('/');
    const fecha = new Date(`${anio}-${mes}-${dia}T00:00:00Z`);
    // fechas.inicio y fechas.fin son Date
    return fecha >= fechas.inicio && fecha <= fechas.fin;
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

        if (archivos.length === 0) {
            throw new Error('No hay archivos CSV para consolidar');
        }

        // Leer y combinar todos los archivos
        let datosCombinados = [];
        let encabezados = null;
        let datosFiltrados = false;

        for (const archivo of archivos) {
            const rutaArchivo = path.join(directorio, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const lineas = contenido.split('\n');
            
            // Obtener encabezados del primer archivo
            if (!encabezados) {
                encabezados = lineas[0];
                datosCombinados.push(encabezados);
            }
            
            // Procesar cada línea de datos
            for (let i = 1; i < lineas.length; i++) {
                const linea = lineas[i].trim();
                if (!linea) continue;

                // Si hay fechas para filtrar, verificar si la línea está en el rango
                if (fechas) {
                    // Buscar la columna 'fechaFiltro'
                    const columnas = encabezados.split(',').map(col => col.trim());
                    const fechaIndex = columnas.findIndex(col => col === 'fechaFiltro');

                    if (fechaIndex !== -1) {
                        // Parsear la línea CSV correctamente
                        const valores = linea.match(/(?:"[^"]*"|[^,])+/g).map(v => v.trim().replace(/^"|"$/g, ''));
                        
                        if (valores[fechaIndex] && !fechaEnRango(valores[fechaIndex], fechas)) {
                            continue; // Saltar esta línea si no está en el rango de fechas
                        }
                        datosFiltrados = true;
                    }
                }

                datosCombinados.push(linea);
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
        
        // Asegurarse de que la carpeta reportes existe
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
    flattenObject
}; 