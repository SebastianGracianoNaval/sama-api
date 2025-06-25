const fs = require('fs');
const path = require('path');

console.log('=== DEBUG PRODUCCIÓN ===');

// Verificar directorio actual
console.log('Directorio actual:', process.cwd());
console.log('__dirname:', __dirname);

// Verificar rutas absolutas
const carpetaTickets = path.join(__dirname, 'data', 'tickets');
const carpetaReportes = path.join(__dirname, 'data', 'reportes');

console.log('Carpeta tickets (absoluta):', carpetaTickets);
console.log('Carpeta reportes (absoluta):', carpetaReportes);

// Verificar existencia
console.log('¿Existe carpeta tickets?:', fs.existsSync(carpetaTickets));
console.log('¿Existe carpeta reportes?:', fs.existsSync(carpetaReportes));

// Verificar permisos
try {
    if (fs.existsSync(carpetaTickets)) {
        const stats = fs.statSync(carpetaTickets);
        console.log('Permisos carpeta tickets:', stats.mode);
        console.log('¿Es directorio tickets?:', stats.isDirectory());
    }
    
    if (fs.existsSync(carpetaReportes)) {
        const stats = fs.statSync(carpetaReportes);
        console.log('Permisos carpeta reportes:', stats.mode);
        console.log('¿Es directorio reportes?:', stats.isDirectory());
    }
} catch (error) {
    console.error('Error verificando permisos:', error);
}

// Listar contenido
try {
    if (fs.existsSync(carpetaTickets)) {
        const archivosTickets = fs.readdirSync(carpetaTickets);
        console.log('Archivos en tickets:', archivosTickets);
    }
    
    if (fs.existsSync(carpetaReportes)) {
        const archivosReportes = fs.readdirSync(carpetaReportes);
        console.log('Archivos en reportes:', archivosReportes);
        
        const archivosAtencion = archivosReportes.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
        console.log('Archivos de atención:', archivosAtencion);
        
        // Verificar contenido de un archivo de atención
        if (archivosAtencion.length > 0) {
            const primerArchivo = archivosAtencion[0];
            const rutaArchivo = path.join(carpetaReportes, primerArchivo);
            console.log('Verificando archivo:', rutaArchivo);
            
            try {
                const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
                const lineas = contenido.split('\n');
                console.log('Primeras 3 líneas del archivo:');
                lineas.slice(0, 3).forEach((linea, index) => {
                    console.log(`  ${index + 1}: ${linea.substring(0, 100)}...`);
                });
            } catch (error) {
                console.error('Error leyendo archivo:', error);
            }
        }
    }
} catch (error) {
    console.error('Error listando archivos:', error);
}

// Verificar variables de entorno
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

console.log('=== FIN DEBUG ==='); 