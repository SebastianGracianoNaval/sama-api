import React, { useState, useEffect } from 'react';
import { 
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Toolbar, Typography, Divider, useTheme, Paper, Button, TextField,
  IconButton, Tooltip, CssBaseline
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import { reportService } from '../services/api';
import DownloadIcon from '@mui/icons-material/Download';
import CircularProgress from '@mui/material/CircularProgress';
import { saveAs } from 'file-saver';
import { showToast } from '../components/Toast';
import ReportesCampanas from '../components/ReportesCampanas';
import AgentesPanel from '../components/AgentesPanel';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const drawerWidth = 220;

const reportTypes = [
  { label: 'Tickets', icon: <AssignmentIcon /> },
  { label: 'Campañas', icon: <DescriptionIcon /> },
  { label: 'Agentes', icon: <PersonIcon /> },
];

const ReportesLayout = () => {
  const [selected, setSelected] = useState('Tickets');
  const theme = useTheme();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const cargarHistorial = () => {
    setLoading(true);
    reportService.getReportesList()
      .then(res => {
        setReportes(res.data.files || []);
      })
      .catch((error) => {
        console.error('Error fetching reportes:', error);
        showToast('Error al obtener el historial de reportes.', 'error');
        setReportes([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const handleClearFilters = () => {
    setFechaInicio('');
    setFechaFin('');
  };

  const handleDownload = async (filename) => {
    setDownloading(filename);
    try {
      const response = await reportService.downloadReporte(filename);
      saveAs(new Blob([response.data]), filename);
      setTimeout(cargarHistorial, 2000);
    } catch (error) {
      console.error('Error downloading file:', error);
      const backendMsg = error?.response?.data?.message || error?.response?.data?.error || 'Error al descargar el archivo';
      showToast(backendMsg, 'error');
    } finally {
      setDownloading('');
    }
  };

  const handleDownloadByFilter = async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    if (fechaInicio && !fechaFin) {
      showToast('Por favor, especifique fecha fin.', 'error');
      return;
    }
    if (fechaFin && !fechaInicio) {
      showToast('Por favor, especifique fecha inicio.', 'error');
      return;
    }
    if (fechaInicio && fechaFin) {
      if (fechaFin < fechaInicio) {
        showToast('La fecha fin no puede ser anterior a la fecha inicio.', 'error');
        return;
      }
      if (fechaInicio > hoy || fechaFin > hoy) {
        showToast('No se pueden seleccionar fechas futuras.', 'error');
        return;
      }
    }
    setDownloading('filtro');
    try {
      let response;
      let filename = '';
      const now = new Date();
      const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
      const fecha = now.toISOString().slice(0,10);

      if (selected === 'Tickets') {
        response = await reportService.downloadTickets(fechaInicio, fechaFin);
        filename = `reporte_tickets_${hora}_${fecha}.zip`;
      }
      
      saveAs(new Blob([response.data]), filename);
      showToast('Descarga iniciada correctamente', 'success');
      setTimeout(cargarHistorial, 2000);
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast(error.message || 'Error al descargar el archivo', 'error');
    } finally {
      setDownloading('');
    }
  };

  // --- FUNCIÓN PARA DESCARGAR INFORME DE TICKETS ---
  const descargarArchivo = async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    if (fechaInicio && !fechaFin) {
      showToast('Por favor, especifique fecha fin.', 'error');
      return;
    }
    if (fechaFin && !fechaInicio) {
      showToast('Por favor, especifique fecha inicio.', 'error');
      return;
    }
    if (fechaInicio && fechaFin) {
      if (fechaFin < fechaInicio) {
        showToast('La fecha fin no puede ser anterior a la fecha inicio.', 'error');
        return;
      }
      if (fechaInicio > hoy || fechaFin > hoy) {
        showToast('No se pueden seleccionar fechas futuras.', 'error');
        return;
      }
    }
    setDownloading(true);
    try {
      const now = new Date();
      const hora = now.toTimeString().slice(0,8).replace(/:/g, '-');
      const fecha = now.toISOString().slice(0,10);
      const response = await reportService.downloadTickets(fechaInicio, fechaFin);
      const filename = `tickets_consolidado_${hora}_${fecha}.csv`;
      saveAs(new Blob([response.data]), filename);
      showToast('Archivo descargado correctamente', 'success');
      setTimeout(cargarHistorial, 2000);
    } catch (error) {
      showToast(error.message || 'Error al descargar el archivo', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: theme.palette.mode === 'dark' ? '#23272F' : '#F3F4F6',
            borderRight: theme.palette.mode === 'dark' ? 0 : '1px solid #e0e0e0',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', pt: 2 }}>
          <List>
            {reportTypes.map((item) => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton
                  selected={selected === item.label}
                  onClick={() => setSelected(item.label)}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    my: 0.5,
                    bgcolor: selected === item.label ? (theme.palette.mode === 'dark' ? '#4FC3F7' : '#E0E3EA') : 'transparent',
                    color: selected === item.label ? (theme.palette.mode === 'dark' ? '#fff' : '#222') : (theme.palette.mode === 'dark' ? 'text.secondary' : '#444'),
                    fontFamily: 'Montserrat, Poppins, Roboto, Arial',
                    fontWeight: selected === item.label ? 700 : 500,
                    boxShadow: selected === item.label ? (theme.palette.mode === 'dark' ? '0 2px 8px 0 rgba(80,180,255,0.10)' : 'none') : 'none',
                    transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                    '& .MuiListItemIcon-root': {
                      color: selected === item.label ? (theme.palette.mode === 'dark' ? '#fff' : '#222') : (theme.palette.mode === 'dark' ? 'text.secondary' : '#888'),
                    },
                    '&:hover': {
                      bgcolor: selected === item.label ? (theme.palette.mode === 'dark' ? '#29B6F6' : '#E0E3EA') : (theme.palette.mode === 'dark' ? '#23272F' : '#ECEFF4'),
                    },
                  }}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontFamily: 'Roboto, Arial',
                      fontWeight: selected === item.label ? 700 : 400,
                      fontSize: '1rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ px: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Próximamente más reportes...
            </Typography>
          </Box>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default' }}>
        <Toolbar />
        {selected === 'Tickets' && (
          <Paper elevation={3} sx={{ p: 3, mb: 4, overflow: 'hidden' }}>
            <Typography variant="h5" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon sx={{ fontSize: 32, color: theme.palette.mode === 'dark' ? '#fff' : 'primary.main' }} /> Tus Tickets
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Descargá el detalle de tus tickets filtrando por fecha.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 0, flexWrap: { xs: 'wrap', sm: 'nowrap' }, alignItems: 'center' }}>
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
                onClick={() => { setFechaInicio(''); setFechaFin(''); }}
                disabled={!!downloading}
              >
                Limpiar
              </Button>
            </Box>
            <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<FileDownloadIcon />}
                sx={{ minWidth: 160, fontWeight: 700, borderRadius: 2, height: 40 }}
                onClick={descargarArchivo}
                disabled={!!downloading}
              >
                Descargar Informe
              </Button>
            </Box>
          </Paper>
        )}
        {selected === 'Campañas' && (
          <ReportesCampanas />
        )}
        {selected === 'Agentes' && (
          <AgentesPanel />
        )}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <HistoryIcon sx={{ mr: 1, color: theme => theme.palette.mode === 'dark' ? '#fff' : 'primary.main' }} />
            <Typography variant="h5" fontWeight={700} sx={{ fontFamily: 'Roboto, Arial' }}>
              Historial de exportaciones
            </Typography>
            <Tooltip title="Actualizar historial">
              <IconButton onClick={cargarHistorial} disabled={loading} sx={{ml: 2, color: theme => theme.palette.mode === 'dark' ? '#fff' : 'inherit'}}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={24} />
              <Typography>Cargando reportes...</Typography>
            </Box>
          ) : reportes.length === 0 ? (
            <Typography color="text.secondary">No hay reportes exportados aún.</Typography>
          ) : (
            <Box>
              {reportes.map((r) => (
                <Box key={r.name} sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, borderRadius: 1, bgcolor: 'background.paper', boxShadow: 1 }}>
                  <Typography sx={{ flex: 1 }}>{r.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>{new Date(r.fecha).toLocaleString()}</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={downloading === r.name ? <CircularProgress size={16} /> : <DownloadIcon />}
                    onClick={() => handleDownload(r.name)}
                    disabled={!!downloading}
                    sx={{
                      color: theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.main,
                      borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.23)',
                      '&:hover': {
                        borderColor: theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.main,
                      }
                    }}
                  >
                    Descargar
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ReportesLayout; 