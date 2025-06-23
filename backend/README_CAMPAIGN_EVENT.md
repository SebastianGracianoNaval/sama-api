# Endpoint `/api/campaign-event` - Implementación Completada

## ✅ **Modificaciones Realizadas**

### 1. **Nuevo Endpoint `/api/campaign-event`**
- **URL**: `POST https://sama-api-wppm.onrender.com/api/campaign-event`
- **Content-Type**: `application/json`
- **Función**: Manejar eventos específicos de campañas y plantillas

### 2. **Estructura JSON Esperada**
```json
{
  "agentePlantilla": "{{agentePlantilla}}",
  "identity": "{{contact.identity}}",
  "numeroTelefono": "{{contact.phoneNumber}}",
  "esPlantilla": true,
  "respuesta": "{{respuestaSIN}}"
}
```

### 3. **Campos del JSON**
- `agentePlantilla`: Agente que envió la plantilla
- `identity`: Identidad del contacto (ej: "5491169007611@wa.gw.msging.net")
- `numeroTelefono`: Número de teléfono del contacto
- `esPlantilla`: Campo booleano que determina si es una plantilla
- `respuesta`: Respuesta del usuario a la plantilla

### 4. **Funcionalidad Implementada**
- ✅ Validación de datos requeridos
- ✅ Extracción automática del número de teléfono del identity
- ✅ Actualización del tracking de campañas
- ✅ Guardado en CSV de eventos de campaña
- ✅ Integración con el sistema de webhooks
- ✅ Respuesta JSON estructurada

### 5. **Archivos Modificados**
- ✅ `backend/controllers/webhookController.js` - Agregada función `handleCampaignEvent`
- ✅ `backend/index.js` - Agregada ruta `/api/campaign-event`
- ✅ `backend/test_campaign_event.js` - Script de prueba creado
- ✅ `backend/test_tickets_export.js` - Script para probar exportación de tickets

## 🔧 **Uso del Endpoint**

### **Ejemplo de Solicitud:**
```javascript
const response = await axios.post('https://sama-api-wppm.onrender.com/api/campaign-event', {
    agentePlantilla: "sebastian@bewise.com.es",
    identity: "5491169007611@wa.gw.msging.net",
    numeroTelefono: "5491169007611",
    esPlantilla: true,
    respuesta: "hola, gracias por la información"
}, {
    headers: {
        'Content-Type': 'application/json'
    }
});
```

### **Respuesta Esperada:**
```json
{
    "success": true,
    "message": "Evento de campaña procesado correctamente",
    "eventoId": "campaign_1234567890_abc123",
    "esPlantilla": true,
    "contacto": "5491169007611",
    "webhookData": {
        "fecha": "2025-06-22T10:30:00.000Z",
        "tipo": "CAMPAIGN EVENT",
        "body": {
            "id": "campaign_1234567890_abc123",
            "agentePlantilla": "sebastian@bewise.com.es",
            "identity": "5491169007611@wa.gw.msging.net",
            "numeroTelefono": "5491169007611",
            "esPlantilla": true,
            "respuesta": "hola, gracias por la información",
            "timestamp": "2025-06-22T10:30:00.000Z"
        }
    }
}
```

## 📊 **Integración con Exportación CSV**

### **Tickets de Plantilla**
Los datos enviados al endpoint se utilizan para:
- ✅ Identificar tickets como tipo "PLANTILLA"
- ✅ Incluir información del agente que envió la plantilla
- ✅ Registrar la respuesta del usuario
- ✅ Generar columnas específicas en el CSV:
  - `plantilla`: Nombre de la plantilla
  - `respuesta`: Respuesta del usuario
  - `emisor`: Agente que envió la plantilla
  - `TIPO`: "PLANTILLA"

### **Tickets BOT**
Los tickets BOT mantienen su estructura original:
- ✅ Columna `TIPO`: "BOT"
- ✅ Campos básicos: id, sequentialId, status, team, etc.
- ✅ Conversación completa
- ✅ Información del agente y duración

## 🧪 **Scripts de Prueba**

### **1. Probar Endpoint Campaign Event:**
```bash
node backend/test_campaign_event.js
```

### **2. Probar Exportación de Tickets:**
```bash
node backend/test_tickets_export.js
```

## 🔍 **Debugging de Exportación de Tickets BOT**

### **Problema Identificado:**
Los tickets BOT no aparecen en la exportación sin filtros.

### **Posibles Causas:**
1. **Filtrado por fechas**: La función `fechaEnRango` puede estar filtrando incorrectamente
2. **Archivos vacíos**: Los archivos individuales de tickets pueden estar vacíos
3. **Estructura de datos**: Los tickets BOT pueden tener una estructura diferente

### **Solución Implementada:**
- ✅ Verificación de la función `fechaEnRango`
- ✅ Logs detallados en `consolidarTicketsCsvs`
- ✅ Script de prueba para verificar la exportación
- ✅ Manejo de casos sin filtros de fecha

## 📋 **Próximos Pasos**

1. **Probar el endpoint** con datos reales
2. **Verificar la exportación** de tickets BOT sin filtros
3. **Ajustar la lógica** de filtrado si es necesario
4. **Documentar casos de uso** específicos

## 🎯 **Resultado Esperado**

Con estas modificaciones, el sistema debería:
- ✅ Aceptar eventos de campañas via POST `/api/campaign-event`
- ✅ Procesar correctamente los datos de plantillas
- ✅ Exportar tickets BOT y PLANTILLA correctamente
- ✅ Incluir la columna TIPO en todos los tickets
- ✅ Mantener la separación clara entre tipos de tickets 