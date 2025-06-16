/**
 * Identifica el tipo de JSON de BLiP basado en sus campos
 * @param {Object} jsonData - Los datos JSON a analizar
 * @returns {string} - El tipo identificado ('mensaje', 'evento', 'contacto' o null)
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
 * Obtiene la ruta de la carpeta correspondiente al tipo de dato
 * @param {string} tipo - El tipo de dato ('mensaje', 'evento', 'contacto')
 * @returns {string} - La ruta de la carpeta
 */
const obtenerRutaCarpeta = (tipo) => {
    const rutas = {
        mensaje: 'data/mensajes',
        evento: 'data/eventos',
        contacto: 'data/contactos',
        ticket: 'data/tickets'
    };
    return rutas[tipo] || null;
};

/**
 * Genera un nombre de archivo único basado en el tipo y timestamp
 * @param {string} tipo - El tipo de dato
 * @returns {string} - El nombre del archivo
 */
const generarNombreArchivo = (tipo) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${tipo}-${timestamp}.csv`;
};

/**
 * Detecta si un ticket está cerrado basado en patrones de cierre o timeout
 * @param {Object} ticket - Objeto de ticket a analizar
 * @returns {Object} - Objeto con { cerrado: boolean, fechaCierre: string | null }
 */
const detectarCierreTicket = (ticket) => {
    // Verificar si ya tiene campos de cierre
    if (ticket.cerrado === true || ticket.cerrado === 'true') {
        return {
            cerrado: true,
            fechaCierre: ticket.fechaCierre || ticket['content.storageDate'] || ticket.fechaFiltro
        };
    }

    // Verificar patrones de cierre en el ticket
    const status = ticket['content.status'] || ticket.status;
    const previousStateName = ticket['content.previousStateName'] || ticket.previousStateName;
    const state = ticket['content.state'] || ticket.state;
    const content = ticket['content.customerInput.value'] || ticket.content;

    // Patrones de cierre
    const patronesCierre = [
        status === 'CLOSED',
        status === 'FINALIZADO',
        previousStateName?.includes('Atencion Humana'),
        state === 'Cerrado',
        state === 'Finalizado',
        content?.includes('finalizo el ticket'),
        ticket['extras.#stateName'] === '4.0 - Encuesta',
        ticket['metadata.#stateName'] === '4.0 - Encuesta'
    ];

    if (patronesCierre.some(patron => patron)) {
        return {
            cerrado: true,
            fechaCierre: ticket['content.storageDate'] || ticket.storageDate || ticket.fechaFiltro
        };
    }

    // Verificar timeout de 23h58m
    const fechaCreacion = new Date(ticket['content.storageDate'] || ticket.storageDate || ticket.fechaFiltro);
    const ahora = new Date();
    const diffHoras = (ahora - fechaCreacion) / (1000 * 60 * 60);
    
    if (diffHoras >= 23.966) { // 23 horas y 58 minutos
        return {
            cerrado: true,
            fechaCierre: ahora.toISOString()
        };
    }

    return {
        cerrado: false,
        fechaCierre: null
    };
};

module.exports = {
    identificarTipoJson,
    obtenerRutaCarpeta,
    generarNombreArchivo,
    detectarCierreTicket
}; 