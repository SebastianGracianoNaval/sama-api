import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import { reportService } from '../services/api';
import { showToast } from './Toast';
import { downloadBlobResponse } from '../utils/downloadFile';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';

const ReportesCampanas = () => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [nombrePlantilla, setNombrePlantilla] = useState('');
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPlantillas = async () => {
    try {
      const response = await reportService.getCampanasList();
      setPlantillas(response.data.campanas || []);
    } catch (error) {
      showToast('Error al cargar la lista de plantillas', 'error');
    }
  };

  useEffect(() => {
    fetchPlantillas();
  }, []);

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setNombrePlantilla('');
  };

  const validarFechas = () => {
    if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
      showToast('Debe seleccionar un rango de fechas completo.', 'warning');
      return false;
    }
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      showToast('La fecha fin no puede ser anterior a la fecha de inicio.', 'error');
      return false;
    }
    return true;
  };

  const descargarDetallado = async () => {
    if (!validarFechas()) return;
    setLoading(true);
    try {
      const response = await reportService.downloadCampanas(fechaInicio, fechaFin, nombrePlantilla);
      const fallbackName = `campanas_detallado_${new Date().toISOString()}.csv`;
      downloadBlobResponse(response, fallbackName);
      showToast('Reporte detallado descargado', 'success');
    } catch (error) {
      showToast(error.message || 'Error al descargar el archivo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const descargarResumen = async () => {
    if (!validarFechas()) return;
    setLoading(true);
    try {
      const response = await reportService.downloadCampaignSummary(fechaInicio, fechaFin, nombrePlantilla);
      const fallbackName = `campanas_resumen_${new Date().toISOString()}.csv`;
      downloadBlobResponse(response, fallbackName);
      showToast('Resumen de campaña descargado', 'success');
    } catch (error) {
      showToast(error.message || 'Error al descargar el archivo', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4, overflow: 'hidden' }}>
      <Typography variant="h5" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AssessmentIcon /> Tus campañas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Descargá los reportes de tus campañas, ya sea el detalle completo o un resumen de rendimiento.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Fecha inicio"
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 140, maxWidth: 180 }}
        />
        <TextField
          label="Fecha fin"
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 140, maxWidth: 180 }}
        />
        <FormControl sx={{ width: '350px' }}>
          <InputLabel>Nombre de Plantilla</InputLabel>
          <Select
            value={nombrePlantilla}
            label="Nombre de Plantilla"
            onChange={(e) => setNombrePlantilla(e.target.value)}
          >
            <MenuItem value="">
              <em>Todas las plantillas</em>
            </MenuItem>
            {plantillas.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title="Refrescar lista de plantillas">
          <IconButton onClick={fetchPlantillas} aria-label="refrescar plantillas">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
        <Button 
          variant="outlined" 
          startIcon={<ClearIcon />} 
          onClick={limpiarFiltros} 
          disabled={loading}
          sx={theme => ({
            bgcolor: theme.palette.mode === 'dark' ? '#fff' : '#f5f5f5',
            color: theme.palette.mode === 'dark' ? '#222' : '#333',
            borderColor: theme.palette.mode === 'dark' ? '#bbb' : '#ccc',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? '#eee' : '#e0e0e0',
              borderColor: theme.palette.mode === 'dark' ? '#888' : '#bbb',
            },
          })}
        >
          Limpiar
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<FileDownloadIcon />}
          onClick={descargarDetallado}
          disabled={loading}
        >
          Descargar Detalle
        </Button>
        <Button
          variant="outlined"
          color="success"
          startIcon={<AssessmentIcon />}
          onClick={descargarResumen}
          disabled={loading}
        >
          Obtener Resumen
        </Button>
      </Box>
    </Paper>
  );
};

export default ReportesCampanas; 