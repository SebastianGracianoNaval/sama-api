// Script para probar el flujo completo de plantillas
const axios = require('axios');

const API_URL = 'http://localhost:3000'; // Cambiar por tu URL de producción

// Simular el flujo completo de plantillas
async function testCompleteFlow() {
    try {
        console.log('=== PRUEBA DEL FLUJO COMPLETO DE PLANTILLAS ===\n');
        
        // 1. Simular webhook de plantilla enviada
        console.log('1. Simulando webhook de plantilla enviada...');
        const plantillaWebhook = {
            type: "application/json",
            content: {
                type: "template",
                template: {
                    language: { policy: "deterministic", code: "es" },
                    name: "bew_entrega_d__jsiqk",
                    components: [{
                        type: "body",
                        parameters: [
                            { text: "${contact.extras.0}", type: "text" },
                            { text: "${contact.extras.1}", type: "text" },
                            { text: "${contact.extras.2}", type: "text" },
                            { text: "${contact.extras.3}", type: "text" },
                            { text: "${contact.extras.4}", type: "text" },
                            { text: "${contact.extras.5}", type: "text" },
                            { text: "${contact.extras.6}", type: "text" }
                        ]
                    }]
                },
                templateContent: {
                    name: "bew_entrega_d__jsiqk",
                    language: "es",
                    components: [{
                        type: "BODY",
                        text: "¡Hola! 😊\\n\\nLe informamos que su pedido {{1}} de {{2}} para entregar a {{3}} en la dirección {{4}} se realizará el día {{5}} en el horario {{6}}.\\n\\nPuede realizar el seguimiento de su pedido en el siguiente enlace:\\n{{7}}\\n\\n¡Gracias!"
                    }]
                }
            },
            to: "5491169007611@wa.gw.msging.net",
            metadata: {
                "#activecampaign.flowId": "8f8786d0-b90a-4c96-ac47-446f146e3160",
                "#activecampaign.name": "Desk-Active-Campaing-bb26a335-164d-4d35-bda1-6ed83b854307",
                "#envelope.storageDate": "2025-06-22T05:20:26Z"
            }
        };
        
        await axios.post(`${API_URL}/webhook`, plantillaWebhook);
        console.log('✅ Webhook de plantilla procesado\n');
        
        // 2. Simular webhook de contacto con variables
        console.log('2. Simulando webhook de contacto con variables...');
        const contactoWebhook = {
            name: "Seba🤠",
            lastMessageDate: "2025-06-22T05:20:32.282Z",
            identity: "5491169007611@wa.gw.msging.net",
            phoneNumber: "+5491169007611",
            extras: {
                "0": "7576",
                "1": "GUCCI",
                "2": "Juan",
                "3": "JOSE 123",
                "4": "12",
                "5": "3",
                "6": "ejemplo.com",
                "campaignId": "8f8786d0-b90a-4c96-ac47-446f146e3160",
                "campaignMessageTemplate": "bew_entrega_d__jsiqk",
                "campaignOriginator": "sebastian@bewise.com.es"
            },
            source: "WhatsApp"
        };
        
        await axios.post(`${API_URL}/webhook`, contactoWebhook);
        console.log('✅ Webhook de contacto procesado\n');
        
        // 3. Simular webhook de respuesta del usuario
        console.log('3. Simulando webhook de respuesta del usuario...');
        const respuestaWebhook = {
            type: "text/plain",
            content: "hola",
            from: "5491169007611@wa.gw.msging.net",
            to: "prueba10@msging.net",
            metadata: {
                "#envelope.storageDate": "2025-06-22T05:27:47Z"
            }
        };
        
        await axios.post(`${API_URL}/webhook`, respuestaWebhook);
        console.log('✅ Webhook de respuesta procesado\n');
        
        // 4. Simular POST al endpoint campaign-event
        console.log('4. Simulando POST al endpoint campaign-event...');
        const campaignEventData = {
            agentePlantilla: "sebastian@bewise.com.es",
            identity: "5491169007611@wa.gw.msging.net",
            numeroTelefono: "5491169007611",
            esPlantilla: true,
            respuesta: "hola"
        };
        
        const campaignResponse = await axios.post(`${API_URL}/api/campaign-event`, campaignEventData, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Campaign event procesado:', campaignResponse.data);
        
        // 5. Simular webhook de ticket generado
        console.log('5. Simulando webhook de ticket generado...');
        const ticketWebhook = {
            type: "application/vnd.iris.ticket+json",
            content: {
                id: "6f3bc8b0-7515-47cb-a7b2-0197961b6724",
                sequentialId: 84,
                ownerIdentity: "garanteatencionhumana@msging.net",
                customerIdentity: "febc0ab0-258f-4080-8d40-561bec80e3ea@tunnel.msging.net",
                customerDomain: "wa.gw.msging.net",
                provider: "Lime",
                status: "Waiting",
                storageDate: "2025-06-22T05:27:47.748Z",
                externalId: "6f3bc8b0-7515-47cb-a7b2-0197961b6724",
                rating: 0,
                team: "Default",
                unreadMessages: 0,
                closed: false,
                customerInput: {
                    type: "text/plain",
                    value: "hola"
                },
                priority: 0,
                CampaignId: "8f8786d0-b90a-4c96-ac47-446f146e3160"
            },
            from: "5491169007611@wa.gw.msging.net",
            to: "prueba10@msging.net",
            metadata: {
                "#envelope.storageDate": "2025-06-22T05:27:47Z"
            }
        };
        
        await axios.post(`${API_URL}/webhook`, ticketWebhook);
        console.log('✅ Webhook de ticket procesado\n');
        
        console.log('=== FLUJO COMPLETO SIMULADO ===');
        console.log('✅ Todos los webhooks procesados correctamente');
        console.log('✅ El ticket debería ser identificado como PLANTILLA');
        console.log('✅ Los datos de campaña deberían estar disponibles');
        
    } catch (error) {
        console.error('❌ Error en el flujo:', error.response?.data || error.message);
    }
}

// Ejecutar la prueba
testCompleteFlow().catch(console.error); 