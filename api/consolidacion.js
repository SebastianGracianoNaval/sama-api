const { consolidarArchivos } = require('../controllers/webhookController');

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Método no permitido'
        });
    }

    try {
        // Obtener el tipo de los parámetros de la URL
        const { tipo } = req.query;
        
        if (!tipo) {
            return res.status(400).json({
                success: false,
                message: 'Tipo no especificado'
            });
        }

        // Procesar la consolidación
        await consolidarArchivos(req, res);
    } catch (error) {
        console.error('Error en la consolidación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la consolidación',
            error: error.message
        });
    }
}; 