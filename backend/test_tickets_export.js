// Script para probar la exportación de tickets sin filtros
const axios = require('axios');

const API_URL = 'http://localhost:3000'; // Cambiar por tu URL de producción

async function testTicketsExport() {
    try {
        console.log('=== PRUEBA DE EXPORTACIÓN DE TICKETS SIN FILTROS ===');
        
        // Probar exportación de tickets sin filtros
        const response = await axios.get(`${API_URL}/descargar/tickets`, {
            responseType: 'blob'
        });
        
        console.log('✅ Respuesta exitosa');
        console.log('✅ Content-Type:', response.headers['content-type']);
        console.log('✅ Content-Disposition:', response.headers['content-disposition']);
        console.log('✅ Tamaño de respuesta:', response.data.length, 'bytes');
        
        // Guardar el archivo para inspección
        const fs = require('fs');
        const testFileName = `test_tickets_export_${Date.now()}.zip`;
        fs.writeFileSync(testFileName, response.data);
        console.log(`✅ Archivo guardado como: ${testFileName}`);
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Headers:', error.response.headers);
            
            // Si es un error JSON, mostrar el mensaje
            if (error.response.headers['content-type']?.includes('application/json')) {
                const errorText = error.response.data.toString();
                try {
                    const errorJson = JSON.parse(errorText);
                    console.error('❌ Error JSON:', errorJson);
                } catch {
                    console.error('❌ Error text:', errorText);
                }
            }
        }
    }
}

// Ejecutar la prueba
testTicketsExport().catch(console.error); 