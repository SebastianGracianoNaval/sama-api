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
import MailIcon from '@mui/icons-material/Mail';
import ContactsIcon from '@mui/icons-material/Contacts';
import EventIcon from '@mui/icons-material/Event';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import ClearIcon from '@mui/icons-material/Clear';

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
      const backendMsg = error.response?.data?.message;
      if (backendMsg === 'No hay datos para el período especificado') {
        showToast('No hay datos para el período especificado', 'error');
      } else if (backendMsg === 'No hay archivos CSV para consolidar' || backendMsg === 'No hay datos para consolidar en el período especificado.' || backendMsg === 'No se encontró el directorio de datos.' || backendMsg === 'No hay datos para exportar') {
        showToast('No hay datos para exportar', 'error');
      } else {
        showToast('Error al descargar el archivo', 'error');
      }
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
            inputProps={{ max: new Date().toISOString().slice(0, 10) }}
          />
          <TextField
            label="Fecha fin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            inputProps={{ max: new Date().toISOString().slice(0, 10) }}
          />
          <Button 
            variant="outlined" 
            startIcon={<ClearIcon />}
            onClick={limpiarFechas}
            sx={{ minWidth: '100px', borderColor: theme => theme.palette.mode === 'dark' ? '#666' : '#bbb', color: theme => theme.palette.mode === 'dark' ? '#bbb' : '#666', '&:hover': { borderColor: theme => theme.palette.mode === 'dark' ? '#aaa' : '#888', background: theme => theme.palette.mode === 'dark' ? '#222' : '#eee' } }}
          >
            LIMPIAR
          </Button>
        </Box>
        
        <ButtonGroup sx={{ gap: 2, mt: 1 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<MailIcon />}
            sx={{ borderRadius: 3, minWidth: 120, fontWeight: 600 }}
            onClick={() => descargarArchivo('mensajes')}
          >
            MENSAJES
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<ContactsIcon />}
            sx={{ borderRadius: 3, minWidth: 120, fontWeight: 600 }}
            onClick={() => descargarArchivo('contactos')}
          >
            CONTACTOS
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<EventIcon />}
            sx={{ borderRadius: 3, minWidth: 120, fontWeight: 600 }}
            onClick={() => descargarArchivo('eventos')}
          >
            EVENTOS
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AllInboxIcon />}
            sx={{ borderRadius: 3, minWidth: 120, fontWeight: 600 }}
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