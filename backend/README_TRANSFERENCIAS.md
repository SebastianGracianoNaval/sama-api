# Sistema de Transferencias de Tickets - Documentación

## 📋 **Resumen de Cambios**

Se ha implementado un sistema completo de tracking de transferencias que permite:

- **Cada transferencia genera un ticket individual** con su propio CSV
- **Tracking de relaciones padre-hijo** entre tickets
- **Historial completo de transferencias** en el CSV consolidado
- **Separación por tipo**: BOT vs PLANTILLA
- **Información detallada** de transferencias (agente, cola, tipo)
- **Exportación de ambos tickets** (padre e hijo) en el CSV consolidado

## 🔄 **Flujo de Transferencias**

### **1. Ticket Raíz (Sin parentSequentialId)**
```json
{
  "type": "application/vnd.iris.ticket+json",
  "content": {
    "sequentialId": 200,
    "team": "Default",
    // Sin parentSequentialId
  }
}
```

### **2. Transferencia Directa a Agente**
```json
{
  "type": "application/vnd.iris.ticket+json",
  "content": {
    "sequentialId": 201,
    "parentSequentialId": 200,
    "team": "DIRECT_TRANSFER",
    "agentIdentity": "hola%40bewise.com.es@blip.ai"
  }
}
```

### **3. Transferencia a Cola**
```json
{
  "type": "application/vnd.iris.ticket+json",
  "content": {
    "sequentialId": 202,
    "parentSequentialId": 200,
    "team": "Soporte_Tecnico"
    // Sin agentIdentity
  }
}
```

## 📊 **Estructura del CSV Exportado**

### **Ticket Padre (SequentialId: 200)**
```csv
id,sequentialId,status,team,unreadMessages,storageDate,timestamp,estadoTicket,fechaCierre,tipoCierre,fechaFiltro,tipoDato,procesadoEn,conversacion,contacto,agente,duracion,TIPO,transferencia,ticket_padre,ticket_hijo,tipo_transferencia,agente_transferido,cola_transferida,historial_transferencias,cantidad_transferencias,parentSequentialId
27d2eb38-d1bf-45f9-9334-0197a86ca2de,200,Waiting,Default,0,2025-06-25T18:49:21Z,2025-06-25T18:49:21Z,cerrado,2025-06-25T18:50:02.818Z,Por Agente,2025-06-25,ticket_reporte,2025-06-25T18:50:02.822Z,[agente]: mensaje1\n[cliente]: respuesta1,5491169007611,sebastian@bewise.com.es,0d 0h 0m 30s,BOT,TRUE,,201,AGENTE,hola@bewise.com.es,DIRECT_TRANSFER,200 → 201,1,
```

### **Ticket Hijo (SequentialId: 201)**
```csv
id,sequentialId,status,team,unreadMessages,storageDate,timestamp,estadoTicket,fechaCierre,tipoCierre,fechaFiltro,tipoDato,procesadoEn,conversacion,contacto,agente,duracion,TIPO,transferencia,ticket_padre,ticket_hijo,tipo_transferencia,agente_transferido,cola_transferida,historial_transferencias,cantidad_transferencias,parentSequentialId
28d2eb38-d1bf-45f9-9334-0197a86ca2de,201,Waiting,DIRECT_TRANSFER,0,2025-06-25T18:49:41Z,2025-06-25T18:49:41Z,cerrado,2025-06-25T18:50:02.818Z,Por Agente,2025-06-25,ticket_reporte,2025-06-25T18:50:02.822Z,[agente]: 201\n[agente]: chauchacuhau\n[cliente]: blalblablabl,5491169007611,hola@bewise.com.es,0d 0h 0m 21s,BOT,TRUE,200,,AGENTE,hola@bewise.com.es,DIRECT_TRANSFER,200 → 201,1,200
```

## 🔧 **Campos de Transferencia**

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `transferencia` | Indica si el ticket es parte de una transferencia | "TRUE" / "FALSE" |
| `ticket_padre` | SequentialId del ticket padre (solo para hijos) | "200" |
| `ticket_hijo` | SequentialId del ticket hijo (solo para padres) | "201" |
| `tipo_transferencia` | Tipo de transferencia realizada | "AGENTE" / "COLA" |
| `agente_transferido` | Email del agente (para transferencias directas) | "hola@bewise.com.es" |
| `cola_transferida` | Nombre de la cola o "DIRECT_TRANSFER" | "DIRECT_TRANSFER" / "Soporte_Tecnico" |
| `historial_transferencias` | Ruta completa de transferencias | "200 → 201" |
| `cantidad_transferencias` | Número total de transferencias | 1 |

## 🎯 **Mejoras Implementadas**

### **1. Generación de Archivos Individuales**
- **Cada ticket genera su propio archivo CSV** en la carpeta `data/reportes/`
- **Archivos nombrados**: `ticket_{sequentialId}_{fecha}.csv`
- **Información completa** de cada ticket individual

### **2. CSV Consolidado Mejorado**
- **Incluye ambos tickets** (padre e hijo) en el mismo archivo
- **Relaciones claras** entre tickets padre e hijo
- **Información de transferencias** completa y detallada

### **3. Manejo Correcto del Team**
- **Ticket padre**: Mantiene su team original (ej: "Default")
- **Ticket hijo**: Usa "DIRECT_TRANSFER" en team y cola_transferida
- **Transferencias a cola**: Usa el nombre de la cola en ambos campos

### **4. Tracking de Agentes**
- **Agente del ticket padre**: Agente que cerró el ticket
- **Agente transferido**: Agente específico en transferencias directas
- **Información decodificada** de agentIdentity

## 🚀 **Uso del Sistema**

### **1. Procesamiento Automático**
Los webhooks se procesan automáticamente:
```javascript
// Ticket raíz llega
POST /webhook
{
  "type": "application/vnd.iris.ticket+json",
  "content": {
    "sequentialId": 200,
    "team": "Default"
  }
}

// Transferencia llega
POST /webhook
{
  "type": "application/vnd.iris.ticket+json",
  "content": {
    "sequentialId": 201,
    "parentSequentialId": 200,
    "team": "DIRECT_TRANSFER",
    "agentIdentity": "hola%40bewise.com.es@blip.ai"
  }
}
```

### **2. Cierre de Tickets**
```javascript
// Cerrar tickets
POST /bot-event
{
  "correoAgente": "hola@bewise.com.es",
  "ticketFinalizo": true,
  "identity": "5491169007611@wa.gw.msging.net",
  "tipoCierre": "Por Agente"
}
```

### **3. Descarga de Reportes**
```javascript
// Descargar CSV consolidado
GET /descargar/tickets
// Retorna: tickets_bot.csv con ambos tickets
```

## 📁 **Estructura de Archivos**

```
backend/data/
├── tickets/
│   ├── ticket_200_2025-06-25.csv  # Ticket padre
│   └── ticket_201_2025-06-25.csv  # Ticket hijo
└── reportes/
    └── tickets_bot.csv            # CSV consolidado
```

## 🧪 **Pruebas**

Para probar el sistema:
```bash
cd backend
node test_transferencias_mejorado.js
```

Este script simula:
1. Ticket raíz (seqId: 200, team: Default)
2. Transferencia a agente (seqId: 201, team: DIRECT_TRANSFER)
3. Mensajes de conversación
4. Cierre del ticket
5. Verificación del CSV generado

## ✅ **Resultado Esperado**

El CSV consolidado debería contener **2 filas**:
1. **Ticket padre**: team="Default", transferencia="TRUE", ticket_hijo="201"
2. **Ticket hijo**: team="DIRECT_TRANSFER", transferencia="TRUE", ticket_padre="200"

Ambos tickets mantienen su información individual pero están relacionados a través de los campos de transferencia.

## 📋 **Próximos Pasos**

1. **Probar con datos reales** del sistema
2. **Implementar para tickets PLANTILLA** (más complejo)
3. **Optimizar rendimiento** si es necesario
4. **Documentar casos edge** (múltiples transferencias, etc.)

## 🎯 **Beneficios**

- **Visibilidad completa** del flujo de atención
- **Análisis de transferencias** por agente y cola
- **Tracking de rendimiento** por tipo de transferencia
- **Historial auditado** de todas las interacciones
- **Separación clara** entre BOT y PLANTILLA 