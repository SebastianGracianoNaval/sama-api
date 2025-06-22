import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper,
  ButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { reportService } from '../services/api';
import { showToast } from './Toast';
import MailIcon from '@mui/icons-material/Mail';
import ContactsIcon from '@mui/icons-material/Contacts';
import EventIcon from '@mui/icons-material/Event';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import CampaignIcon from '@mui/icons-material/Campaign';
import ClearIcon from '@mui/icons-material/Clear';
import { downloadBlobResponse } from '../utils/downloadFile';

const Reportes = () => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [campañas, setCampañas] = useState([]);
  const [campañaSeleccionada, setCampañaSeleccionada] = useState('');
  const [loadingCampañas, setLoadingCampañas] = useState(false);

  // Cargar lista de campañas al montar el componente
  useEffect(() => {
    cargarCampañas();
  }, []);

  const cargarCampañas = async () => {
    try {
      setLoadingCampañas(true);
      const response = await reportService.getCampañasList();
      if (response.data.success) {
        setCampañas(response.data.campañas);
        console.log('Campañas cargadas:', response.data.campañas);
      }
    } catch (error) {
      console.error('Error al cargar campañas:', error);
      showToast('Error al cargar la lista de campañas', 'error');
    } finally {
      setLoadingCampañas(false);
    }
  };

  const limpiarFechas = () => {
    setFechaInicio('');
    setFechaFin('');
    setCampañaSeleccionada('');
  };

  const validarFechas = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    if (fechaInicio && !fechaFin) {
      showToast('Por favor, especifique fecha fin.', 'error');
      return false;
    }
    if (fechaFin && !fechaInicio) {
      showToast('Por favor, especifique fecha inicio.', 'error');
      return false;
    }
    if (fechaInicio && fechaFin) {
      if (fechaFin < fechaInicio) {
        showToast('La fecha fin no puede ser anterior a la fecha inicio.', 'error');
        return false;
      }
      if (fechaInicio > hoy || fechaFin > hoy) {
        showToast('No se pueden seleccionar fechas futuras.', 'error');
        return false;
      }
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
        case 'campañas':
          response = await reportService.downloadCampañas(fechaInicio, fechaFin, campañaSeleccionada);
          break;
        default:
          return;
      }

      const now = new Date();
      const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
      const fecha = now.toISOString().slice(0,10);
      const fallbackName = tipo === 'todo' ? `todos_${hora}_${fecha}.zip` : `${tipo}_${hora}_${fecha}.csv`;
      downloadBlobResponse(response, fallbackName);
      showToast('Archivo descargado correctamente', 'success');
    } catch (error) {
      showToast(error.message || 'Error al descargar el archivo', 'error');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Descargar reportes consolidados
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Fecha inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ 
              minWidth: 200,
              '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                  filter: theme => theme.palette.mode === 'dark' ? 'invert(1)' : 'none'
              }
            }}
            inputProps={{ max: new Date().toISOString().slice(0, 10) }}
          />
          <TextField
            label="Fecha fin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ 
              minWidth: 200,
              '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                  filter: theme => theme.palette.mode === 'dark' ? 'invert(1)' : 'none'
              }
            }}
            inputProps={{ max: new Date().toISOString().slice(0, 10) }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Campaña</InputLabel>
            <Select
              value={campañaSeleccionada}
              label="Campaña"
              onChange={(e) => setCampañaSeleccionada(e.target.value)}
              disabled={loadingCampañas}
            >
              <MenuItem value="">
                <em>Todas las campañas</em>
              </MenuItem>
              {campañas.map((campaña) => (
                <MenuItem key={campaña} value={campaña}>
                  {campaña}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button 
            variant="outlined" 
            startIcon={<ClearIcon />}
            onClick={limpiarFechas}
            sx={theme => ({ 
              minWidth: '100px', 
              borderColor: theme.palette.mode === 'dark' ? '#666' : '#bbb', 
              color: theme.palette.mode === 'dark' ? '#bbb' : '#666', 
              '&:hover': { 
                borderColor: theme.palette.mode === 'dark' ? '#aaa' : '#888', 
                background: theme.palette.mode === 'dark' ? '#222' : '#eee' 
              } 
            })}
          >
            LIMPIAR
          </Button>
        </Box>
        
        <ButtonGroup sx={{ gap: 2, mt: 1, flexWrap: 'wrap' }}>
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
          <Button
            variant="contained"
            color="secondary"
            startIcon={<CampaignIcon />}
            sx={{ borderRadius: 3, minWidth: 120, fontWeight: 600 }}
            onClick={() => descargarArchivo('campañas')}
          >
            CAMPAÑAS
          </Button>
        </ButtonGroup>
      </Box>
    </Paper>
  );
};

export default Reportes; 