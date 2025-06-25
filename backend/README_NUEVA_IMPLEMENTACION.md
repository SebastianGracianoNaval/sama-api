# Nueva Implementación de Tickets - Documentación

## 📋 Resumen de Cambios

La nueva implementación maneja los tickets como **atenciones completas** con tickets anidados, incluyendo transferencias. Cada atención se exporta como un archivo CSV individual, y luego se consolidan en dos archivos separados dentro de un ZIP.

## 🏗️ Arquitectura

### Estructura de Datos

```javascript
// Mapa de atenciones abiertas
const atencionesAbiertas = new Map();
// Clave: contactIdentity (ej: '5491169007611@wa.gw.msging.net')
// Valor: {
//   contacto: '5491169007611',
//   tipoBase: 'BOT' | 'PLANTILLA',
//   fechaApertura: '2024-01-15T10:00:00Z',
//   tickets: [
//     {
//       ticket: {...}, // Datos del webhook
//       mensajes: [...],
//       eventos: [...],
//       cerrado: false,
//       fechaCierre: null,
//       tipo: 'BOT' | 'PLANTILLA' | 'TRANSFERENCIA',
//       sequentialId: '1001',
//       parentSequentialId: null,
//       team: 'SOPORTE',
//       agentIdentity: ''
//     }
//   ],
//   cerrada: false
// }
```

### Tipos de Tickets

1. **BOT**: Ticket inicial de atención automática
2. **PLANTILLA**: Ticket generado por campaña de plantillas
3. **TRANSFERENCIA**: Ticket de transferencia (hijo de BOT o PLANTILLA)

## 🔄 Flujo de Procesamiento

### 1. Recepción de Webhooks

```javascript
// En webhookController.js
if (tipo === 'ticket') {
  // Determinar tipo base (BOT o PLANTILLA)
  // Si tiene parentSequentialId → TRANSFERENCIA
  // Si no → TICKET RAÍZ (nueva atención)
}
```

### 2. Cierre de Atenciones

```javascript
// En handleBotEvent
if (eventoBot.ticketFinalizo) {
  // Cerrar toda la atención
  // Generar archivo CSV con todos los tickets
  // Incluir información de transferencias
}
```

### 3. Generación de Archivos

```javascript
// generarAtencionCompleta()
// → Crea un CSV con todos los tickets de la atención
// → Incluye campos de transferencia
// → Agrega campos específicos según tipo base
```

### 4. Consolidación

```javascript
// consolidarTicketsCsvs()
// → Lee todos los archivos de atención
// → Separa por tipo base (BOT vs PLANTILLA)
// → Genera dos archivos CSV separados
```

### 5. Creación de ZIP

```javascript
// crearZipTickets()
// → Crea ZIP con tickets_bot.csv y tickets_plantilla.csv
```

## 📊 Estructura de Columnas

### Campos Comunes (BOT y PLANTILLA)

```csv
id,sequentialId,parentSequentialId,status,team,unreadMessages,
storageDate,timestamp,estadoTicket,fechaCierre,tipoCierre,
fechaFiltro,tipoDato,procesadoEn,conversacion,contacto,agente,duracion,TIPO,
transferencia,ticket_padre,ticket_hijo,tipo_transferencia,agente_transferido,cola_transferida,historial_transferencias,cantidad_transferencias,
atencion_id,atencion_fecha_apertura,atencion_fecha_cierre,atencion_duracion_total
```

### Campos Específicos de PLANTILLA

```csv
plantilla_id,plantilla_nombre,plantilla_contenido,plantilla_parametros,
plantilla_campaignId,plantilla_campaignName,plantilla_fecha_envio,
contacto_identity,contacto_numero,usuario_respuesta,usuario_tipo_respuesta,
usuario_contenido,usuario_fecha_respuesta,
ticket_generado,ticket_id,ticket_sequentialId,ticket_estado,
ticket_fecha_cierre,ticket_tipo_cierre,ticket_agente,ticket_duracion
```

## 🎯 Beneficios de la Nueva Implementación

1. **Estructura Clara**: Cada atención es una unidad completa
2. **Transferencias Integradas**: Se manejan como tickets individuales
3. **Separación por Tipo**: BOT y PLANTILLA en archivos separados
4. **Información Completa**: Todos los campos relevantes incluidos
5. **Escalabilidad**: Fácil agregar nuevos tipos de tickets

## 🧪 Pruebas

```bash
# Ejecutar script de prueba
node test_nueva_implementacion.js
```

El script crea:
- Archivos de atención de prueba
- Prueba la consolidación
- Verifica la creación del ZIP

## 📁 Estructura de Archivos

```
backend/
├── controllers/
│   ├── webhookController.js    # Lógica de atenciones
│   └── reportController.js     # Endpoint de descarga
├── utils/
│   ├── csvUtils.js             # Funciones de CSV
│   └── blipUtils.js            # Utilidades BLiP
├── data/
│   ├── tickets/                # Archivos individuales
│   └── reportes/               # Archivos consolidados
│       ├── tickets_bot.csv
│       ├── tickets_plantilla.csv
│       └── tickets_*.zip
└── test_nueva_implementacion.js
```

## 🔧 Configuración

### Dependencias

```json
{
  "dependencies": {
    "archiver": "^5.3.1",
    "json2csv": "^5.0.7",
    "csv-parse": "^4.16.3"
  }
}
```

### Endpoints

```
GET /descargar/tickets?fechaInicio=2024-01-01&fechaFin=2024-01-31
→ Descarga ZIP con tickets_bot.csv y tickets_plantilla.csv
```

## 🚀 Migración

La nueva implementación es compatible con la anterior:
- Los archivos existentes siguen funcionando
- Los nuevos archivos tienen estructura mejorada
- El endpoint mantiene la misma interfaz

## 📝 Notas Importantes

1. **Cada ticket es una fila**: Incluyendo transferencias
2. **ZIP con 2 archivos**: Separados por tipo base
3. **Campos de transferencia**: Para rastrear relaciones padre-hijo
4. **Información de atención**: Para agrupar tickets relacionados
5. **Compatibilidad**: Mantiene estructura anterior para otros tipos 