import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper,
  ButtonGroup
} from '@mui/material';
import { reportService } from '../services/api';
import { showToast } from './Toast';

const Reportes = () => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const limpiarFechas = () => {
    setFechaInicio('');
    setFechaFin('');
  };

  const validarFechas = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      showToast('La fecha de inicio no puede ser posterior a la fecha fin.', 'error');
      return false;
    }
    
    if ((fechaInicio && fechaInicio > hoy) || (fechaFin && fechaFin > hoy)) {
      showToast('No se pueden seleccionar fechas futuras.', 'error');
      return false;
    }
    
    return true;
  };

  const descargarArchivo = async (tipo) => {
    if (!validarFechas()) return;

    try {
      let response;
      switch (tipo) {
        case 'mensajes':
          response = await reportService.downloadMessages(fechaInicio, fechaFin);
          break;
        case 'contactos':
          response = await reportService.downloadContacts(fechaInicio, fechaFin);
          break;
        case 'eventos':
          response = await reportService.downloadEvents(fechaInicio, fechaFin);
          break;
        case 'todo':
          response = await reportService.downloadAll(fechaInicio, fechaFin);
          break;
        default:
          return;
      }

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${tipo}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('Archivo descargado correctamente', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error al descargar el archivo', 'error');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Descargar reportes consolidados
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Fecha inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Fecha fin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Button 
            variant="outlined" 
            onClick={limpiarFechas}
            sx={{ minWidth: '100px' }}
          >
            Limpiar
          </Button>
        </Box>
        
        <ButtonGroup variant="contained" sx={{ gap: 1 }}>
          <Button 
            color="success" 
            onClick={() => descargarArchivo('mensajes')}
          >
            Mensajes
          </Button>
          <Button 
            color="success" 
            onClick={() => descargarArchivo('contactos')}
          >
            Contactos
          </Button>
          <Button 
            color="success" 
            onClick={() => descargarArchivo('eventos')}
          >
            Eventos
          </Button>
          <Button 
            color="primary" 
            onClick={() => descargarArchivo('todo')}
          >
            TODO
          </Button>
        </ButtonGroup>
      </Box>
    </Paper>
  );
};

export default Reportes; 