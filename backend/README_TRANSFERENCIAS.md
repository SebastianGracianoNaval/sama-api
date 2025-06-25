# Sistema de Transferencias de Tickets - Documentación

## 📋 **Resumen de Cambios**

Se ha implementado un sistema completo de tracking de transferencias que permite:

- **Cada transferencia genera un ticket individual** con su propio CSV
- **Tracking de relaciones padre-hijo** entre tickets
- **Historial completo de transferencias** en el CSV consolidado
- **Separación por tipo**: BOT vs PLANTILLA
- **Información detallada** de transferencias (agente, cola, tipo)

## 🔄 **Flujo de Transferencias**

### **1. Ticket Raíz (Sin parentSequentialId)**
```json
{
  "type": "application/vnd.iris.ticket+json",
  "content": {
    "sequentialId": 186,
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
    "sequentialId": 187,
    "parentSequentialId": 186,
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
    "sequentialId": 188,
    "parentSequentialId": 186,
    "team": "Default"
    // Sin agentIdentity
  }
}
```

## 🎯 **Campos del CSV**

### **Campos Base (Todos los tickets)**
- `id`, `sequentialId`, `parentSequentialId`, `status`, `team`, `unreadMessages`
- `storageDate`, `timestamp`, `estadoTicket`, `fechaCierre`, `tipoCierre`
- `fechaFiltro`, `tipoDato`, `procesadoEn`, `conversacion`, `contacto`, `agente`, `duracion`
- `TIPO`: "BOT" o "PLANTILLA"

### **Campos de Transferencia (Nuevos)**
- `transferencia`: "TRUE" o "FALSE"
- `ticket_padre`: SequentialId del ticket padre (si es transferencia)
- `ticket_hijo`: SequentialId del ticket hijo (si es padre con transferencias)
- `tipo_transferencia`: "AGENTE" o "COLA"
- `agente_transferido`: Email del agente (si es transferencia directa)
- `cola_transferida`: Nombre de la cola o "DIRECT_TRANSFER"
- `historial_transferencias`: "186 → 187 → 188" (historial completo)
- `cantidad_transferencias`: Número de transferencias en el historial

## 📊 **Ejemplo de CSV Resultante**

```csv
id,sequentialId,status,team,unreadMessages,storageDate,timestamp,estadoTicket,fechaCierre,tipoCierre,fechaFiltro,tipoDato,procesadoEn,conversacion,contacto,agente,duracion,TIPO,transferencia,ticket_padre,ticket_hijo,tipo_transferencia,agente_transferido,cola_transferida,historial_transferencias,cantidad_transferencias
"7a3c1ccc-fecf-426a-92e5-0197a7434c42",186,"Waiting","Default",0,"2025-06-25T13:24:55Z","2025-06-25T13:24:55Z","cerrado","2025-06-25T13:30:00Z","Por Agente","2025-06-25","ticket_reporte","2025-06-25T13:30:00Z","[cliente]: hola, necesito ayuda\n[cliente]: transferime a un agente","5491169007611","bot@bewise.com.es","0d 0h 5m 5s","BOT","TRUE","",187,"AGENTE","hola@bewise.com.es","DIRECT_TRANSFER","186 → 187 → 188",2
"e70a4ab6-8b5e-4404-b529-0197a7447a0e",187,"Waiting","DIRECT_TRANSFER",0,"2025-06-25T13:26:12Z","2025-06-25T13:26:12Z","cerrado","2025-06-25T13:30:00Z","Por Agente","2025-06-25","ticket_reporte","2025-06-25T13:30:00Z","[agente]: hola, soy el agente asignado","5491169007611","hola@bewise.com.es","0d 0h 3m 48s","BOT","TRUE",186,"","AGENTE","hola@bewise.com.es","DIRECT_TRANSFER","186 → 187 → 188",2
"4ccb4c73-f7f4-4fd7-b1d9-0197a746097e",188,"Waiting","Default",0,"2025-06-25T13:27:54Z","2025-06-25T13:27:54Z","cerrado","2025-06-25T13:30:00Z","Por Agente","2025-06-25","ticket_reporte","2025-06-25T13:30:00Z","","5491169007611","cola@bewise.com.es","0d 0h 2m 6s","BOT","TRUE",186,"","COLA","","Default","186 → 187 → 188",2
```

## 🔧 **Funcionalidades Implementadas**

### **1. Tracking Individual de Tickets**
- Cada transferencia se trata como un ticket independiente
- Se genera un CSV individual para cada ticket
- Se mantiene la relación padre-hijo en memoria

### **2. Procesamiento de Transferencias**
- **Función `procesarTransferenciasTicketsV4`**: Nueva lógica mejorada
- **Historial completo**: Construye el historial desde el ticket raíz hasta el final
- **Mapeo de relaciones**: Crea mapas de padres e hijos para procesamiento eficiente

### **3. Identificación de Tipos**
- **Transferencia Directa**: `team: "DIRECT_TRANSFER"` + `agentIdentity`
- **Transferencia a Cola**: `team` diferente + sin `agentIdentity`
- **Ticket Raíz**: Sin `parentSequentialId`

### **4. Cierre de Tickets**
- **Función `handleBotEvent`** modificada para cerrar múltiples tickets
- **Búsqueda por contacto**: Encuentra todos los tickets abiertos (incluyendo transferencias)
- **Generación individual**: Cada ticket cerrado genera su propio CSV

## 🚀 **Archivos Modificados**

### **Backend**
- `controllers/webhookController.js`: Lógica de tracking de transferencias
- `utils/csvUtils.js`: Procesamiento y consolidación de transferencias
- `test_transferencias.js`: Script de prueba completo

### **Funciones Principales**
- `procesarTransferenciasTicketsV4()`: Nueva lógica de procesamiento
- `generarTicketIndividual()`: Campos de transferencia agregados
- `consolidarTicketsCsvs()`: Usa la nueva función V4

## 🧪 **Pruebas**

### **Script de Prueba**
```bash
node backend/test_transferencias.js
```

### **Flujo de Prueba**
1. Ticket raíz (186)
2. Mensajes en ticket raíz
3. Transferencia a agente (187)
4. Mensajes en transferencia
5. Transferencia a cola (188)
6. Cierre de todos los tickets

### **Resultado Esperado**
- 3 archivos CSV individuales
- 1 archivo consolidado con historial completo
- Campos de transferencia correctamente poblados

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