import React, { useState, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Header from './components/Header';
import ReportesLayout from './pages/ReportesLayout';
import ReportesFabButton from './components/ReportesFabButton';
import Toast from './components/Toast';

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: '#003366',
    },
    secondary: {
      main: '#4CAF50',
    },
    background: {
      default: mode === 'dark' ? '#181C23' : '#F2F2F2',
      paper: mode === 'dark' ? '#23272F' : '#fff',
    },
    text: {
      primary: mode === 'dark' ? '#F2F2F2' : '#222222',
      secondary: mode === 'dark' ? '#B0B0B0' : '#666666',
    },
  },
});

function App() {
  const [mode, setMode] = useState('light');
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);
  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };
  const location = useLocation();
  const isReportesPage = location.pathname.startsWith('/reportes');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toast />
      <Header mode={mode} toggleMode={toggleMode} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/reportes/*" element={<ReportesLayout />} />
      </Routes>
      {!isReportesPage && <ReportesFabButton />}
    </ThemeProvider>
  );
}

export default App;
