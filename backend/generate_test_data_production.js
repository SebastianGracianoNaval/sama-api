const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://sama-api-wppm.onrender.com';

// Configuración de agentes y plantillas
const agentes = [
  'agente1@empresa.com',
  'agente2@empresa.com',
  'agente3@empresa.com',
  'agente4@empresa.com',
];
const plantillas = [
  { nombre: 'Bienvenida', id: 'tpl1' },
  { nombre: 'Promocion', id: 'tpl2' },
  { nombre: 'Recordatorio', id: 'tpl3' },
];

// Limpiar datos previos
function limpiarDatos() {
  const rutas = [
    path.join(__dirname, 'data', 'tickets'),
    path.join(__dirname, 'data', 'reportes'),
  ];
  rutas.forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach((f) => {
        const filePath = path.join(dir, f);
        if (fs.lstatSync(filePath).isFile()) fs.unlinkSync(filePath);
      });
    }
  });
  console.log('🧹 Datos previos eliminados.');
}

async function generarAtencionBOT(idx, agente, fechaBase) {
  const contacto = `54911690076${idx + 10}@wa.gw.msging.net`;
  const sequentialId = `B${idx + 1}`;
  // 1. Ticket de apertura
  await axios.post(`${API_URL}/webhook`, {
    id: `ticket_bot_${sequentialId}`,
    type: 'application/vnd.iris.ticket+json',
    from: contacto,
    to: 'bot@msging.net',
    content: {
      sequentialId,
      parentSequentialId: null,
      status: 'open',
      team: 'default',
    },
    metadata: {
      '#envelope.storageDate': fechaBase,
    },
  });
  // 2. Mensaje del cliente
  await axios.post(`${API_URL}/webhook`, {
    id: `msg_bot_${sequentialId}_1`,
    type: 'text/plain',
    from: contacto,
    to: 'bot@msging.net',
    content: 'Hola, soy cliente',
    metadata: { '#envelope.storageDate': fechaBase },
  });
  // 3. Mensaje del bot
  await axios.post(`${API_URL}/webhook`, {
    id: `msg_bot_${sequentialId}_2`,
    type: 'text/plain',
    from: 'bot@msging.net',
    to: contacto,
    content: 'Hola, ¿en qué puedo ayudarte?',
    metadata: { '#envelope.storageDate': fechaBase },
  });
  // 4. Evento de cierre
  await axios.post(`${API_URL}/api/bot-event`, {
    correoAgente: agente,
    ticketFinalizo: true,
    identity: contacto,
    tipoEvento: 'finalizacion_ticket',
    tipoCierre: 'resuelto',
  });
  console.log(`✅ Atencion BOT ${sequentialId} generada para ${agente}`);
}

async function generarAtencionPLANTILLA(idx, agente, plantilla, fechaBase) {
  const contacto = `54911690076${idx + 20}@wa.gw.msging.net`;
  const sequentialId = `P${idx + 1}`;
  // 1. Enviar plantilla
  await axios.post(`${API_URL}/webhook`, {
    id: `plantilla_${sequentialId}`,
    type: 'application/vnd.iris.template+json',
    from: 'bot@msging.net',
    to: contacto,
    content: {
      template: { name: plantilla.nombre },
      templateContent: { name: plantilla.nombre },
      type: 'template',
    },
    metadata: {
      '#envelope.storageDate': fechaBase,
      '#activecampaign.flowId': plantilla.id,
      '#activecampaign.name': plantilla.nombre,
    },
  });
  // 2. Ticket generado por plantilla
  await axios.post(`${API_URL}/webhook`, {
    id: `ticket_plantilla_${sequentialId}`,
    type: 'application/vnd.iris.ticket+json',
    from: contacto,
    to: 'bot@msging.net',
    content: {
      sequentialId,
      parentSequentialId: null,
      status: 'open',
      team: 'default',
    },
    metadata: {
      '#envelope.storageDate': fechaBase,
    },
  });
  // 3. Mensaje del cliente
  await axios.post(`${API_URL}/webhook`, {
    id: `msg_plantilla_${sequentialId}_1`,
    type: 'text/plain',
    from: contacto,
    to: 'bot@msging.net',
    content: 'Recibí la plantilla',
    metadata: { '#envelope.storageDate': fechaBase },
  });
  // 4. Evento de cierre
  await axios.post(`${API_URL}/api/bot-event`, {
    correoAgente: agente,
    ticketFinalizo: true,
    identity: contacto,
    tipoEvento: 'finalizacion_ticket',
    tipoCierre: 'resuelto',
  });
  console.log(`✅ Atencion PLANTILLA ${sequentialId} generada para ${agente} (${plantilla.nombre})`);
}

async function generarTransferencia(idx, agenteOrigen, agenteDestino, fechaBase) {
  const contacto = `54911690076${idx + 30}@wa.gw.msging.net`;
  // Ticket padre
  await axios.post(`${API_URL}/webhook`, {
    id: `ticket_transfer_${idx}_padre`,
    type: 'application/vnd.iris.ticket+json',
    from: contacto,
    to: 'bot@msging.net',
    content: {
      sequentialId: `T${idx}A`,
      parentSequentialId: null,
      status: 'open',
      team: 'default',
    },
    metadata: {
      '#envelope.storageDate': fechaBase,
    },
  });
  // Ticket hijo (transferencia)
  await axios.post(`${API_URL}/webhook`, {
    id: `ticket_transfer_${idx}_hijo`,
    type: 'application/vnd.iris.ticket+json',
    from: contacto,
    to: 'bot@msging.net',
    content: {
      sequentialId: `T${idx}B`,
      parentSequentialId: `T${idx}A`,
      status: 'open',
      team: 'DIRECT_TRANSFER',
      agentIdentity: agenteDestino,
    },
    metadata: {
      '#envelope.storageDate': fechaBase,
    },
  });
  // Mensaje del cliente
  await axios.post(`${API_URL}/webhook`, {
    id: `msg_transfer_${idx}_1`,
    type: 'text/plain',
    from: contacto,
    to: 'bot@msging.net',
    content: 'Quiero que me transfieran',
    metadata: { '#envelope.storageDate': fechaBase },
  });
  // Evento de cierre para el agente destino
  await axios.post(`${API_URL}/api/bot-event`, {
    correoAgente: agenteDestino,
    ticketFinalizo: true,
    identity: contacto,
    tipoEvento: 'finalizacion_ticket',
    tipoCierre: 'transferido',
  });
  console.log(`✅ Transferencia generada de ${agenteOrigen} a ${agenteDestino}`);
}

async function generateTestDataProduction() {
  console.log('=== GENERANDO DATOS DE PRUEBA EN PRODUCCIÓN ===');
  limpiarDatos();
  try {
    // Fechas base
    const hoy = new Date();
    // 3 atenciones BOT
    for (let i = 0; i < 3; i++) {
      const fecha = new Date(hoy.getTime() - (i * 86400000)).toISOString();
      await generarAtencionBOT(i, agentes[i], fecha);
    }
    // 3 atenciones PLANTILLA
    for (let i = 0; i < 3; i++) {
      const fecha = new Date(hoy.getTime() - ((i + 3) * 86400000)).toISOString();
      await generarAtencionPLANTILLA(i, agentes[(i + 1) % agentes.length], plantillas[i], fecha);
    }
    // 2 transferencias (entre agentes distintos)
    await generarTransferencia(1, agentes[0], agentes[1], hoy.toISOString());
    await generarTransferencia(2, agentes[2], agentes[3], hoy.toISOString());
    console.log('🎉 Datos de prueba generados correctamente.');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

generateTestDataProduction(); 