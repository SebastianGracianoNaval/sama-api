import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { webhookService } from '../services/api';
import { showToast } from './Toast';

const Webhooks = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(10);
  const [jsonHeights, setJsonHeights] = useState({});
  const theme = useTheme();

  const cargarWebhooks = async () => {
    setLoading(true);
    try {
      const response = await webhookService.getWebhooks();
      setWebhooks(response.data);
      setDisplayedCount(10); // Resetear a 10 al recargar
    } catch (error) {
      showToast('Error al cargar los webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cargarMas = async () => {
    setLoadingMore(true);
    try {
      // Simular carga de más datos (en realidad ya tenemos todos los webhooks)
      // En un futuro, esto podría ser una llamada al backend con paginación
      setTimeout(() => {
        setDisplayedCount(prev => Math.min(prev + 10, webhooks.length));
        setLoadingMore(false);
      }, 500);
    } catch (error) {
      showToast('Error al cargar más webhooks', 'error');
      setLoadingMore(false);
    }
  };

  // Función para calcular la altura del JSON
  const calcularAlturaJson = (jsonString) => {
    const lineas = jsonString.split('\n').length;
    const alturaPorLinea = 20; // altura aproximada por línea
    const alturaMinima = 100; // altura mínima
    const alturaMaxima = 400; // altura máxima antes de mostrar scroll
    const alturaCalculada = lineas * alturaPorLinea;
    
    return Math.max(alturaMinima, Math.min(alturaCalculada, alturaMaxima));
  };

  useEffect(() => {
    cargarWebhooks();
  }, []);

  // Calcular alturas cuando cambian los webhooks mostrados
  useEffect(() => {
    const nuevasAlturas = {};
    webhooks.slice(-displayedCount).reverse().forEach((wh, index) => {
      const jsonString = JSON.stringify(wh.body, null, 2);
      nuevasAlturas[index] = calcularAlturaJson(jsonString);
    });
    setJsonHeights(nuevasAlturas);
  }, [webhooks, displayedCount]);

  const webhooksMostrados = webhooks.slice(-displayedCount).reverse();

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Últimos webhooks recibidos
        </Typography>
        <IconButton 
          onClick={cargarWebhooks} 
          disabled={loading}
          color="primary"
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {webhooks.length === 0 ? (
        <Typography color="text.secondary">
          No se ha recibido ningún webhook aún.
        </Typography>
      ) : (
        <>
          <List>
            {webhooksMostrados.map((wh, index) => (
              <ListItem 
                key={index}
                divider={index !== webhooksMostrados.length - 1}
                sx={{ flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    {new Date(wh.fecha).toLocaleString()}
                  </Typography>
                  <Chip 
                    label={wh.tipo && wh.tipo !== 'desconocido' ? wh.tipo.toUpperCase() : 'Tipo desconocido'}
                    color={wh.tipo && wh.tipo !== 'desconocido' ? 'primary' : 'default'}
                    size="small"
                  />
                </Box>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    width: '100%', 
                    bgcolor: theme.palette.mode === 'dark' ? '#23272F' : 'grey.50',
                    height: jsonHeights[index] || 200,
                    overflow: 'auto',
                    position: 'relative',
                    transition: 'height 0.3s ease-in-out'
                  }}
                >
                  <IconButton
                    size="small"
                    sx={{ position: 'sticky', top: 8, right: 8, float: 'right', zIndex: 2, bgcolor: 'background.paper', boxShadow: 1 }}
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(wh.body, null, 2));
                      showToast('Copiado al portapapeles', 'success');
                    }}
                    aria-label="Copiar JSON"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <pre style={{ 
                    margin: 0, 
                    background: 'none', 
                    color: theme.palette.text.primary,
                    fontSize: '12px',
                    lineHeight: '1.4',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                  }}>
                    <code style={{ background: 'none', color: theme.palette.text.primary }}>
                      {JSON.stringify(wh.body, null, 2)}
                    </code>
                  </pre>
                </Paper>
              </ListItem>
            ))}
          </List>
          
          {displayedCount < webhooks.length && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={cargarMas}
                disabled={loadingMore}
                sx={{ 
                  borderRadius: 2, 
                  px: 3, 
                  py: 1,
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                {loadingMore ? 'Cargando...' : `Cargar más (${webhooks.length - displayedCount} restantes)`}
              </Button>
            </Box>
          )}
          
          {webhooks.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Mostrando {webhooksMostrados.length} de {webhooks.length} webhooks
              </Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default Webhooks; 