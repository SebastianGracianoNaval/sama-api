import React, { useState, useEffect } from 'react';
import { 
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Toolbar, Typography, Divider, useTheme, Paper, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import { reportService } from '../services/api';
import DownloadIcon from '@mui/icons-material/Download';
import CircularProgress from '@mui/material/CircularProgress';
import { saveAs } from 'file-saver';
import { showToast } from '../components/Toast';

const drawerWidth = 220;

const reportTypes = [
  { label: 'Tickets', icon: <AssignmentIcon /> },
  { label: 'Campañas', icon: <DescriptionIcon /> },
];

const ReportesLayout = () => {
  const [selected, setSelected] = useState('Tickets');
  const theme = useTheme();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [nombrePlantilla, setNombrePlantilla] = useState('Todas las plantillas');
  
  const [plantillasList, setPlantillasList] = useState([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);

  const cargarHistorial = () => {
    setLoading(true);
    reportService.getReportesList()
      .then(res => {
        setReportes(res.data.files || []);
      })
      .catch((error) => {
        console.error('Error fetching reportes:', error);
        setReportes([]);
      })
      .finally(() => setLoading(false));
  };

  const cargarPlantillas = async () => {
    setLoadingPlantillas(true);
    try {
      const response = await reportService.getCampanasList();
      if (response.data.success) {
        setPlantillasList(response.data.campanas);
        console.log('Nombres de plantillas cargados:', response.data.campanas);
      }
    } catch (error) {
      console.error('Error al cargar nombres de plantillas:', error);
      showToast('Error al cargar la lista de plantillas', 'error');
    } finally {
      setLoadingPlantillas(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
    cargarPlantillas(); 
  }, []);

  const handleClearFilters = () => {
    setFechaInicio('');
    setFechaFin('');
    setNombrePlantilla('Todas las plantillas');
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
      } else if (selected === 'Campañas') {
        const plantillaParam = nombrePlantilla === 'Todas las plantillas' ? '' : nombrePlantilla;
        response = await reportService.downloadCampanas(fechaInicio, fechaFin, plantillaParam);
        filename = plantillaParam 
          ? `campana_${plantillaParam.replace(/ /g, '_')}_${hora}_${fecha}.csv`
          : `campanas_consolidadas_${hora}_${fecha}.csv`;
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
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
            top: '64px',
            height: 'calc(100% - 64px)',
            transition: 'background 0.2s',
          },
        }}
        PaperProps={{ sx: { top: '64px', height: 'calc(100% - 64px)' } }}
      >
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
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, pt: 1, bgcolor: 'background.default' }}>
        <Toolbar sx={{ minHeight: { xs: 40, sm: 15 } }} />
        <Box sx={{ mb: 3, display: selected ? 'block' : 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0, mb: 1, pb: 1, borderBottom: theme => `1.5px solid ${theme.palette.mode === 'dark' ? '#23272F' : '#e0e0e0'}` }}>
            {selected === 'Tickets' && <AssignmentIcon sx={{ color: theme => theme.palette.mode === 'dark' ? '#fff' : '#004080', fontSize: 36 }} />}
            {selected === 'Campañas' && <DescriptionIcon sx={{ color: theme => theme.palette.mode === 'dark' ? '#fff' : '#004080', fontSize: 36 }} />}
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.5px',
                color: theme => theme.palette.mode === 'dark' ? '#fff' : '#222',
                mb: 0,
              }}
            >
              {selected === 'Tickets' ? 'Tus tickets' : selected === 'Campañas' ? 'Tus campañas' : ''}
            </Typography>
          </Box>
          <Typography variant="subtitle1" sx={{ color: theme => theme.palette.mode === 'dark' ? '#B0B0B0' : '#666', mb: 2, ml: 0, pl: 0, textAlign: 'left' }}>
            {selected === 'Tickets' ? 'Descargá tus tickets filtrando por fecha.' : selected === 'Campañas' ? 'Descargá tus campañas y plantillas filtrando por fecha y nombre.' : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              label="Fecha inicio"
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ 
                minWidth: 140,
                '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                    filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none'
                }
              }}
              inputProps={{ max: new Date().toISOString().slice(0, 10) }}
            />
            <TextField
              label="Fecha fin"
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ 
                minWidth: 140,
                '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                    filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none'
                }
              }}
              inputProps={{ max: new Date().toISOString().slice(0, 10) }}
            />
            {selected === 'Campañas' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Nombre de Plantilla</InputLabel>
                  <Select
                    value={nombrePlantilla}
                    label="Nombre de Plantilla"
                    onChange={(e) => setNombrePlantilla(e.target.value)}
                    disabled={loadingPlantillas}
                  >
                    <MenuItem value="Todas las plantillas">
                      <em>Todas las plantillas</em>
                    </MenuItem>
                    {plantillasList.map((plantilla) => (
                      <MenuItem key={plantilla} value={plantilla}>
                        {plantilla}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Tooltip title="Recargar lista de plantillas">
                  <IconButton onClick={cargarPlantillas} disabled={loadingPlantillas}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleClearFilters}
              disabled={downloading}
              sx={{ minWidth: 100, fontWeight: 500, fontFamily: 'Inter, Montserrat, Poppins, Roboto, Arial', borderRadius: 2, ml: 1 }}
            >
              Limpiar
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleDownloadByFilter}
              disabled={downloading}
              sx={{ minWidth: 120, fontWeight: 700, fontFamily: 'Inter, Montserrat, Poppins, Roboto, Arial', borderRadius: 2, ml: 1 }}
            >
              Descargar
            </Button>
          </Box>
        </Box>
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <HistoryIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h5" fontWeight={700} sx={{ fontFamily: 'Roboto, Arial' }}>
              Historial de exportaciones
            </Typography>
            <Tooltip title="Actualizar historial">
              <IconButton onClick={cargarHistorial} disabled={loading} sx={{ml: 2}}>
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