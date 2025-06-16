import React, { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, useTheme, Paper, Button } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import { reportService } from '../services/api';
import DownloadIcon from '@mui/icons-material/Download';
import CircularProgress from '@mui/material/CircularProgress';
import { saveAs } from 'file-saver';

const drawerWidth = 220;

const reportTypes = [
  { label: 'Tickets', icon: <AssignmentIcon /> },
  { label: 'Plantillas', icon: <DescriptionIcon /> },
];

const ReportesLayout = () => {
  const [selected, setSelected] = useState('Tickets');
  const theme = useTheme();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
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
  }, []);

  const handleDownload = async (filename) => {
    setDownloading(filename);
    try {
      const response = await reportService.downloadReporte(filename);
      saveAs(new Blob([response.data]), filename);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error al descargar el archivo');
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
            bgcolor: theme.palette.mode === 'dark' ? '#23272F' : '#f5f7fa',
            borderRight: 0,
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
                  sx={{ borderRadius: 2, mx: 1, my: 0.5 }}
                >
                  <ListItemIcon sx={{ color: selected === item.label ? 'primary.main' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} sx={{ color: selected === item.label ? 'primary.main' : 'text.secondary' }} />
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
      <Box component="main" sx={{ flexGrow: 1, p: 4, bgcolor: 'background.default' }}>
        <Toolbar />
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <HistoryIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h5" fontWeight={700}>
              Historial de exportaciones
            </Typography>
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