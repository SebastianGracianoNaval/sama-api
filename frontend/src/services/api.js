import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function handleBlobResponse(promise) {
  try {
    const response = await promise;
    // Si la respuesta es un blob pero en realidad es un error HTML o JSON, intentar leerlo
    const contentType = response.headers['content-type'];
    if (contentType && (contentType.includes('application/json') || contentType.includes('text/html'))) {
      // Leer el blob como texto
      const text = await response.data.text();
      let errorMsg = 'Error al descargar el archivo';
      try {
        const json = JSON.parse(text);
        errorMsg = json.error || json.message || errorMsg;
      } catch {
        // Si no es JSON, mostrar el texto plano o mensaje genérico
        if (text.includes('Cannot GET')) {
          errorMsg = 'El recurso solicitado no existe o el endpoint es incorrecto.';
        } else {
          errorMsg = text;
        }
      }
      throw new Error(errorMsg);
    }
    return response;
  } catch (error) {
    // Si es un error de red o axios
    if (error.response && error.response.data) {
      let errorMsg = 'Error al descargar el archivo';
      if (error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errorMsg = json.error || json.message || errorMsg;
        } catch {
          errorMsg = await error.response.data.text();
        }
      } else if (typeof error.response.data === 'object') {
        errorMsg = error.response.data.error || error.response.data.message || errorMsg;
      }
      throw new Error(errorMsg);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Error al descargar el archivo');
    }
  }
}

export const webhookService = {
  getWebhooks: () => api.get('/webhook'),
  postWebhook: (data) => api.post('/webhook', data),
};

export const reportService = {
  downloadMessages: (fechaInicio, fechaFin) => 
    handleBlobResponse(api.get('/descargar/mensajes', { 
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    })),
  downloadContacts: (fechaInicio, fechaFin) => 
    handleBlobResponse(api.get('/descargar/contactos', { 
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    })),
  downloadEvents: (fechaInicio, fechaFin) => 
    handleBlobResponse(api.get('/descargar/eventos', { 
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    })),
  downloadAll: (fechaInicio, fechaFin) => 
    handleBlobResponse(api.get('/descargar/todo', { 
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    })),
  getReportesList: () => api.get('/descargar/reportes'),
  downloadReporte: (filename) => handleBlobResponse(api.get(`/descargar/reportes/${filename}`, { responseType: 'blob' })),
  downloadReporteByType: (tipo, fechaInicio, fechaFin) => 
    handleBlobResponse(api.get(`/descargar/${tipo}`, {
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    })),
};

export default api; 