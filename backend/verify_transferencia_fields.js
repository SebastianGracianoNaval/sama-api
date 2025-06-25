const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function verifyTransferenciaFields() {
    console.log('=== VERIFICANDO CAMPOS DE TRANSFERENCIA ===');
    
    try {
        const carpetaReportes = path.join(__dirname, 'data', 'reportes');
        const archivosAtencion = fs.readdirSync(carpetaReportes)
            .filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
        
        // Buscar el archivo de hoy (el más reciente)
        const archivoReciente = archivosAtencion.filter(a => a.includes('2025-06-25')).pop();
        if (!archivoReciente) {
            console.log('No se encontró archivo de atención para la fecha esperada.');
            return;
        }
        const rutaArchivo = path.join(carpetaReportes, archivoReciente);
        
        console.log(`Analizando archivo: ${archivoReciente}`);
        
        const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
        const registros = parse(contenido, { columns: true, skip_empty_lines: true });
        
        console.log(`Total registros: ${registros.length}`);
        
        registros.forEach((registro, index) => {
            if (registro.sequentialId === '208' || registro.sequentialId === '209') {
                console.log(`\n--- Registro ${index + 1} (sequentialId: ${registro.sequentialId}) ---`);
                console.log(`Transferencia: ${registro.transferencia}`);
                console.log(`Ticket_padre: ${registro.ticket_padre}`);
                console.log(`Ticket_hijo: ${registro.ticket_hijo}`);
                console.log(`Tipo_transferencia: ${registro.tipo_transferencia}`);
                console.log(`Agente_transferido: ${registro.agente_transferido}`);
                console.log(`Cola_transferida: ${registro.cola_transferida}`);
                console.log(`Historial_transferencias: ${registro.historial_transferencias}`);
                console.log(`Cantidad_transferencias: ${registro.cantidad_transferencias}`);
            }
        });
        
        // Verificar específicamente el comportamiento esperado
        const ticket208 = registros.find(r => r.sequentialId === '208');
        const ticket209 = registros.find(r => r.sequentialId === '209');
        
        if (ticket208) {
            console.log('\nTicket 208 (padre):');
            console.log(`  Transferencia: ${ticket208.transferencia} (esperado: TRUE)`);
        }
        
        if (ticket209) {
            console.log('\nTicket 209 (hijo/último):');
            console.log(`  Transferencia: ${ticket209.transferencia} (esperado: FALSE)`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    console.log('\n=== FIN VERIFICACIÓN ===');
}

// Ejecutar la verificación
verifyTransferenciaFields(); 