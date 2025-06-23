# Flujo Completo de Plantillas - Documentación

## 📋 **Resumen del Flujo**

El sistema maneja plantillas de WhatsApp a través de un flujo de 6 pasos que permite rastrear completamente el envío, las variables, las respuestas y la generación de tickets.

## 🔄 **Flujo Detallado**

### **Paso 1: Webhook de Plantilla Enviada**
```json
{
  "type": "application/json",
  "content": {
    "type": "template",
    "template": {
      "name": "bew_entrega_d__jsiqk",
      "components": [{
        "type": "body",
        "parameters": [
          { "text": "${contact.extras.0}", "type": "text" },
          { "text": "${contact.extras.1}", "type": "text" }
        ]
      }]
    },
    "templateContent": {
      "components": [{
        "type": "BODY",
        "text": "¡Hola! 😊\\n\\nLe informamos que su pedido {{1}} de {{2}}..."
      }]
    }
  },
  "to": "5491169007611@wa.gw.msging.net",
  "metadata": {
    "#activecampaign.flowId": "8f8786d0-b90a-4c96-ac47-446f146e3160",
    "#envelope.storageDate": "2025-06-22T05:20:26Z"
  }
}
```

**Información extraída:**
- Nombre de la plantilla: `bew_entrega_d__jsiqk`
- Contenido base: `¡Hola! 😊\\n\\nLe informamos que su pedido {{1}} de {{2}}...`
- CampaignId: `8f8786d0-b90a-4c96-ac47-446f146e3160`
- Contacto destino: `5491169007611@wa.gw.msging.net`

### **Paso 2: Webhook de Contacto con Variables**
```json
{
  "identity": "5491169007611@wa.gw.msging.net",
  "extras": {
    "0": "7576",
    "1": "GUCCI",
    "2": "Juan",
    "3": "JOSE 123",
    "4": "12",
    "5": "3",
    "6": "ejemplo.com",
    "campaignId": "8f8786d0-b90a-4c96-ac47-446f146e3160",
    "campaignMessageTemplate": "bew_entrega_d__jsiqk",
    "campaignOriginator": "sebastian@bewise.com.es"
  }
}
```

**Información extraída:**
- Agente que envió: `sebastian@bewise.com.es`
- Variables: `7576`, `GUCCI`, `Juan`, `JOSE 123`, `12`, `3`, `ejemplo.com`
- CampaignId: `8f8786d0-b90a-4c96-ac47-446f146e3160`

### **Paso 3: Webhook de Plantilla con Parámetros Reemplazados**
```json
{
  "content": {
    "template": {
      "components": [{
        "parameters": [
          { "text": "7576", "type": "text" },
          { "text": "GUCCI", "type": "text" },
          { "text": "Juan", "type": "text" },
          { "text": "JOSE 123", "type": "text" },
          { "text": "12", "type": "text" },
          { "text": "3", "type": "text" },
          { "text": "ejemplo.com", "type": "text" }
        ]
      }]
    }
  }
}
```

**Información extraída:**
- Parámetros finales con valores reales
- Confirmación de que la plantilla se envió correctamente

### **Paso 4: Webhook de Respuesta del Usuario**
```json
{
  "type": "text/plain",
  "content": "hola",
  "from": "5491169007611@wa.gw.msging.net",
  "to": "prueba10@msging.net",
  "metadata": {
    "#envelope.storageDate": "2025-06-22T05:27:47Z"
  }
}
```

**Información extraída:**
- Respuesta del usuario: `hola`
- Timestamp de respuesta: `2025-06-22T05:27:47Z`

### **Paso 5: POST al Endpoint `/api/campaign-event`**
```json
{
  "agentePlantilla": "sebastian@bewise.com.es",
  "identity": "5491169007611@wa.gw.msging.net",
  "numeroTelefono": "5491169007611",
  "esPlantilla": true,
  "respuesta": "hola"
}
```

**Propósito:**
- Consolidar toda la información de la campaña
- Actualizar el tracking interno
- Preparar datos para la exportación CSV

### **Paso 6: Webhook de Ticket Generado**
```json
{
  "type": "application/vnd.iris.ticket+json",
  "content": {
    "sequentialId": 84,
    "status": "Waiting",
    "CampaignId": "8f8786d0-b90a-4c96-ac47-446f146e3160",
    "customerInput": {
      "value": "hola"
    }
  },
  "from": "5491169007611@wa.gw.msging.net"
}
```

**Información extraída:**
- Ticket ID: `84`
- CampaignId: `8f8786d0-b90a-4c96-ac47-446f146e3160`
- Respuesta del usuario: `hola`

## 🎯 **Resultado Final**

### **CSV de Tickets PLANTILLA generado:**
```csv
id,sequentialId,status,team,unreadMessages,storageDate,timestamp,estadoTicket,fechaCierre,tipoCierre,fechaFiltro,tipoDato,procesadoEn,conversacion,contacto,agente,duracion,plantilla,respuesta,contenido,emisor,hora_envio,primer_contacto,TIPO
"6f3bc8b0-7515-47cb-a7b2-0197961b6724",84,"Waiting","Default",0,"2025-06-22T05:27:47.748Z","","cerrado","2025-06-22T05:30:00Z","Por Agente","2025-06-22","ticket","2025-06-22T05:30:00Z","[agente]: ¡Hola! 😊\\n\\nLe informamos que su pedido 7576 de GUCCI para entregar a Juan en la dirección JOSE 123 se realizará el día 12 en el horario 3.\\n\\nPuede realizar el seguimiento de su pedido en el siguiente enlace:\\nejemplo.com\\n\\n¡Gracias!\\n[cliente]: hola","5491169007611","sebastian@bewise.com.es","0d 0h 2m 13s","bew_entrega_d__jsiqk","TRUE","hola","sebastian@bewise.com.es","2025-06-22T05:20:26Z","2025-06-22T05:27:47Z - hola","PLANTILLA"
```

## 🔧 **Funcionalidades Implementadas**

### **1. Tracking de Campañas**
- Mapa `campaignTracking` que rastrea cada contacto
- Almacena nombre de plantilla, agente, variables, contenido
- Se actualiza en cada paso del flujo

### **2. Identificación Automática de Tickets**
- **Criterio 1**: Si hay tracking de campaña para el contacto
- **Criterio 2**: Si el ticket tiene `CampaignId`
- **Criterio 3**: Si el ticket tiene metadata de ActiveCampaign

### **3. Construcción de Contenido**
- Función `construirContenidoPlantilla()` que reemplaza variables
- `{{1}}` → `7576`, `{{2}}` → `GUCCI`, etc.
- Resultado: contenido personalizado para cada usuario

### **4. Endpoint `/api/campaign-event`**
- Recibe datos consolidados de la campaña
- Actualiza el tracking interno
- Prepara información para exportación CSV

## 📊 **Campos del CSV de Plantillas**

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `plantilla` | Nombre de la plantilla | `bew_entrega_d__jsiqk` |
| `respuesta` | Si el usuario respondió | `TRUE` o `FALSE` |
| `contenido` | Contenido con variables reemplazadas | `¡Hola! 😊\\n\\nLe informamos que su pedido 7576...` |
| `emisor` | Agente que envió la plantilla | `sebastian@bewise.com.es` |
| `hora_envio` | Timestamp de envío | `2025-06-22T05:20:26Z` |
| `primer_contacto` | Primera respuesta del usuario | `2025-06-22T05:27:47Z - hola` |
| `TIPO` | Tipo de ticket | `PLANTILLA` |

## 🚀 **Uso del Sistema**

### **Para Probar el Flujo Completo:**
```bash
node test_complete_flow.js
```

### **Para Enviar Datos Manualmente:**
```bash
curl -X POST http://localhost:3000/api/campaign-event \
  -H "Content-Type: application/json" \
  -d '{
    "agentePlantilla": "sebastian@bewise.com.es",
    "identity": "5491169007611@wa.gw.msging.net",
    "numeroTelefono": "5491169007611",
    "esPlantilla": true,
    "respuesta": "hola"
  }'
```

## ✅ **Ventajas del Sistema**

1. **Tracking Completo**: Rastrea desde el envío hasta la respuesta
2. **Variables Dinámicas**: Reemplaza automáticamente las variables
3. **Identificación Automática**: Detecta tickets de plantilla sin intervención manual
4. **Datos Consolidados**: Toda la información en un solo CSV
5. **Separación Clara**: Tickets BOT vs PLANTILLA en archivos separados 