const axios = require('axios');

const API_URL = 'https://sama-api-wppm.onrender.com';

async function testConsolidationProduction() {
    console.log('=== TEST CONSOLIDACIÓN EN PRODUCCIÓN ===');
    
    try {
        // 1. Verificar si hay archivos de atención
        console.log('1. Verificando archivos de atención...');
        
        // Intentar acceder a la ruta de debug (si está disponible)
        try {
            const debugResponse = await axios.get(`${API_URL}/api/debug/files`);
            console.log('✅ Debug info:', debugResponse.data);
        } catch (debugError) {
            console.log('⚠️ Ruta de debug no disponible, continuando...');
        }
        
        // 2. Verificar webhooks recientes
        console.log('2. Verificando webhooks recientes...');
        const webhooksResponse = await axios.get(`${API_URL}/webhook`);
        console.log('Webhooks recientes:', webhooksResponse.data.length);
        
        // Mostrar los últimos 3 webhooks
        const ultimosWebhooks = webhooksResponse.data.slice(-3);
        ultimosWebhooks.forEach((webhook, index) => {
            console.log(`  ${index + 1}. ${webhook.tipo} - ${webhook.fecha}`);
        });
        
        // 3. Verificar si hay archivos de tickets individuales
        console.log('3. Verificando archivos de tickets...');
        
        // Intentar descargar tickets individuales
        try {
            const ticketsResponse = await axios.get(`${API_URL}/descargar/tickets`, {
                responseType: 'blob'
            });
            console.log('✅ Archivos de tickets individuales disponibles');
            console.log('Tamaño:', ticketsResponse.data.length, 'bytes');
        } catch (ticketsError) {
            console.log('❌ No hay archivos de tickets individuales');
        }
        
        // 4. Verificar si hay archivos de eventos
        console.log('4. Verificando archivos de eventos...');
        try {
            const eventosResponse = await axios.get(`${API_URL}/descargar/eventos`, {
                responseType: 'blob'
            });
            console.log('✅ Archivos de eventos disponibles');
            console.log('Tamaño:', eventosResponse.data.length, 'bytes');
        } catch (eventosError) {
            console.log('❌ No hay archivos de eventos');
        }
        
        // 5. Verificar si hay archivos de mensajes
        console.log('5. Verificando archivos de mensajes...');
        try {
            const mensajesResponse = await axios.get(`${API_URL}/descargar/mensajes`, {
                responseType: 'blob'
            });
            console.log('✅ Archivos de mensajes disponibles');
            console.log('Tamaño:', mensajesResponse.data.length, 'bytes');
        } catch (mensajesError) {
            console.log('❌ No hay archivos de mensajes');
        }
        
        // 6. Intentar consolidar archivos manualmente
        console.log('6. Intentando consolidar archivos manualmente...');
        try {
            const consolidarResponse = await axios.post(`${API_URL}/consolidar/ticket`);
            console.log('✅ Consolidación manual exitosa:', consolidarResponse.data);
        } catch (consolidarError) {
            console.log('❌ Error en consolidación manual:', consolidarError.response?.data || consolidarError.message);
        }
        
    } catch (error) {
        console.error('❌ Error general:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

// Ejecutar el script
testConsolidationProduction(); 