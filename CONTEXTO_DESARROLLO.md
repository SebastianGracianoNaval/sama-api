# 🔧 CONTEXTO DE DESARROLLO - Sama-Node

## 📋 INFORMACIÓN TÉCNICA DETALLADA

### 🎯 OBJETIVO
Este archivo proporciona contexto técnico específico para mejorar las interacciones con la IA durante el desarrollo, debugging y mantenimiento del proyecto.

---

## 🏗️ ARQUITECTURA TÉCNICA

### Backend Architecture
```
Express App (index.js)
├── Middleware Stack
│   ├── CORS
│   ├── Body Parser
│   ├── Static Files
│   └── Error Handler
├── Route Handlers
│   ├── Webhook Routes (/webhook, /api/bot-event, /api/campaign-event)
│   ├── Download Routes (/descargar/*)
│   ├── Consolidation Routes (/consolidar/*)
│   └── API Routes (/api/*)
└── Controllers
    ├── webhookController.js (897 líneas)
    └── reportController.js (300 líneas)
```

### Frontend Architecture
```
React App (App.js)
├── Routing (React Router)
│   ├── Home (/)
│   └── Reportes (/reportes)
├── Components
│   ├── Header
│   ├── Toast (Notifications)
│   ├── Reportes (Main Reports)
│   ├── ReportesCampanas (Campaign Reports)
│   └── Webhooks (Webhook Display)
└── Services
    └── api.js (HTTP Client)
```

---

## 📊 ESTRUCTURA DE DATOS

### Tipos de Webhook BLiP
1. **Mensajes** (`type: "text/plain"`)
   - `from`, `to`, `content`
   - `metadata.#envelope.storageDate`
   - `metadata.#wa.timestamp`

2. **Contactos** (`type: "application/vnd.iris.contact+json"`)
   - `identity`, `name`, `phoneNumber`
   - `lastMessageDate`, `status`

3. **Eventos** (`type: "application/vnd.iris.event+json"`)
   - `category`, `action`, `identity`
   - `extras` (estados del bot)

4. **Tickets** (`type: "application/vnd.iris.ticket+json"`)
   - `content.sequentialId`, `content.status`
   - `content.team`, `metadata.#envelope.storageDate`

5. **Plantillas** (`type: "application/vnd.iris.template+json"`)
   - `content.template.name`
   - `metadata.#activecampaign.*`

### Estructura de Archivos CSV
```
data/
├── mensajes/
│   ├── mensaje_YYYY-MM-DD_HH-MM-SS.csv
│   └── mensaje_consolidado_*.csv
├── contactos/
├── eventos/
├── tickets/
├── plantillas/
└── reportes/
    ├── atencion_*.csv
    ├── tickets_bot.csv
    ├── tickets_plantilla.csv
    └── campanas_*.csv
```

---

## 🔄 FLUJOS DE PROCESAMIENTO

### 1. Webhook Processing Flow
```javascript
POST /webhook
├── identificarTipoJson(body)
├── handleWebhook(req, res)
├── procesar[Tipo](jsonData, outputPath)
├── convertJsonToCsv(data, path)
└── Almacenamiento en data/[tipo]/
```

### 2. Consolidation Flow
```javascript
POST /consolidar/:tipo
├── consolidarCsvs(directorio, tipo, fechas)
├── Leer archivos CSV del directorio
├── Aplicar filtros de fecha
├── Combinar datos
└── Generar archivo consolidado
```

### 3. Report Generation Flow
```javascript
GET /descargar/:tipo
├── validarFechas(fechaInicio, fechaFin)
├── descargarCsvConsolidado(tipo, res, fechas)
├── consolidarCsvs() si no existe
└── res.download(archivo)
```

---

## 🛠️ UTILIDADES CLAVE

### csvUtils.js (1935 líneas)
**Funciones principales:**
- `convertJsonToCsv()` - Conversión JSON a CSV
- `consolidarCsvs()` - Consolidación de archivos
- `consolidarTicketsCsvs()` - Consolidación específica de tickets
- `consolidarCampanas()` - Consolidación de campañas
- `procesarTransferenciasTicketsV4()` - Algoritmo de transferencias
- `generarAtencionCompleta()` - Generación de atenciones
- `exportarSoloCampanas()` - Exportación exclusiva de campañas

**Características técnicas:**
- Manejo de campos anidados con `flattenObject()`
- Detección automática de fechas con `obtenerFechaFiltro()`
- Validación de rangos de fecha con `fechaEnRango()`
- Generación de ZIP con `archiver`

### blipUtils.js
**Funciones principales:**
- `identificarTipoJson()` - Identificación de tipo de webhook
- `generarNombreArchivo()` - Generación de nombres de archivo
- `obtenerRutaCarpeta()` - Gestión de rutas de archivos

---

## 🔍 PATRONES DE DEBUGGING

### Logging Structure
```javascript
console.log(`[CONTEXTO] Mensaje descriptivo`);
console.log(`[CONTEXTO] Datos:`, datos);
console.log(`[CONTEXTO] Error:`, error.message);
```

### Debug Files
- `debug_production.js` - Herramientas de debug
- `test_*.js` - Archivos de prueba específicos
- `generate_test_data_production.js` - Generación de datos de prueba

### Common Debug Scenarios
1. **Webhook Processing Issues**
   - Verificar `identificarTipoJson()`
   - Revisar estructura de datos BLiP
   - Validar campos requeridos

2. **CSV Generation Issues**
   - Verificar campos faltantes
   - Revisar encoding de caracteres
   - Validar estructura de datos

3. **Date Filtering Issues**
   - Verificar formato de fechas
   - Revisar `fechaEnRango()`
   - Validar rangos de fecha

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### 1. **Problemas de Encoding**
```javascript
// Solución: Especificar encoding UTF-8
fs.writeFileSync(outputPath, csv, 'utf8');
```

### 2. **Campos Anidados en CSV**
```javascript
// Solución: Usar flattenObject()
const flat = flattenObject(obj);
```

### 3. **Fechas Inconsistentes**
```javascript
// Solución: Usar obtenerFechaFiltro()
const fechaFiltro = obtenerFechaFiltro(obj);
```

### 4. **Archivos CSV Vacíos**
```javascript
// Verificar: Datos antes de procesar
if (dataArray.length === 0) {
    console.log('[CONTEXTO] No hay datos para procesar');
    return;
}
```

---

## 📈 MÉTRICAS Y MONITOREO

### Performance Metrics
- Tiempo de procesamiento de webhooks
- Tamaño de archivos CSV generados
- Frecuencia de consolidación
- Uso de memoria en operaciones grandes

### Error Tracking
- Errores de parsing CSV
- Errores de validación de fechas
- Errores de escritura de archivos
- Timeouts en operaciones largas

---

## 🔧 CONFIGURACIÓN DE DESARROLLO

### Environment Variables
```bash
# Backend (.env)
PORT=3000
FRONTEND_URL=http://localhost:3001
NODE_ENV=development

# Production (Render)
NODE_ENV=production
PORT=3000
```

### Development Scripts
```json
{
  "dev": "concurrently \"cd backend && npm run dev\" \"cd frontend && npm start\"",
  "install": "cd backend && npm install && cd ../frontend && npm install",
  "build": "cd frontend && npm run build"
}
```

---

## 🎯 CASOS DE USO TÉCNICOS

### 1. **Nuevo Tipo de Webhook**
```javascript
// 1. Agregar identificación en blipUtils.js
// 2. Crear función procesar[Tipo] en csvUtils.js
// 3. Agregar ruta en index.js
// 4. Actualizar frontend si es necesario
```

### 2. **Nuevo Campo en CSV**
```javascript
// 1. Agregar campo en función de procesamiento
// 2. Actualizar array de campos
// 3. Verificar en consolidación
// 4. Actualizar documentación
```

### 3. **Nuevo Filtro**
```javascript
// 1. Agregar validación en backend
// 2. Actualizar endpoint
// 3. Modificar frontend
// 4. Agregar tests
```

---

## 📚 RECURSOS TÉCNICOS

### Dependencies Analysis
**Backend Critical Dependencies:**
- `json2csv` - Conversión JSON a CSV
- `csv-parse` - Parsing de archivos CSV
- `archiver` - Compresión ZIP
- `axios` - HTTP client
- `express` - Web framework

**Frontend Critical Dependencies:**
- `@mui/material` - UI components
- `react-router-dom` - Routing
- `axios` - HTTP client
- `file-saver` - File downloads
- `react-toastify` - Notifications

### File Size Considerations
- `csvUtils.js`: 1935 líneas (crítico para mantenimiento)
- `webhookController.js`: 897 líneas
- `index.js`: 680 líneas
- `reportController.js`: 300 líneas

---

## 🚀 DEPLOYMENT CONSIDERATIONS

### Render.com Configuration
```yaml
services:
  - type: web
    name: sama-api
    env: node
    rootDir: backend
    buildCommand: cd .. && npm install && cd frontend && npm install && npm run build
    startCommand: npm start
```

### Build Process
1. Instalar dependencias backend y frontend
2. Build del frontend
3. Servir archivos estáticos desde backend
4. Configurar variables de entorno

---

## 🔍 DEBUGGING CHECKLIST

### Webhook Issues
- [ ] Verificar estructura de datos BLiP
- [ ] Validar identificación de tipo
- [ ] Revisar procesamiento de campos
- [ ] Verificar escritura de archivos

### CSV Issues
- [ ] Validar estructura de datos
- [ ] Verificar encoding UTF-8
- [ ] Revisar campos anidados
- [ ] Validar fechas

### Performance Issues
- [ ] Revisar operaciones síncronas
- [ ] Validar manejo de memoria
- [ ] Verificar archivos grandes
- [ ] Revisar timeouts

---

Este contexto técnico proporciona información detallada para resolver problemas específicos y mejorar la calidad del código durante el desarrollo. 