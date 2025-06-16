import React, { useState, useEffect } from 'react';
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
  const theme = useTheme();

  const cargarWebhooks = async () => {
    setLoading(true);
    try {
      const response = await webhookService.getWebhooks();
      setWebhooks(response.data);
    } catch (error) {
      showToast('Error al cargar los webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarWebhooks();
  }, []);

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
        <List>
          {webhooks.slice(-10).reverse().map((wh, index) => (
            <ListItem 
              key={index}
              divider={index !== webhooks.length - 1}
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
                  maxHeight: '200px',
                  overflow: 'auto',
                  position: 'relative'
                }}
              >
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: theme.palette.mode === 'dark' ? '#fff' : '#333' }}
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(wh.body, null, 2));
                    showToast('Copiado al portapapeles', 'success');
                  }}
                  aria-label="Copiar JSON"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
                <pre style={{ margin: 0, background: 'none', color: theme.palette.text.primary }}>
                  <code style={{ background: 'none', color: theme.palette.text.primary }}>
                    {JSON.stringify(wh.body, null, 2)}
                  </code>
                </pre>
              </Paper>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default Webhooks; 