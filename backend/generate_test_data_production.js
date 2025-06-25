const axios = require('axios');

const API_URL = 'https://sama-api-wppm.onrender.com';

async function generateTestDataProduction() {
    console.log('=== GENERANDO DATOS DE PRUEBA EN PRODUCCIÓN ===');
    
    try {
        // 1. Enviar un webhook de ticket de apertura
        console.log('1. Enviando webhook de ticket de apertura...');
        const ticketWebhook = {
            id: 'ticket_test_001',
            type: 'application/vnd.iris.ticket+json',
            from: '5491169007611@wa.gw.msging.net',
            to: 'bot@msging.net',
            content: {
                sequentialId: '001',
                parentSequentialId: null,
                status: 'open',
                team: 'default'
            },
            metadata: {
                '#envelope.storageDate': new Date().toISOString()
            }
        };
        
        const ticketResponse = await axios.post(`${API_URL}/webhook`, ticketWebhook);
        console.log('✅ Ticket webhook enviado:', ticketResponse.data);
        
        // 2. Enviar algunos mensajes
        console.log('2. Enviando mensajes...');
        const mensaje1 = {
            id: 'msg_001',
            type: 'text/plain',
            from: '5491169007611@wa.gw.msging.net',
            to: 'bot@msging.net',
            content: 'Hola, necesito ayuda',
            metadata: {
                '#envelope.storageDate': new Date().toISOString()
            }
        };
        
        const mensaje2 = {
            id: 'msg_002',
            type: 'text/plain',
            from: 'bot@msging.net',
            to: '5491169007611@wa.gw.msging.net',
            content: 'Hola, ¿en qué puedo ayudarte?',
            metadata: {
                '#envelope.storageDate': new Date().toISOString()
            }
        };
        
        await axios.post(`${API_URL}/webhook`, mensaje1);
        await axios.post(`${API_URL}/webhook`, mensaje2);
        console.log('✅ Mensajes enviados');
        
        // 3. Enviar evento de cierre de ticket
        console.log('3. Enviando evento de cierre de ticket...');
        const botEvent = {
            correoAgente: 'agente@test.com',
            ticketFinalizo: true,
            identity: '5491169007611@wa.gw.msging.net',
            tipoEvento: 'finalizacion_ticket',
            tipoCierre: 'resuelto'
        };
        
        const botResponse = await axios.post(`${API_URL}/api/bot-event`, botEvent);
        console.log('✅ Bot event enviado:', botResponse.data);
        
        // 4. Esperar un momento para que se procese
        console.log('4. Esperando 3 segundos para procesamiento...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 5. Probar el endpoint de tickets
        console.log('5. Probando endpoint de tickets...');
        const ticketsResponse = await axios.get(`${API_URL}/api/reportes/tickets`, {
            responseType: 'blob'
        });
        
        console.log('✅ Endpoint de tickets funciona!');
        console.log('Status:', ticketsResponse.status);
        console.log('Content-Type:', ticketsResponse.headers['content-type']);
        console.log('Content-Disposition:', ticketsResponse.headers['content-disposition']);
        console.log('Tamaño:', ticketsResponse.data.length, 'bytes');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            
            if (error.response.data instanceof Buffer) {
                const text = error.response.data.toString();
                console.error('Response text:', text);
            }
        }
    }
}

// Ejecutar el script
generateTestDataProduction(); 