/**
 * Identifica el tipo de JSON de BLiP basado en sus campos
 * @param {Object} jsonData - Los datos JSON a analizar
 * @returns {string} - El tipo identificado ('mensaje', 'evento', 'contacto', 'plantilla', 'ticket' o 'desconocido')
 */
const identificarTipoJson = (jsonData) => {
    if (!jsonData) return 'otro';

    // 🎫 Tickets
    if (jsonData.type === 'application/vnd.iris.ticket+json') {
        return 'ticket';
    }
    if (jsonData.content && typeof jsonData.content === 'object') {
        const ticketFields = ['status', 'team', 'unreadMessages'];
        if (ticketFields.some(f => f in jsonData.content)) {
            return 'ticket';
        }
    }
    
    // 📋 Plantillas (templates)
    if (jsonData.type === 'application/json' && jsonData.content && jsonData.content.type === 'template') {
        return 'plantilla';
    }
    if (jsonData.content && jsonData.content.template && jsonData.content.template.name) {
        return 'plantilla';
    }
    
    // 📩 Mensajes
    if ('type' in jsonData) {
        return 'mensaje';
    }
    // 📊 Eventos
    if ('category' in jsonData) {
        return 'evento';
    }
    // 👥 Contactos
    if ('lastMessageDate' in jsonData) {
        return 'contacto';
    }
    // Si no coincide con ninguna, devolver 'desconocido'
    return 'desconocido';
};

/**
 * Extrae información de una plantilla
 * @param {Object} jsonData - Los datos JSON de la plantilla
 * @returns {Object} - Información extraída de la plantilla
 */
const extraerInfoPlantilla = (jsonData) => {
    try {
        const content = jsonData.content || {};
        const template = content.template || {};
        const templateContent = content.templateContent || {};
        
        // Extraer nombre de la plantilla
        const nombrePlantilla = template.name || templateContent.name || '';
        
        // Extraer contenido de la plantilla
        let contenidoPlantilla = '';
        if (templateContent.components) {
            const bodyComponent = templateContent.components.find(comp => comp.type === 'BODY');
            if (bodyComponent && bodyComponent.text) {
                contenidoPlantilla = bodyComponent.text;
            }
        }
        
        // Extraer parámetros si existen
        const parametros = [];
        if (template.components) {
            const bodyComponent = template.components.find(comp => comp.type === 'body');
            if (bodyComponent && bodyComponent.parameters) {
                parametros.push(...bodyComponent.parameters.map(param => param.text || ''));
            }
        }
        
        // Extraer metadata de ActiveCampaign si existe
        const metadata = jsonData.metadata || {};
        const campaignId = metadata['#activecampaign.flowId'] || '';
        const campaignName = metadata['#activecampaign.name'] || '';
        const stateId = metadata['#activecampaign.stateId'] || '';
        
        return {
            nombrePlantilla,
            contenidoPlantilla,
            parametros,
            campaignId,
            campaignName,
            stateId,
            metadata
        };
    } catch (error) {
        console.error('[extraerInfoPlantilla] Error:', error);
        return {
            nombrePlantilla: '',
            contenidoPlantilla: '',
            parametros: [],
            campaignId: '',
            campaignName: '',
            stateId: '',
            metadata: {}
        };
    }
};

/**
 * Determina si un ticket proviene de una plantilla
 * @param {Object} ticketData - Datos del ticket
 * @param {Map} plantillasRegistradas - Mapa de plantillas registradas
 * @returns {Object} - Información sobre el origen del ticket
 */
const determinarOrigenTicket = (ticketData, plantillasRegistradas = new Map()) => {
    try {
        const content = ticketData.content || {};
        const metadata = ticketData.metadata || {};
        
        // Buscar CampaignId en el ticket
        const campaignId = content.CampaignId || metadata['#activecampaign.flowId'] || '';
        
        if (campaignId && plantillasRegistradas.has(campaignId)) {
            const infoPlantilla = plantillasRegistradas.get(campaignId);
            return {
                esDePlantilla: true,
                nombrePlantilla: infoPlantilla.nombrePlantilla,
                campaignId: campaignId,
                campaignName: infoPlantilla.campaignName
            };
        }
        
        // Si no tiene CampaignId, probablemente es del BOT
        return {
            esDePlantilla: false,
            nombrePlantilla: '',
            campaignId: '',
            campaignName: ''
        };
    } catch (error) {
        console.error('[determinarOrigenTicket] Error:', error);
        return {
            esDePlantilla: false,
            nombrePlantilla: '',
            campaignId: '',
            campaignName: ''
        };
    }
};

/**
 * Obtiene la ruta de la carpeta correspondiente al tipo de dato
 * @param {string} tipo - El tipo de dato ('mensaje', 'evento', 'contacto', 'plantilla', 'ticket')
 * @returns {string} - La ruta de la carpeta
 */
const obtenerRutaCarpeta = (tipo) => {
    const rutas = {
        mensaje: 'data/mensajes',
        evento: 'data/eventos',
        contacto: 'data/contactos',
        ticket: 'data/tickets',
        plantilla: 'data/plantillas',
        campana: 'data/campanas'
    };
    return rutas[tipo] || null;
};

/**
 * Genera un nombre de archivo único basado en el tipo y timestamp
 * @param {string} tipo - El tipo de dato
 * @returns {string} - El nombre del archivo
 */
const generarNombreArchivo = (tipo) => {
    const ahora = new Date();
    const hora = ahora.toTimeString().slice(0,8).replace(/:/g, '-');
    const fecha = ahora.toISOString().slice(0,10);
    return `${tipo}_${hora}_${fecha}.csv`;
};

module.exports = {
    identificarTipoJson,
    extraerInfoPlantilla,
    determinarOrigenTicket,
    obtenerRutaCarpeta,
    generarNombreArchivo
}; 