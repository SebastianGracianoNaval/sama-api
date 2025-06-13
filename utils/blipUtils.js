/**
 * Identifica el tipo de JSON de BLiP basado en sus campos
 * @param {Object} jsonData - Los datos JSON a analizar
 * @returns {string} - El tipo identificado ('mensaje', 'evento', 'contacto' o null)
 */
const identificarTipoJson = (jsonData) => {
    if (!jsonData) return null;

    // Verificar si es un mensaje
    if (jsonData.type && typeof jsonData.type === 'string') {
        const tiposMensaje = [
            'text/plain',
            'application/json',
            'application/vnd.lime.collection+json'
        ];
        if (tiposMensaje.includes(jsonData.type)) {
            return 'mensaje';
        }
    }

    // Verificar si es un flujo (category y action)
    if (jsonData.category && jsonData.action) {
        return 'flujo';
    }

    // Verificar si es un evento
    if (jsonData.category && typeof jsonData.category === 'string') {
        const tiposEvento = ['Possui cadastro', 'flow'];
        if (tiposEvento.includes(jsonData.category)) {
            return 'evento';
        }
    }

    // Verificar si es un contacto
    if (jsonData.lastMessageDate && typeof jsonData.lastMessageDate === 'string') {
        // Verificar si lastMessageDate es una fecha UTC válida
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
        if (dateRegex.test(jsonData.lastMessageDate)) {
            return 'contacto';
        }
    }

    return null;
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
        contacto: 'data/contactos'
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

module.exports = {
    identificarTipoJson,
    obtenerRutaCarpeta,
    generarNombreArchivo
}; 