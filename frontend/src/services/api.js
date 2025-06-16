import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const webhookService = {
  getWebhooks: () => api.get('/webhook'),
  postWebhook: (data) => api.post('/webhook', data),
};

export const reportService = {
  downloadMessages: (fechaInicio, fechaFin) => 
    api.get('/descargar/mensajes', { 
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    }),
  downloadContacts: (fechaInicio, fechaFin) => 
    api.get('/descargar/contactos', { 
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    }),
  downloadEvents: (fechaInicio, fechaFin) => 
    api.get('/descargar/eventos', { 
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    }),
  downloadAll: (fechaInicio, fechaFin) => 
    api.get('/descargar/todo', { 
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    }),
};

export const fetchReportesList = async () => {
  const res = await axios.get('/api/reportes');
  return res.data;
};

export const downloadReporte = async (filename) => {
  const res = await axios.get(`/api/reportes/${filename}`, { responseType: 'blob' });
  return res.data;
};

export default api; 