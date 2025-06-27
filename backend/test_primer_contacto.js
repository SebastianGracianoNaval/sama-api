const fs = require('fs');
const path = require('path');
const { generarAtencionCompleta } = require('./utils/csvUtils');

async function testPrimerContacto() {
    console.log('=== TEST PRIMER CONTACTO ===');
    
    try {
        // Verificar estructura de directorios
        const carpetaTickets = path.join(__dirname, 'data', 'tickets');
        const carpetaReportes = path.join(__dirname, 'data', 'reportes');
        
        console.log('1. Verificando estructura de directorios...');
        
        // Crear carpetas si no existen
        if (!fs.existsSync(carpetaTickets)) {
            fs.mkdirSync(carpetaTickets, { recursive: true });
            console.log('✅ Carpeta tickets creada');
        }
        
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
            console.log('✅ Carpeta reportes creada');
        }
        
        // Crear atención de prueba con mensajes del agente
        const atencionPrueba = {
            contacto: '5491169007611',
            tipoBase: 'BOT',
            fechaApertura: '2025-06-27T03:01:21Z',
            fechaCierre: '2025-06-27T03:02:14Z',
            duracionTotal: '0d 0h 0m 53s',
            tickets: [
                {
                    ticket: {
                        id: 'test-ticket-1',
                        content: {
                            sequentialId: '234',
                            status: 'Waiting',
                            team: 'Default'
                        },
                        metadata: {
                            '#envelope.storageDate': '2025-06-27T03:01:21Z'
                        }
                    },
                    mensajes: [
                        // Mensaje del cliente (no debería ser primer contacto)
                        {
                            from: '5491169007611@wa.gw.msging.net',
                            content: 'Hola, necesito ayuda',
                            'metadata.#envelope.storageDate': '2025-06-27T03:01:15Z'
                        },
                        // Primer mensaje del agente (debería ser primer contacto)
                        {
                            from: 'agente@msging.net',
                            content: '¡Hola! ¿En qué puedo ayudarte?',
                            'metadata.#envelope.storageDate': '2025-06-27T03:01:25Z',
                            'metadata.#messageEmitter': 'Human'
                        },
                        // Segundo mensaje del agente
                        {
                            from: 'agente@msging.net',
                            content: 'Estoy aquí para asistirte',
                            'metadata.#envelope.storageDate': '2025-06-27T03:01:30Z',
                            'metadata.#messageEmitter': 'Human'
                        }
                    ],
                    eventos: [],
                    cerrado: true,
                    fechaCierre: '2025-06-27T03:02:14Z',
                    fechaApertura: '2025-06-27T03:01:21Z',
                    contacto: '5491169007611',
                    tipo: 'BOT',
                    campaignDetails: null,
                    sequentialId: '234',
                    parentSequentialId: null,
                    team: 'Default',
                    agentIdentity: '',
                    correoAgente: 'agente@test.com',
                    tipoCierre: 'Por Agente',
                    duracion: '0d 0h 0m 53s'
                }
            ]
        };
        
        console.log('2. Generando atención de prueba...');
        const rutaArchivo = generarAtencionCompleta(atencionPrueba, carpetaTickets);
        console.log(`✅ Archivo generado: ${rutaArchivo}`);
        
        // Verificar contenido del archivo
        console.log('3. Verificando contenido del archivo...');
        const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
        const lineas = contenido.split('\n');
        
        // Verificar encabezados
        const encabezados = lineas[0].split(',').map(col => col.replace(/"/g, ''));
        const indicePrimerContacto = encabezados.findIndex(col => col === 'primer_contacto');
        
        if (indicePrimerContacto !== -1) {
            console.log(`✅ Columna 'primer_contacto' encontrada en posición ${indicePrimerContacto}`);
        } else {
            console.log('❌ Columna "primer_contacto" no encontrada en encabezados');
            console.log('Encabezados:', encabezados);
            return;
        }
        
        // Verificar datos
        if (lineas.length > 1) {
            const datos = lineas[1].split(',').map(col => col.replace(/"/g, ''));
            const primerContacto = datos[indicePrimerContacto];
            
            console.log(`4. Valor de primer_contacto: "${primerContacto}"`);
            
            if (primerContacto && primerContacto.includes('2025-06-27T03:01:25Z') && primerContacto.includes('¡Hola! ¿En qué puedo ayudarte?')) {
                console.log('✅ primer_contacto contiene la fecha y contenido correctos del primer mensaje del agente');
            } else {
                console.log('❌ primer_contacto no contiene los datos esperados');
                console.log('Esperado: fecha 2025-06-27T03:01:25Z y contenido del primer mensaje del agente');
                console.log('Obtenido:', primerContacto);
            }
            
            // Verificar que no se incluyó el mensaje del cliente
            if (primerContacto && !primerContacto.includes('Hola, necesito ayuda')) {
                console.log('✅ primer_contacto NO incluye mensajes del cliente (correcto)');
            } else {
                console.log('❌ primer_contacto incluye mensajes del cliente (incorrecto)');
            }
        } else {
            console.log('❌ No se encontraron datos en el archivo');
        }
        
        console.log('\n=== TEST COMPLETADO ===');
        
    } catch (error) {
        console.error('❌ Error en test:', error);
    }
}

// Ejecutar test
testPrimerContacto(); 