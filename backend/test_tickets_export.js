// Script para probar la exportación de tickets sin filtros
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { consolidarTicketsCsvs, crearZipTickets, generarAtencionCompleta } = require('./utils/csvUtils');

const API_URL = 'http://localhost:3000'; // Cambiar por tu URL de producción

async function testTicketsExport() {
    console.log('=== TEST TICKETS EXPORT ===');
    
    // 1. Verificar estructura de directorios
    const carpetaTickets = path.join(__dirname, 'data', 'tickets');
    const carpetaReportes = path.join(__dirname, 'data', 'reportes');
    
    console.log(`Carpeta tickets: ${carpetaTickets}`);
    console.log(`¿Existe carpeta tickets?: ${fs.existsSync(carpetaTickets)}`);
    
    console.log(`Carpeta reportes: ${carpetaReportes}`);
    console.log(`¿Existe carpeta reportes?: ${fs.existsSync(carpetaReportes)}`);
    
    // 2. Verificar contenido de carpetas
    if (fs.existsSync(carpetaTickets)) {
        const archivosTickets = fs.readdirSync(carpetaTickets);
        console.log(`Archivos en carpeta tickets:`, archivosTickets);
    }
    
    if (fs.existsSync(carpetaReportes)) {
        const archivosReportes = fs.readdirSync(carpetaReportes);
        console.log(`Archivos en carpeta reportes:`, archivosReportes);
        
        const archivosAtencion = archivosReportes.filter(archivo => archivo.startsWith('atencion_') && archivo.endsWith('.csv'));
        console.log(`Archivos de atención:`, archivosAtencion);
    }
    
    // 3. Crear datos de prueba si no hay archivos de atención
    if (!fs.existsSync(carpetaReportes) || fs.readdirSync(carpetaReportes).filter(archivo => archivo.startsWith('atencion_')).length === 0) {
        console.log('Creando datos de prueba...');
        
        // Crear carpeta reportes si no existe
        if (!fs.existsSync(carpetaReportes)) {
            fs.mkdirSync(carpetaReportes, { recursive: true });
        }
        
        // Crear una atención de prueba
        const atencionPrueba = {
            contacto: '5491169007611',
            tipoBase: 'BOT',
            fechaApertura: '2024-01-15T10:00:00.000Z',
            fechaCierre: '2024-01-15T10:30:00.000Z',
            duracionTotal: '0d 0h 30m 0s',
            tickets: [
                {
                    ticket: {
                        id: 'ticket_001',
                        content: {
                            sequentialId: '001',
                            parentSequentialId: null,
                            status: 'closed',
                            team: 'default'
                        },
                        metadata: {
                            '#envelope.storageDate': '2024-01-15T10:00:00.000Z'
                        }
                    },
                    mensajes: [
                        {
                            from: '5491169007611@wa.gw.msging.net',
                            to: 'bot@msging.net',
                            content: 'Hola, necesito ayuda',
                            'metadata.#envelope.storageDate': '2024-01-15T10:00:00.000Z'
                        },
                        {
                            from: 'bot@msging.net',
                            to: '5491169007611@wa.gw.msging.net',
                            content: 'Hola, ¿en qué puedo ayudarte?',
                            'metadata.#envelope.storageDate': '2024-01-15T10:01:00.000Z'
                        }
                    ],
                    cerrado: true,
                    fechaCierre: '2024-01-15T10:30:00.000Z',
                    fechaApertura: '2024-01-15T10:00:00.000Z',
                    contacto: '5491169007611',
                    tipo: 'BOT',
                    campaignDetails: null,
                    sequentialId: '001',
                    parentSequentialId: null,
                    team: 'default',
                    agentIdentity: '',
                    correoAgente: 'agente@test.com',
                    tipoCierre: 'resuelto',
                    duracion: '0d 0h 30m 0s'
                }
            ]
        };
        
        // Generar archivo de atención de prueba
        try {
            generarAtencionCompleta(atencionPrueba, carpetaTickets);
            console.log('Archivo de atención de prueba generado');
        } catch (error) {
            console.error('Error generando atención de prueba:', error);
        }
    }
    
    // 4. Probar consolidación
    console.log('\n=== PROBANDO CONSOLIDACIÓN ===');
    try {
        const { botPath, plantillaPath } = await consolidarTicketsCsvs(carpetaTickets, null);
        console.log(`Resultado consolidación - botPath: ${botPath}, plantillaPath: ${plantillaPath}`);
        
        if (botPath || plantillaPath) {
            console.log('Creando ZIP de prueba...');
            const zipPath = await crearZipTickets(botPath, plantillaPath, carpetaTickets);
            console.log(`ZIP creado en: ${zipPath}`);
        } else {
            console.log('No se generaron archivos para consolidar');
        }
    } catch (error) {
        console.error('Error en consolidación:', error);
    }
    
    console.log('\n=== FIN TEST ===');
}

// Ejecutar el test
testTicketsExport().catch(console.error); 