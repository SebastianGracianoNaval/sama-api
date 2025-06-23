// Script de prueba para el endpoint /api/campaign-event
const axios = require('axios');

const API_URL = 'http://localhost:3000'; // Cambiar por tu URL de producción

// Ejemplo de datos para enviar al endpoint
const testData = {
    agentePlantilla: "sebastian@bewise.com.es",
    identity: "5491169007611@wa.gw.msging.net",
    numeroTelefono: "5491169007611",
    esPlantilla: true,
    respuesta: "hola, gracias por la información"
};

async function testCampaignEvent() {
    try {
        console.log('=== PRUEBA DEL ENDPOINT /api/campaign-event ===');
        console.log('Datos a enviar:', JSON.stringify(testData, null, 2));
        
        const response = await axios.post(`${API_URL}/api/campaign-event`, testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Respuesta exitosa:', response.data);
        
        if (response.data.success) {
            console.log('✅ Evento procesado correctamente');
            console.log('✅ ID del evento:', response.data.eventoId);
            console.log('✅ Contacto:', response.data.contacto);
            console.log('✅ Es plantilla:', response.data.esPlantilla);
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Headers:', error.response.headers);
        }
    }
}

// Ejecutar la prueba
testCampaignEvent().catch(console.error); 