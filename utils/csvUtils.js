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
        // Crear el parser con las opciones por defecto
        const parser = new Parser();
        
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
 * Consolida todos los archivos CSV de un directorio en uno solo
 * @param {string} directorio - Ruta del directorio que contiene los archivos CSV
 * @param {string} tipo - Tipo de datos ('mensaje', 'evento', 'contacto')
 * @returns {Promise<string>} - Ruta del archivo CSV consolidado
 */
const consolidarCsvs = async (directorio, tipo) => {
    try {
        // Leer todos los archivos CSV del directorio
        const archivos = fs.readdirSync(directorio)
            .filter(archivo => archivo.endsWith('.csv'));

        if (archivos.length === 0) {
            throw new Error('No hay archivos CSV para consolidar');
        }

        // Leer y combinar todos los archivos
        let datosCombinados = [];
        for (const archivo of archivos) {
            const rutaArchivo = path.join(directorio, archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const lineas = contenido.split('\n');
            
            // Obtener encabezados del primer archivo
            if (datosCombinados.length === 0) {
                datosCombinados.push(lineas[0]);
            }
            
            // Agregar datos (excluyendo encabezados)
            datosCombinados.push(...lineas.slice(1));
        }

        // Eliminar líneas vacías y duplicados
        datosCombinados = [...new Set(datosCombinados)].filter(linea => linea.trim());

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