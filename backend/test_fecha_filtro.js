const { convertJsonToCsv } = require('./utils/csvUtils');
const fs = require('fs');
const path = require('path');

// Datos de prueba que simulan los webhooks de BLiP
const testData = [
    {
        type: 'text/plain',
        content: 'hola',
        id: 'wamid.HBgNNTQ5MTE2OTAwNzYxMRUCABIYFjNFQjAwNDc2MEE4QkNERkM3MTQxRkIA',
        from: '5491169007611@wa.gw.msging.net',
        to: 'prueba10@msging.net',
        metadata: {
            '#wa.timestamp': '1750215204',
            '#envelope.storageDate': '2025-06-18T02:53:25Z'
        },
        fechaFiltro: '2025-06-18'
    },
    {
        type: 'text/plain',
        content: '¡Hola de nuevo! 😃',
        id: 'baf7c9e7-f53b-467f-be4b-3b4bcf74716c',
        from: 'prueba10@msging.net/msging-application-router-hosting-start-58796df6fb-qqcrb',
        to: '5491169007611@wa.gw.msging.net',
        metadata: {
            '#wa.timestamp': '1750215207',
            '#envelope.storageDate': '2025-06-18T02:53:27Z'
        }
        // Sin fechaFiltro para probar la generación automática
    },
    {
        type: 'text/plain',
        content: 'test message',
        id: 'test-id-123',
        from: '1234567890@wa.gw.msging.net',
        to: 'test@msging.net',
        // Sin campos de fecha para probar el fallback
    }
];

async function testFechaFiltro() {
    console.log('🧪 Probando función de fechaFiltro...');
    
    try {
        // Crear directorio de prueba si no existe
        const testDir = path.join(__dirname, 'data', 'test');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        const outputPath = path.join(testDir, 'test_fecha_filtro.csv');
        
        // Convertir datos de prueba a CSV
        await convertJsonToCsv(testData, outputPath);
        
        // Leer el CSV generado para verificar el resultado
        const csvContent = fs.readFileSync(outputPath, 'utf-8');
        const lines = csvContent.split('\n');
        
        console.log('\n📄 CSV generado:');
        console.log(csvContent);
        
        // Verificar que todas las líneas tienen fechaFiltro válida
        const headerLine = lines[0];
        const columns = headerLine.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        const fechaFiltroIndex = columns.findIndex(col => col === 'fechaFiltro');
        
        if (fechaFiltroIndex === -1) {
            console.error('❌ No se encontró la columna fechaFiltro en el CSV');
            console.log('Columnas encontradas:', columns);
            return;
        }
        
        console.log(`\n✅ Columna fechaFiltro encontrada en índice: ${fechaFiltroIndex}`);
        
        // Verificar cada línea de datos
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].match(/(?:"[^"]*"|[^,])+/g).map(v => v.trim().replace(/^"|"$/g, ''));
            const fechaFiltro = values[fechaFiltroIndex];
            
            // Validar formato de fecha
            const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (fechaRegex.test(fechaFiltro)) {
                console.log(`✅ Línea ${i}: fechaFiltro válida = "${fechaFiltro}"`);
            } else {
                console.error(`❌ Línea ${i}: fechaFiltro inválida = "${fechaFiltro}"`);
            }
        }
        
        console.log('\n🎉 Prueba completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Ejecutar la prueba
testFechaFiltro(); 