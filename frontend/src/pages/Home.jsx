import React from 'react';
import { Container, Box } from '@mui/material';
import Reportes from '../components/Reportes';
import Webhooks from '../components/Webhooks';
import Toast from '../components/Toast';

const Home = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Toast />
      <Box sx={{ mb: 4 }}>
        <Reportes />
      </Box>
      <Box>
        <Webhooks />
      </Box>
    </Container>
  );
};

export default Home; 