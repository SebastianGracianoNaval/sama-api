import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const MaterialSwitch = styled(Switch)(({ theme }) => ({
  width: 62,
  height: 34,
  padding: 7,
  '& .MuiSwitch-switchBase': {
    margin: 1,
    padding: 0,
    transform: 'translateX(6px)',
    '&.Mui-checked': {
      color: '#fff',
      transform: 'translateX(22px)',
      '& .MuiSwitch-thumb:before': {
        content: '""',
        position: 'absolute',
        width: '100%',
        height: '100%',
        left: 0,
        top: 0,
        background: `url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'><path fill=\'%23fff\' d=\'M4.22 10.22a7 7 0 0 0 9.56 9.56A7 7 0 1 1 4.22 10.22z\'/></svg>') no-repeat center center`,
      },
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
        opacity: 1,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: theme.palette.mode === 'dark' ? '#003366' : '#4CAF50',
    width: 32,
    height: 32,
    '&:before': {
      content: '""',
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: 0,
      top: 0,
      background: `url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'><path fill=\'%23fff\' d=\'M12.34 17.66a8 8 0 1 1 0-11.32 8 8 0 0 1 0 11.32z\'/></svg>') no-repeat center center`,
    },
  },
  '& .MuiSwitch-track': {
    borderRadius: 20 / 2,
    backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
    opacity: 1,
  },
}));

const Header = ({ mode, toggleMode }) => (
  <AppBar position="static" sx={{ bgcolor: 'primary.main', boxShadow: 2 }}>
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <img src="/hook_icon_svg.svg" alt="BeHooked Logo" style={{ height: 36 }} />
        <Typography variant="h5" component="div" sx={{ fontWeight: 700, letterSpacing: 2 }}>
          BeHooked
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        <MaterialSwitch
          checked={mode === 'dark'}
          onChange={toggleMode}
          inputProps={{ 'aria-label': 'Modo oscuro' }}
        />
      </Box>
    </Toolbar>
  </AppBar>
);

export default Header; 