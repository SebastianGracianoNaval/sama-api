# Endpoint para Eventos del Bot de WhatsApp

## Descripción
Este endpoint permite recibir información específica desde tu bot de WhatsApp, especialmente para finalización de tickets y tracking de agentes. **Los eventos aparecen en el frontend como un nuevo tipo "BOT EVENT" en la página principal de webhooks.**

## URL del Endpoint
```
POST https://sama-api-wppm.onrender.com/api/bot-event
```

## Headers Requeridos
```
Content-Type: application/json
```

## Body de la Solicitud

### Para Finalización de Tickets
```json
{
    "correoAgente": "{{emailAgente}}",
    "ticketFinalizo": "true",
    "identity": "{{contact.serialized}}"
}
```

### Campos
- `correoAgente` (requerido): Email del agente que atendió el ticket
- `ticketFinalizo` (opcional): "true" o "false" para indicar si el ticket finalizó
- `identity` (requerido): Identidad del contacto (ej: "5491169007611@wa.gw.msging.net")
- `tipoEvento` (opcional): Tipo de evento (por defecto: "finalizacion_ticket")

## Respuesta Exitosa (200)
```json
{
    "success": true,
    "message": "Evento del bot procesado correctamente",
    "eventoId": "bot_1750555180520_w5rnsj9ew",
    "ticketFinalizo": true,
    "contacto": "5491169007611"
}
```

## Respuesta de Error (400)
```json
{
    "success": false,
    "message": "correoAgente e identity son requeridos"
}
```

## Respuesta de Error (500)
```json
{
    "success": false,
    "message": "Error al procesar el evento del bot",
    "error": "Descripción del error"
}
```

## Funcionalidades

### 1. Tracking de Agentes
- Registra qué agente atendió cada ticket
- Guarda la información en archivos CSV para reportes

### 2. Finalización de Tickets
- Cuando `ticketFinalizo` es "true", busca el ticket abierto correspondiente
- Marca el ticket como cerrado con la información del agente
- Genera archivo individual del ticket con conversación completa

### 3. Logs Detallados
- Registra todos los eventos en la consola para debugging
- Guarda eventos en archivos CSV separados

### 4. **NUEVO: Visualización en Frontend**
- Los eventos del bot aparecen en la página principal de webhooks
- Se muestran con el tipo **"BOT EVENT"**
- Incluyen toda la información del agente y el ticket
- Se pueden copiar al portapapeles como cualquier otro webhook

## Ejemplo de Uso desde BLiP

### En tu bot de WhatsApp (BLiP)
```javascript
// En un nodo de tu flow
const response = await fetch('https://sama-api-wppm.onrender.com/api/bot-event', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "correoAgente": "{{emailAgente}}",
        "ticketFinalizo": "true",
        "identity": "{{contact.serialized}}"
    })
});

if (response.ok) {
    console.log('Evento enviado correctamente');
} else {
    console.error('Error enviando evento');
}
```

### Variables de BLiP Disponibles
- `{{emailAgente}}`: Email del agente actual
- `{{contact.serialized}}`: Identidad del contacto
- `{{contact.name}}`: Nombre del contacto
- `{{contact.identity}}`: Número de teléfono del contacto

## Archivos Generados

### Eventos del Bot
- Ubicación: `data/eventos/evento_bot_[timestamp].csv`
- Contiene: información del agente, contacto, tipo de evento, etc.

### Tickets Individuales
- Ubicación: `data/reportes/ticket_[sequentialId]_[fecha].csv`
- Contiene: conversación completa, información del agente, fecha de cierre

## Filtrado por Fechas
Los eventos del bot se incluyen en los reportes consolidados y pueden filtrarse por fechas usando el campo `fechaFiltro`.

## Visualización en Frontend

### Cómo aparecen los eventos del bot:
1. **Tipo**: Se muestran como "BOT EVENT" en un chip azul
2. **Fecha**: Timestamp de cuando se recibió el evento
3. **Contenido**: JSON con toda la información del agente y ticket
4. **Funcionalidades**: Se pueden copiar al portapapeles y expandir

### Ejemplo de visualización:
```
[2025-06-22 10:30:15] [BOT EVENT]
{
  "correoAgente": "agente@ejemplo.com",
  "identity": "5491169007611@wa.gw.msging.net",
  "ticketFinalizo": true,
  "tipoEvento": "finalizacion_ticket",
  "timestamp": "2025-06-22T10:30:15.123Z",
  "numeroTelefono": "5491169007611"
}
```

## Notas Importantes
1. El endpoint es robusto y maneja errores de parsing JSON
2. Valida que los campos requeridos estén presentes
3. Extrae automáticamente el número de teléfono del identity
4. Es compatible con el sistema existente de filtrado por fechas
5. Genera logs detallados para debugging
6. **Los eventos aparecen automáticamente en el frontend sin necesidad de recargar** 