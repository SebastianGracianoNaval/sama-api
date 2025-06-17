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
    const now = new Date();
    const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
    const fecha = now.toISOString().slice(0,10);
    return `${tipo}_${hora}_${fecha}.csv`;
};

/**
 * Detecta si un ticket está cerrado basado en patrones de cierre o timeout
 * @param {Object} ticket - Objeto de ticket a analizar
 * @returns {Object} - Objeto con { cerrado: boolean, fechaCierre: string | null }
 */
const detectarCierreTicket = (ticket) => {
    let cerrado = false;
    let fechaCierre = null;
    if (ticket.extras) {
        const prevState = ticket.extras['#previousStateName']?.toLowerCase() || '';
        const prevStateId = ticket.extras['#previousStateId'] || '';
        if (prevState.includes('atendimento humano') || prevState.includes('atencion humana') || prevStateId.startsWith('desk')) {
            cerrado = true;
            fechaCierre = ticket.storageDate || ticket['metadata.#envelope.storageDate'] || ticket.fechaFiltro;
            console.log('===================TICKET CERRADO===============');
        }
    }
    return { cerrado, fechaCierre };
};

// Agregar validación para no exportar tickets abiertos
const validarTicketCerrado = (ticket) => {
    const { cerrado } = detectarCierreTicket(ticket);
    if (!cerrado) {
        throw new Error('No se puede exportar un ticket que no está cerrado.');
    }
    return true;
};

/**
 * Genera un nombre de archivo CSV con el formato estándar
 * @param {string} tipo - Tipo de archivo (mensaje, ticket, evento, contacto)
 * @param {Date} [fecha=null] - Fecha opcional para el nombre del archivo. Si no se proporciona, se usa la fecha actual
 * @returns {string} Nombre del archivo en formato {tipo}_{HH-MM-SS}_{YYYY-MM-DD}.csv
 */
function generarNombreCsv(tipo, fecha = null) {
    const now = fecha || new Date();
    const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
    const fechaStr = now.toISOString().slice(0,10);
    return `${tipo}_${hora}_${fechaStr}.csv`;
}

module.exports = {
    identificarTipoJson,
    obtenerRutaCarpeta,
    generarNombreArchivo,
    detectarCierreTicket,
    validarTicketCerrado,
    generarNombreCsv
}; 