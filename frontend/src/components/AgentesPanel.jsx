import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Button, IconButton, Tooltip, CircularProgress, Alert, useTheme
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { showToast } from './Toast';

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

  // Cargar listas al montar
  useEffect(() => {
    fetchAgentes().then(setAgentes);
    fetchPlantillas().then(setPlantillas);
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

  const descargar = () => {
    if (!validarFiltros()) return;
    showToast('Descarga simulada (mock)', 'success');
  };

  const buscarKPIs = () => {
    if (!validarFiltros()) return;
    setLoading(true);
    setTimeout(() => {
      setKpis(mockKPIs.filter(k => k.correo === agente));
      setLoading(false);
    }, 700);
  };

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
            {agentes.map((a) => (
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
          variant="outlined"
          startIcon={<ClearIcon />}
          color="secondary"
          sx={theme => ({
            minWidth: '100px',
            bgcolor: theme.palette.mode === 'dark' ? '#fff' : '#f5f5f5',
            color: theme.palette.mode === 'dark' ? '#222' : '#333',
            borderColor: theme.palette.mode === 'dark' ? '#bbb' : '#ccc',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? '#eee' : '#e0e0e0',
              borderColor: theme.palette.mode === 'dark' ? '#888' : '#bbb',
            },
          })}
          onClick={limpiarFiltros}
          disabled={loading}
        >
          Limpiar
        </Button>
      </Box>
      {/* Fila separada para el botón de descargar informe */}
      <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'flex-start' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<FileDownloadIcon />}
          sx={{ minWidth: 160, fontWeight: 700, borderRadius: 2, height: 40 }}
          onClick={descargar}
          disabled={loading}
        >
          Descargar Informe
        </Button>
      </Box>
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