const axios = require('axios');

async function testRoute() {
    try {
        console.log('🧪 Probando ruta de tickets...');
        
        const response = await axios.get('http://localhost:3000/api/reportes/tickets', {
            responseType: 'blob'
        });
        
        console.log('✅ Respuesta exitosa');
        console.log('Content-Type:', response.headers['content-type']);
        console.log('Content-Disposition:', response.headers['content-disposition']);
        console.log('Tamaño:', response.data.length, 'bytes');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data);
        if (error.response?.data) {
            const text = await error.response.data.text();
            console.error('Mensaje:', text);
        }
    }
}

testRoute(); 