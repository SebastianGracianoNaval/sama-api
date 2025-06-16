import React, { useEffect, useRef } from 'react';
import { Button, useTheme } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { useNavigate } from 'react-router-dom';

const ReportesFabButton = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const btnRef = useRef();

  useEffect(() => {
    const interval = setInterval(() => {
      if (btnRef.current) {
        btnRef.current.animate([
          { transform: 'translateY(0)' },
          { transform: 'translateY(-18px) scale(1.08)' },
          { transform: 'translateY(0)' }
        ], {
          duration: 700,
          easing: 'cubic-bezier(.4,0,.2,1)'
        });
      }
    }, 20000); // cada 20 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <Button
      ref={btnRef}
      variant="contained"
      startIcon={<DescriptionIcon sx={{ fontSize: 32, mb: '2px' }} />}
      onClick={() => navigate('/reportes')}
      sx={{
        position: 'fixed',
        right: { xs: 16, sm: 32 },
        bottom: { xs: 16, sm: 32 },
        zIndex: 2000,
        bgcolor: theme.palette.mode === 'dark' ? '#0059b3' : '#004080',
        color: '#fff',
        borderRadius: '12px',
        fontWeight: 800,
        fontFamily: 'Montserrat, Poppins, Roboto, Arial',
        fontSize: { xs: '1.2rem', sm: '1.4rem' },
        px: 4,
        py: 2.2,
        boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
        letterSpacing: '0.5px',
        textTransform: 'none',
        transition: 'background-color 0.2s, box-shadow 0.2s, transform 0.2s',
        textShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0,0,0,0.18)' : 'none',
        '&:hover': {
          bgcolor: '#0059b3',
          color: '#fff',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.22)',
          transform: 'scale(1.04)',
        },
      }}
    >
      Reportes
    </Button>
  );
};

export default ReportesFabButton; 