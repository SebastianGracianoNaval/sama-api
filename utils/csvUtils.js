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
        // Obtener todos los campos únicos de todos los objetos
        const fields = new Set();
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        dataArray.forEach(obj => {
            Object.keys(obj).forEach(key => fields.add(key));
        });

        // Crear el parser con los campos explícitos
        const parser = new Parser({
            fields: Array.from(fields)
        });
        
        // Convertir el JSON a CSV
        const csv = parser.parse(jsonData);
        
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
    // Extraer solo la parte de fecha (yyyy-mm-dd) del campo fechaFiltro
    const soloFecha = fechaStr.slice(0, 10); // yyyy-mm-dd
    const inicio = fechas.inicio.toISOString().slice(0, 10);
    const fin = fechas.fin.toISOString().slice(0, 10);
    return soloFecha >= inicio && soloFecha <= fin;
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
            return null; // No hay archivos para consolidar
        }

        // Leer y combinar todos los archivos
        let datosCombinados = [];
        let encabezados = null;

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
                    // Buscar la columna 'fechaFiltro' exactamente
                    const columnas = encabezados.split(',');
                    const fechaIndex = columnas.findIndex(col => col.trim() === 'fechaFiltro');

                    if (fechaIndex !== -1) {
                        // Soportar comas dentro de comillas
                        const valores = linea.match(/\s*("[^"]*"|[^,]*)\s*/g).map(v => v.replace(/^\s*|\s*$/g, ''));
                        if (valores[fechaIndex] && !fechaEnRango(valores[fechaIndex].replace(/"/g, ''), fechas)) {
                            continue; // Saltar esta línea si no está en el rango de fechas
                        }
                    }
                }

                datosCombinados.push(linea);
            }
        }

        // Si no hay datos después del filtrado, retornar null
        if (datosCombinados.length <= 1) {
            return null;
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
        throw new Error(`Error al consolidar archivos CSV: ${error.message}`);
    }
};

module.exports = {
    convertJsonToCsv,
    consolidarCsvs
}; 