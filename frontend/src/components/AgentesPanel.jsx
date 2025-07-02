import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Button, IconButton, Tooltip, CircularProgress, Alert, useTheme
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { showToast } from './Toast';
import { reportService } from '../services/api';

// Mock de servicio para obtener correos de agentes y plantillas
const fetchAgentes = async () => {
  // Simular llamada a backend
  return [
    'agente1@empresa.com',
    'agente2@empresa.com',
    'agente3@empresa.com',
  ];
};
const fetchPlantillas = async () => {
  return [
    'Bienvenida',
    'Promoción',
    'Recordatorio',
  ];
};

const mockKPIs = [
  {
    correo: 'agente1@empresa.com',
    totalTickets: 12,
    totalCampanas: 5,
    tasaRespuesta: '85%',
    tiempoPromedio: '1d 2h',
  },
  {
    correo: 'agente2@empresa.com',
    totalTickets: 8,
    totalCampanas: 3,
    tasaRespuesta: '90%',
    tiempoPromedio: '2d 4h',
  },
  {
    correo: 'agente3@empresa.com',
    totalTickets: 15,
    totalCampanas: 7,
    tasaRespuesta: '78%',
    tiempoPromedio: '3d 1h',
  },
];

const AgentesPanel = () => {
  const theme = useTheme();
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [plantillas, setPlantillas] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [plantilla, setPlantilla] = useState('');
  const [agente, setAgente] = useState('');
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState([]);
  const [dataChanged, setDataChanged] = useState(false);
  const prevFilters = useRef({ fechaInicio: '', fechaFin: '', plantilla: '', agente: '' });
  const [error, setError] = useState('');

  // Cargar listas dinámicas de agentes y plantillas al montar
  useEffect(() => {
    const fetchFiltros = async () => {
      try {
        const [resAgentes, resPlantillas] = await Promise.all([
          reportService.getAgentesList(),
          reportService.getPlantillasList()
        ]);
        setAgentes(resAgentes.data || []);
        setPlantillas(resPlantillas.data || []);
      } catch (err) {
        setError('Error al cargar filtros dinámicos');
      }
    };
    fetchFiltros();
  }, []);

  // Detectar cambios en los filtros para habilitar el botón de refrescar
  useEffect(() => {
    const changed =
      fechaInicio !== prevFilters.current.fechaInicio ||
      fechaFin !== prevFilters.current.fechaFin ||
      plantilla !== prevFilters.current.plantilla ||
      agente !== prevFilters.current.agente;
    setDataChanged(changed);
  }, [fechaInicio, fechaFin, plantilla, agente]);

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setPlantilla('');
    setAgente('');
    setKpis([]);
  };

  const refrescarListas = async () => {
    setLoading(true);
    await Promise.all([
      fetchAgentes().then(setAgentes),
      fetchPlantillas().then(setPlantillas),
    ]);
    setLoading(false);
    prevFilters.current = { fechaInicio, fechaFin, plantilla, agente };
    setDataChanged(false);
    showToast('Listas actualizadas', 'success');
  };

  const validarFiltros = () => {
    if (!agente) {
      showToast('Debe seleccionar un agente.', 'error');
      return false;
    }
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

  const descargar = async () => {
    if (!validarFiltros()) return;
    setLoading(true);
    setError('');
    try {
      const response = await reportService.downloadAgentesReport(
        agente,
        fechaInicio || undefined,
        fechaFin || undefined,
        plantilla || undefined
      );
      // Descargar el archivo ZIP
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_agente.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Reporte descargado correctamente', 'success');
    } catch (err) {
      setError(err.message || 'Error al descargar el reporte');
      showToast(err.message || 'Error al descargar el reporte', 'error');
    }
    setLoading(false);
  };

  const buscarKPIs = () => {
    if (!validarFiltros()) return;
    setLoading(true);
    setTimeout(() => {
      setKpis(mockKPIs.filter(k => k.correo === agente));
      setLoading(false);
    }, 700);
  };

  // Cargar listas dinámicas de agentes y plantillas
  const fetchAgentesDinamico = async () => {
    try {
      const res = await reportService.getReportesList();
      // Extraer correos únicos de los reportes
      const archivos = res.data.files || [];
      const correos = new Set();
      archivos.forEach(file => {
        if (file.name.startsWith('atencion_') && file.name.endsWith('.csv')) {
          // Leer el archivo y extraer correos (esto requiere endpoint backend, aquí es mock)
        }
      });
      // Por ahora, usar el mock
      setAgentes(['agente1@empresa.com', 'agente2@empresa.com', 'agente3@empresa.com']);
    } catch {
      setAgentes([]);
    }
  };
  const fetchPlantillasDinamico = async () => {
    try {
      const res = await reportService.getCampanasList();
      // Extraer nombres únicos
      const lista = res.data || [];
      setPlantillas([...new Set(lista)]);
    } catch {
      setPlantillas([]);
    }
  };

  useEffect(() => {
    fetchAgentesDinamico();
    fetchPlantillasDinamico();
  }, []);

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4, overflow: 'hidden' }}>
      <Typography variant="h5" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon sx={{ fontSize: 32, color: theme.palette.mode === 'dark' ? '#fff' : 'primary.main' }} /> Tus Agentes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Consultá el desempeño de tus agentes filtrando por fecha, plantilla y correo.
      </Typography>
      {/* Primera fila: Filtros de fecha */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' }, alignItems: 'center' }}>
        <TextField
          label="Fecha inicio"
          type="date"
          value={fechaInicio}
          onChange={e => setFechaInicio(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{
            flex: 1,
            minWidth: 180,
            maxWidth: 320,
            '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
              filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
            },
          }}
          inputProps={{ max: new Date().toISOString().slice(0, 10) }}
        />
        <TextField
          label="Fecha fin"
          type="date"
          value={fechaFin}
          onChange={e => setFechaFin(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{
            flex: 1,
            minWidth: 180,
            maxWidth: 320,
            '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
              filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
            },
          }}
          inputProps={{ max: new Date().toISOString().slice(0, 10) }}
        />
      </Box>
      {/* Segunda fila: Filtros dinámicos y acciones */}
      <Box sx={{ display: 'flex', gap: 2, mb: 0, flexWrap: { xs: 'wrap', sm: 'nowrap' }, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 220, flex: 1 }}>
          <InputLabel>Nombre de Plantilla</InputLabel>
          <Select
            value={plantilla}
            label="Nombre de Plantilla"
            onChange={e => setPlantilla(e.target.value)}
          >
            <MenuItem value="">
              <em>Todas</em>
            </MenuItem>
            {plantillas.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 220, flex: 1 }} required>
          <InputLabel>Correo del agente</InputLabel>
          <Select
            value={agente}
            label="Correo del agente"
            onChange={e => setAgente(e.target.value)}
            required
          >
            <MenuItem value="">
              <em>Seleccione un agente</em>
            </MenuItem>
            {[...new Set(agentes)].map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Acciones pegadas al filtro de correo */}
        <Tooltip title="Actualizar listas de plantillas y agentes">
          <span>
            <IconButton
              aria-label="refrescar listas"
              onClick={refrescarListas}
              disabled={!dataChanged || loading}
              sx={{ color: theme.palette.mode === 'dark' ? '#fff' : 'inherit' }}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button
          variant="contained"
          color="primary"
          startIcon={<FileDownloadIcon />}
          onClick={descargar}
          disabled={loading}
          sx={{ minWidth: 200, fontWeight: 600 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'DESCARGAR INFORME'}
        </Button>
        <Tooltip title="Limpiar filtros">
          <IconButton onClick={limpiarFiltros}>
            <ClearIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Box sx={{ mt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={28} />
            <Typography>Cargando KPIs...</Typography>
          </Box>
        ) : kpis.length === 0 ? (
          <Alert severity="info">
            Es obligatorio seleccionar un agente para descargar los informes.
          </Alert>
        ) : (
          <Box sx={{ mt: 2 }}>
            {/* Aquí iría la tabla de KPIs, si la necesitas */}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default AgentesPanel; 