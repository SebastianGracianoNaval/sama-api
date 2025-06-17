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
    let cerrado = false;
    let fechaCierre = null;
    if (ticket.extras && ticket.extras['#previousStateName']) {
        const prevState = ticket.extras['#previousStateName'].toLowerCase();
        if (prevState.includes('atendimento humano') || prevState.includes('atencion humana')) {
            cerrado = true;
            fechaCierre = ticket.storageDate || ticket['metadata.#envelope.storageDate'] || ticket.fechaFiltro;
        }
    }
    return { cerrado, fechaCierre };
};

module.exports = {
    identificarTipoJson,
    obtenerRutaCarpeta,
    generarNombreArchivo,
    detectarCierreTicket
}; 