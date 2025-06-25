const { consolidarTicketsCsvs, crearZipTickets } = require('./utils/csvUtils');
const path = require('path');

/**
 * Script de prueba para la nueva implementación de tickets
 * Simula el flujo completo: atenciones con tickets anidados y transferencias
 */
async function testNuevaImplementacion() {
    console.log('🧪 Iniciando prueba de nueva implementación...');
    
    try {
        // Simular directorio de tickets
        const directorio = path.join(__dirname, 'data', 'tickets');
        
        // Crear archivos de prueba
        const carpetaReportes = path.join(path.dirname(directorio), 'reportes');
        if (!require('fs').existsSync(carpetaReportes)) {
            require('fs').mkdirSync(carpetaReportes, { recursive: true });
        }
        
        // Crear archivo de atención BOT con transferencia
        const atencionBot = [
            {
                id: 'ticket_001',
                sequentialId: '1001',
                parentSequentialId: '',
                status: 'closed',
                team: 'SOPORTE',
                unreadMessages: 0,
                storageDate: '2024-01-15T10:00:00Z',
                timestamp: '2024-01-15T10:00:00Z',
                estadoTicket: 'cerrado',
                fechaCierre: '2024-01-15T11:30:00Z',
                tipoCierre: 'Resuelto',
                fechaFiltro: '2024-01-15',
                tipoDato: 'ticket_reporte',
                procesadoEn: new Date().toISOString(),
                conversacion: '[cliente]: Hola, necesito ayuda\\n[agente]: Hola, ¿en qué puedo ayudarte?',
                contacto: '5491169007611',
                agente: 'agente1@empresa.com',
                duracion: '1h 30m 0s',
                TIPO: 'BOT',
                transferencia: 'TRUE',
                ticket_padre: '',
                ticket_hijo: '1002',
                tipo_transferencia: 'AGENTE',
                agente_transferido: 'agente2@empresa.com',
                cola_transferida: 'DIRECT_TRANSFER',
                historial_transferencias: '1001 → 1002',
                cantidad_transferencias: 1,
                atencion_id: 'atencion_5491169007611_2024-01-15',
                atencion_fecha_apertura: '2024-01-15T10:00:00Z',
                atencion_fecha_cierre: '2024-01-15T11:30:00Z',
                atencion_duracion_total: '1h 30m 0s'
            },
            {
                id: 'ticket_002',
                sequentialId: '1002',
                parentSequentialId: '1001',
                status: 'closed',
                team: 'DIRECT_TRANSFER',
                unreadMessages: 0,
                storageDate: '2024-01-15T10:30:00Z',
                timestamp: '2024-01-15T10:30:00Z',
                estadoTicket: 'cerrado',
                fechaCierre: '2024-01-15T11:30:00Z',
                tipoCierre: 'Resuelto',
                fechaFiltro: '2024-01-15',
                tipoDato: 'ticket_reporte',
                procesadoEn: new Date().toISOString(),
                conversacion: '[agente]: Te transfiero a un especialista\\n[agente]: Hola, soy el especialista',
                contacto: '5491169007611',
                agente: 'agente2@empresa.com',
                duracion: '1h 0m 0s',
                TIPO: 'TRANSFERENCIA',
                transferencia: 'TRUE',
                ticket_padre: '1001',
                ticket_hijo: '',
                tipo_transferencia: 'AGENTE',
                agente_transferido: 'agente2@empresa.com',
                cola_transferida: 'DIRECT_TRANSFER',
                historial_transferencias: '1001 → 1002',
                cantidad_transferencias: 1,
                atencion_id: 'atencion_5491169007611_2024-01-15',
                atencion_fecha_apertura: '2024-01-15T10:00:00Z',
                atencion_fecha_cierre: '2024-01-15T11:30:00Z',
                atencion_duracion_total: '1h 30m 0s'
            }
        ];
        
        // Crear archivo de atención PLANTILLA
        const atencionPlantilla = [
            {
                id: 'ticket_003',
                sequentialId: '2001',
                parentSequentialId: '',
                status: 'closed',
                team: 'VENTAS',
                unreadMessages: 0,
                storageDate: '2024-01-16T09:00:00Z',
                timestamp: '2024-01-16T09:00:00Z',
                estadoTicket: 'cerrado',
                fechaCierre: '2024-01-16T10:00:00Z',
                tipoCierre: 'Vendido',
                fechaFiltro: '2024-01-16',
                tipoDato: 'ticket_reporte',
                procesadoEn: new Date().toISOString(),
                conversacion: '[agente]: Hola, te envío información sobre nuestros productos\\n[cliente]: Me interesa',
                contacto: '5491169007622',
                agente: 'vendedor@empresa.com',
                duracion: '1h 0m 0s',
                TIPO: 'PLANTILLA',
                transferencia: 'FALSE',
                ticket_padre: '',
                ticket_hijo: '',
                tipo_transferencia: '',
                agente_transferido: '',
                cola_transferida: '',
                historial_transferencias: '',
                cantidad_transferencias: 0,
                atencion_id: 'atencion_5491169007622_2024-01-16',
                atencion_fecha_apertura: '2024-01-16T09:00:00Z',
                atencion_fecha_cierre: '2024-01-16T10:00:00Z',
                atencion_duracion_total: '1h 0m 0s',
                plantilla_id: 'camp_001',
                plantilla_nombre: 'Oferta Especial',
                plantilla_contenido: '¡Oferta especial por tiempo limitado!',
                plantilla_parametros: 'Descuento|20%',
                plantilla_campaignId: 'camp_001',
                plantilla_campaignName: 'Campaña Enero',
                plantilla_fecha_envio: '2024-01-16T08:30:00Z',
                contacto_identity: '5491169007622@wa.gw.msging.net',
                contacto_numero: '5491169007622',
                usuario_respuesta: 'SI',
                usuario_tipo_respuesta: 'text',
                usuario_contenido: 'Me interesa',
                usuario_fecha_respuesta: '2024-01-16T09:15:00Z',
                ticket_generado: 'SI',
                ticket_id: 'ticket_003',
                ticket_sequentialId: '2001',
                ticket_estado: 'cerrado',
                ticket_fecha_cierre: '2024-01-16T10:00:00Z',
                ticket_tipo_cierre: 'Vendido',
                ticket_agente: 'vendedor@empresa.com',
                ticket_duracion: '1h 0m 0s'
            }
        ];
        
        // Guardar archivos de prueba
        const { Parser } = require('json2csv');
        
        // Archivo de atención BOT
        const camposBot = [
            'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
            'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
            'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'contacto', 'agente', 'duracion', 'TIPO',
            'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'historial_transferencias', 'cantidad_transferencias',
            'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total'
        ];
        
        const parserBot = new Parser({ fields: camposBot, header: true });
        const csvBot = parserBot.parse(atencionBot);
        require('fs').writeFileSync(path.join(carpetaReportes, 'atencion_5491169007611_2024-01-15.csv'), csvBot);
        
        // Archivo de atención PLANTILLA
        const camposPlantilla = [
            'id', 'sequentialId', 'parentSequentialId', 'status', 'team', 'unreadMessages',
            'storageDate', 'timestamp', 'estadoTicket', 'fechaCierre', 'tipoCierre',
            'fechaFiltro', 'tipoDato', 'procesadoEn', 'conversacion', 'contacto', 'agente', 'duracion', 'TIPO',
            'transferencia', 'ticket_padre', 'ticket_hijo', 'tipo_transferencia', 'agente_transferido', 'cola_transferida', 'historial_transferencias', 'cantidad_transferencias',
            'atencion_id', 'atencion_fecha_apertura', 'atencion_fecha_cierre', 'atencion_duracion_total',
            'plantilla_id', 'plantilla_nombre', 'plantilla_contenido', 'plantilla_parametros', 'plantilla_campaignId', 'plantilla_campaignName', 'plantilla_fecha_envio',
            'contacto_identity', 'contacto_numero', 'usuario_respuesta', 'usuario_tipo_respuesta', 'usuario_contenido', 'usuario_fecha_respuesta',
            'ticket_generado', 'ticket_id', 'ticket_sequentialId', 'ticket_estado', 'ticket_fecha_cierre', 'ticket_tipo_cierre', 'ticket_agente', 'ticket_duracion'
        ];
        
        const parserPlantilla = new Parser({ fields: camposPlantilla, header: true });
        const csvPlantilla = parserPlantilla.parse(atencionPlantilla);
        require('fs').writeFileSync(path.join(carpetaReportes, 'atencion_5491169007622_2024-01-16.csv'), csvPlantilla);
        
        console.log('✅ Archivos de prueba creados');
        
        // Probar consolidación
        console.log('🔄 Probando consolidación de tickets...');
        const { botPath, plantillaPath } = await consolidarTicketsCsvs(directorio);
        
        console.log('📊 Resultados de consolidación:');
        console.log(`  - Archivo BOT: ${botPath ? '✅ Generado' : '❌ No generado'}`);
        console.log(`  - Archivo PLANTILLA: ${plantillaPath ? '✅ Generado' : '❌ No generado'}`);
        
        // Probar creación de ZIP
        if (botPath || plantillaPath) {
            console.log('📦 Probando creación de ZIP...');
            const zipPath = await crearZipTickets(botPath, plantillaPath, directorio);
            console.log(`  - ZIP generado: ${zipPath ? '✅' : '❌'}`);
        }
        
        console.log('🎉 Prueba completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Ejecutar prueba
testNuevaImplementacion(); 