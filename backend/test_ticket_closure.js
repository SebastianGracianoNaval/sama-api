const fs = require('fs');
const path = require('path');
const { generarAtencionCompleta } = require('./utils/csvUtils');

async function testTicketClosure() {
    console.log('=== TEST CIERRE DE TICKET ===');
    
    try {
        // Simular una atención completa como la que debería generarse
        const atencionPrueba = {
            contacto: '5491169007611',
            tipoBase: 'BOT',
            fechaApertura: '2025-06-25T20:14:27.000Z',
            fechaCierre: '2025-06-25T20:14:28.000Z',
            duracionTotal: '0d 0h 0m 1s',
            tickets: [
                {
                    ticket: {
                        id: 'ticket_test_001',
                        content: {
                            sequentialId: '001',
                            parentSequentialId: null,
                            status: 'closed',
                            team: 'default'
                        },
                        metadata: {
                            '#envelope.storageDate': '2025-06-25T20:14:27.000Z'
                        }
                    },
                    mensajes: [
                        {
                            from: '5491169007611@wa.gw.msging.net',
                            to: 'bot@msging.net',
                            content: 'Hola, necesito ayuda',
                            'metadata.#envelope.storageDate': '2025-06-25T20:14:27.000Z'
                        },
                        {
                            from: 'bot@msging.net',
                            to: '5491169007611@wa.gw.msging.net',
                            content: 'Hola, ¿en qué puedo ayudarte?',
                            'metadata.#envelope.storageDate': '2025-06-25T20:14:28.000Z'
                        }
                    ],
                    cerrado: true,
                    fechaCierre: '2025-06-25T20:14:28.000Z',
                    fechaApertura: '2025-06-25T20:14:27.000Z',
                    contacto: '5491169007611',
                    tipo: 'BOT',
                    campaignDetails: null,
                    sequentialId: '001',
                    parentSequentialId: null,
                    team: 'default',
                    agentIdentity: '',
                    correoAgente: 'agente@test.com',
                    tipoCierre: 'resuelto',
                    duracion: '0d 0h 0m 1s'
                }
            ]
        };
        
        console.log('1. Verificando estructura de directorios...');
        const carpetaTickets = path.join(__dirname, 'data', 'tickets');
        const carpetaReportes = path.join(__dirname, 'data', 'reportes');
        
        console.log('Carpeta tickets:', carpetaTickets);
        console.log('¿Existe carpeta tickets?:', fs.existsSync(carpetaTickets));
        
        console.log('Carpeta reportes:', carpetaReportes);
        console.log('¿Existe carpeta reportes?:', fs.existsSync(carpetaReportes));
        
        // Crear carpetas si no existen
        if (!fs.existsSync(carpetaTickets)) {
            fs.mkdirSync(carpetaTickets, { recursive: true });
            console.log('✅ Carpeta tickets creada');
        }
        
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
            console.log('✅ Carpeta reportes creada');
        }
        
        console.log('2. Generando archivo de atención...');
        const rutaArchivo = generarAtencionCompleta(atencionPrueba, carpetaTickets);
        console.log('✅ Archivo de atención generado:', rutaArchivo);
        
        console.log('3. Verificando que el archivo existe...');
        if (fs.existsSync(rutaArchivo)) {
            const stats = fs.statSync(rutaArchivo);
            console.log('✅ Archivo existe, tamaño:', stats.size, 'bytes');
            
            // Leer las primeras líneas para verificar contenido
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            const lineas = contenido.split('\n');
            console.log('Primeras 3 líneas:');
            lineas.slice(0, 3).forEach((linea, index) => {
                console.log(`  ${index + 1}: ${linea.substring(0, 100)}...`);
            });
        } else {
            console.log('❌ Archivo no existe');
        }
        
        console.log('4. Verificando archivos en carpeta reportes...');
        const archivosReportes = fs.readdirSync(carpetaReportes);
        console.log('Archivos en reportes:', archivosReportes);
        
        const archivosAtencion = archivosReportes.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
        console.log('Archivos de atención:', archivosAtencion);
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack trace:', error.stack);
    }
    
    console.log('=== FIN TEST ===');
}

// Ejecutar el test
testTicketClosure(); 