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
    console.log('[handleBlobResponse] Headers recibidos:', response.headers);
    const contentType = response.headers['content-type'];
    const contentDisposition = response.headers['content-disposition'];
    console.log('[handleBlobResponse] Content-Disposition:', contentDisposition);
    
    if (contentType && (contentType.includes('application/json') || contentType.includes('text/html'))) {
      const text = await response.data.text();
      let errorMsg = 'Error al descargar el archivo';
      try {
        const json = JSON.parse(text);
        if (json.error === 'No hay datos para el período especificado') {
          errorMsg = 'No hay datos disponibles para las fechas seleccionadas.';
        } else {
          errorMsg = json.error || json.message || errorMsg;
        }
      } catch {
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          errorMsg = 'Ocurrió un error inesperado en el servidor.';
        } else if (text.includes('Cannot GET')) {
          errorMsg = 'No se pudo conectar con el servidor. Por favor, intente más tarde o contacte a soporte.';
        } else {
          errorMsg = text;
        }
      }
      throw new Error(errorMsg);
    }
    return response;
  } catch (error) {
    if (error.response && error.response.data) {
      let errorMsg = 'Error al descargar el archivo';
      if (error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          try {
            const json = JSON.parse(text);
            if (json.error === 'No hay datos para el período especificado') {
              errorMsg = 'No hay datos disponibles para las fechas seleccionadas.';
            } else {
              errorMsg = json.error || json.message || errorMsg;
            }
          } catch {
            if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
              errorMsg = 'Ocurrió un error inesperado en el servidor.';
            } else if (text.includes('Cannot GET')) {
              errorMsg = 'No se pudo conectar con el servidor. Por favor, intente más tarde o contacte a soporte.';
            } else {
              errorMsg = text;
            }
          }
        } catch {
          errorMsg = 'Error desconocido al procesar la respuesta del servidor.';
        }
      } else if (typeof error.response.data === 'object') {
        if (error.response.data.error === 'No hay datos para el período especificado') {
          errorMsg = 'No hay datos disponibles para las fechas seleccionadas.';
        } else {
          errorMsg = error.response.data.error || error.response.data.message || errorMsg;
        }
      }
      throw new Error(errorMsg);
    } else if (error.message) {
      if (
        error.message.includes('Network Error') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('timeout')
      ) {
        throw new Error('No se pudo conectar con el servidor. Por favor, intente más tarde o contacte a soporte.');
      }
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
  downloadTickets: (fechaInicio, fechaFin) => 
    handleBlobResponse(api.get('/descargar/tickets', { 
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    })),
  downloadCampanas: (fechaInicio, fechaFin, nombrePlantilla) => 
    handleBlobResponse(api.get('/descargar/campanas', { 
      params: { fechaInicio, fechaFin, nombrePlantilla },
      responseType: 'blob'
    })),
  downloadCampaignSummary: (fechaInicio, fechaFin, nombrePlantilla) => 
    handleBlobResponse(api.get('/descargar/campanas/resumen', {
      params: { fechaInicio, fechaFin, nombrePlantilla },
      responseType: 'blob'
    })),
  getCampanasList: () => api.get('/api/campanas'),
  getReportesList: () => api.get('/api/reportes'),
  downloadReporte: (filename) => handleBlobResponse(api.get(`/descargar/reportes/${filename}`, { responseType: 'blob' })),
  downloadReporteByType: (tipo, fechaInicio, fechaFin, nombrePlantilla) => 
    handleBlobResponse(api.get(`/descargar/${tipo}`, {
      params: { fechaInicio, fechaFin, nombrePlantilla },
      responseType: 'blob'
    })),
};

export default api; 