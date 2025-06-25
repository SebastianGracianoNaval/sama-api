const fs = require('fs');
const path = require('path');
const { consolidarTicketsCsvs, crearZipTickets } = require('./utils/csvUtils');

async function testTicketsEndpoint() {
    console.log('=== TEST TICKETS ENDPOINT ===');
    
    try {
        // Simular exactamente lo que hace el endpoint
        const tipo = 'tickets';
        const fechaInicio = '';
        const fechaFin = '';
        const nombrePlantilla = undefined;
        
        console.log(`[Test] Generando reporte de tipo: ${tipo}`);
        console.log(`[Test] Filtros - Inicio: ${fechaInicio}, Fin: ${fechaFin}, Plantilla: ${nombrePlantilla}`);
        
        // Validar fechas (código del endpoint)
        if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
            console.log('[Test] Error: Debe seleccionar ambas fechas para filtrar.');
            return;
        }
        if (fechaInicio && fechaFin) {
            if (fechaInicio > fechaFin) {
                console.log('[Test] Error: La fecha de inicio no puede ser posterior a la fecha fin.');
                return;
            }
            const hoy = new Date().toISOString().slice(0, 10);
            if (fechaInicio > hoy || fechaFin > hoy) {
                console.log('[Test] Error: No se pueden seleccionar fechas futuras.');
                return;
            }
        }
        
        // Lógica especial para tickets
        if (tipo === 'tickets') {
            console.log('[Test] Procesando consolidación de tickets');
            
            const carpeta = path.join(__dirname, 'data', 'tickets');
            console.log(`[Test] Carpeta de tickets: ${carpeta}`);
            console.log(`[Test] ¿Existe carpeta?: ${fs.existsSync(carpeta)}`);
            
            if (!fs.existsSync(carpeta)) {
                console.log(`[Test] Error: No se encontró el directorio de tickets.`);
                return;
            }
            
            // Verificar contenido de la carpeta tickets
            const archivosTickets = fs.readdirSync(carpeta);
            console.log(`[Test] Archivos en carpeta tickets:`, archivosTickets);
            
            // Verificar carpeta reportes
            const carpetaReportes = path.join(path.dirname(carpeta), 'reportes');
            console.log(`[Test] Carpeta reportes: ${carpetaReportes}`);
            console.log(`[Test] ¿Existe carpeta reportes?: ${fs.existsSync(carpetaReportes)}`);
            
            if (fs.existsSync(carpetaReportes)) {
                const archivosReportes = fs.readdirSync(carpetaReportes);
                console.log(`[Test] Archivos en carpeta reportes:`, archivosReportes);
                
                // Buscar archivos de atención específicamente
                const archivosAtencion = archivosReportes.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
                console.log(`[Test] Archivos de atención encontrados:`, archivosAtencion);
            }
            
            const fechas = (fechaInicio && fechaFin) ? { fechaInicio, fechaFin } : null;
            console.log(`[Test] Fechas para filtrado:`, fechas);
            
            // Consolidar tickets en dos archivos separados
            console.log(`[Test] Llamando a consolidarTicketsCsvs...`);
            const { botPath, plantillaPath } = await consolidarTicketsCsvs(carpeta, fechas);
            console.log(`[Test] Resultado consolidarTicketsCsvs - botPath: ${botPath}, plantillaPath: ${plantillaPath}`);
            
            if (!botPath && !plantillaPath) {
                console.log(`[Test] Error: No hay datos de tickets para exportar.`);
                return;
            }
            
            // Crear ZIP con los dos archivos
            console.log(`[Test] Creando ZIP con archivos...`);
            const zipPath = await crearZipTickets(botPath, plantillaPath, carpeta);
            console.log(`[Test] ZIP creado en: ${zipPath}`);
            
            console.log(`[Test] ✅ ÉXITO: Proceso completado correctamente`);
        }
        
    } catch (error) {
        console.error('[Test] Error:', error);
    }
    
    console.log('=== FIN TEST ===');
}

// Ejecutar el test
testTicketsEndpoint().catch(console.error); 