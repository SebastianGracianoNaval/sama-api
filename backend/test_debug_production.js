const axios = require('axios');

const API_URL = 'https://sama-api-wppm.onrender.com'; // URL de producción

async function testDebugProduction() {
    try {
        console.log('=== TEST DEBUG PRODUCCIÓN ===');
        console.log('Probando ruta de debug...');
        
        const response = await axios.get(`${API_URL}/api/debug/files`);
        
        console.log('✅ Respuesta exitosa');
        console.log('Status:', response.status);
        console.log('Debug info:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ Error en debug:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

// Ejecutar el test
testDebugProduction(); 