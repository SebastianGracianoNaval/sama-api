import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

const Header = () => (
  <AppBar position="static" sx={{ bgcolor: '#111', boxShadow: 2 }}>
    <Toolbar>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: 32 }}>🎣</span>
        <Typography variant="h5" component="div" sx={{ fontWeight: 700, letterSpacing: 2 }}>
          BeHooked
        </Typography>
      </Box>
    </Toolbar>
  </AppBar>
);

export default Header; 