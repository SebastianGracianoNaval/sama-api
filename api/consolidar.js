const { consolidarArchivos } = require('../controllers/webhookController');

module.exports = (req, res) => {
  if (req.method === 'POST') {
    consolidarArchivos(req, res);
  } else {
    res.status(405).json({ success: false, message: 'Método no permitido' });
  }
}; 