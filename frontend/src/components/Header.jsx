import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/material/styles';
import NightlightRoundIcon from '@mui/icons-material/NightlightRound';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';

const MinimalSwitch = styled(Switch)(({ theme }) => ({
  width: 40,
  height: 20,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 2,
    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: theme.palette.primary.main,
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.mode === 'dark' ? '#1976d2' : '#90caf9',
        opacity: 1,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    width: 16,
    height: 16,
    boxShadow: 'none',
  },
  '& .MuiSwitch-track': {
    borderRadius: 20 / 2,
    backgroundColor: theme.palette.mode === 'dark' ? '#1976d2' : '#90caf9',
    opacity: 1,
  },
}));

const Header = ({ mode, toggleMode }) => (
  <AppBar position="static" sx={{ bgcolor: 'primary.main', boxShadow: 2 }}>
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
        <Typography
          variant="h6"
          noWrap
          component={RouterLink}
          to="/"
          sx={{
            mr: 2,
            fontFamily: 'Poppins, Inter, Roboto Slab, Arial',
            fontWeight: 700,
            color: 'inherit',
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}
        >
          Be Hooked
        </Typography>
        <Button
          component={RouterLink}
          to="/reportes"
          color="inherit"
          sx={{ ml: 2, fontWeight: 500 }}
        >
          Reportes
        </Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <NightlightRoundIcon fontSize="small" />}
        <MinimalSwitch
          checked={mode === 'dark'}
          onChange={toggleMode}
          inputProps={{ 'aria-label': 'Modo oscuro' }}
        />
      </Box>
    </Toolbar>
  </AppBar>
);

export default Header; 