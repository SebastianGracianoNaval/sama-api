import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const Header = ({ mode, toggleMode }) => (
  <AppBar position="static" sx={{ bgcolor: 'primary.main', boxShadow: 2 }}>
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <img src="/hook_icon_svg.svg" alt="BeHooked Logo" style={{ height: 36 }} />
        <Typography variant="h5" component="div" sx={{ fontWeight: 700, letterSpacing: 2 }}>
          BeHooked
        </Typography>
      </Box>
      <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
        <IconButton color="inherit" onClick={toggleMode}>
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Tooltip>
    </Toolbar>
  </AppBar>
);

export default Header; 