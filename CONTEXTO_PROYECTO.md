# 🚀 CONTEXTO DEL PROYECTO - BLiP Webhook Dashboard

## 📋 DESCRIPCIÓN GENERAL

**Sama-Node** es un dashboard completo para visualizar y gestionar webhooks de BLiP (plataforma de mensajería), con capacidades avanzadas de procesamiento de datos, generación de reportes CSV y análisis de campañas de WhatsApp.

### 🎯 Propósito Principal
- Procesar webhooks de BLiP en tiempo real
- Generar reportes detallados de tickets, mensajes, contactos y eventos
- Analizar campañas de WhatsApp (plantillas) vs interacciones de bot
- Consolidar datos en archivos CSV para análisis empresarial
- Proporcionar una interfaz web moderna para gestión de datos

---

## 🏗️ ARQUITECTURA DEL PROYECTO

### Estructura de Directorios
```
sama-node/
├── backend/                 # Servidor Node.js/Express
│   ├── controllers/         # Lógica de negocio
│   ├── utils/              # Utilidades y helpers
│   ├── views/              # Plantillas EJS
│   ├── public/             # Archivos estáticos
│   └── data/               # Almacenamiento de datos CSV
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas principales
│   │   ├── services/       # Servicios API
│   │   └── utils/          # Utilidades frontend
│   └── public/             # Archivos públicos
└── views/                  # Vistas adicionales
```

---

## 🛠️ STACK TECNOLÓGICO

### Backend (Node.js/Express)
- **Runtime**: Node.js >= 14.0.0
- **Framework**: Express.js
- **Template Engine**: EJS con express-ejs-layouts
- **Procesamiento CSV**: json2csv, csv-parse
- **Compresión**: archiver (para archivos ZIP)
- **HTTP Client**: axios
- **CORS**: cors
- **Variables de entorno**: dotenv

### Frontend (React)
- **Framework**: React 19.1.0
- **UI Library**: Material-UI (MUI) v7.1.1
- **Routing**: React Router DOM v7.6.2
- **HTTP Client**: axios
- **Notificaciones**: react-toastify
- **Descarga de archivos**: file-saver
- **Testing**: @testing-library/react

### DevOps
- **Deployment**: Render.com
- **Build Tool**: React Scripts
- **Package Manager**: npm
- **Development**: concurrently (para desarrollo simultáneo)

---

## 📊 TIPOS DE DATOS PROCESADOS

### 1. **Mensajes** (`mensaje`)
- Conversaciones de WhatsApp
- Metadatos de envío y recepción
- Contenido de texto y multimedia

### 2. **Contactos** (`contacto`)
- Información de usuarios de WhatsApp
- Datos demográficos y de contacto
- Estado de suscripción

### 3. **Eventos** (`evento`)
- Eventos del bot y flujos
- Cambios de estado
- Interacciones del usuario

### 4. **Tickets** (`ticket`)
- Atenciones y casos de soporte
- Transferencias entre agentes
- Estados y resolución

### 5. **Plantillas** (`plantilla`)
- Campañas de WhatsApp Business
- Templates de mensajes
- Métricas de envío y respuesta

---

## 🔄 FLUJO DE PROCESAMIENTO

### 1. **Recepción de Webhooks**
```
BLiP → POST /webhook → Procesamiento → Almacenamiento CSV
```

### 2. **Consolidación de Datos**
- Agrupación por tipo de dato
- Filtrado por fechas
- Generación de reportes consolidados

### 3. **Generación de Reportes**
- CSV individuales por tipo
- Reportes consolidados
- Archivos ZIP para descarga

---

## 📁 ARCHIVOS CLAVE

### Backend
- `backend/index.js` - Servidor principal y rutas
- `backend/controllers/webhookController.js` - Lógica de webhooks
- `backend/controllers/reportController.js` - Generación de reportes
- `backend/utils/csvUtils.js` - Utilidades para CSV (1935 líneas)
- `backend/utils/blipUtils.js` - Utilidades específicas de BLiP

### Frontend
- `frontend/src/App.js` - Componente principal
- `frontend/src/components/` - Componentes reutilizables
- `frontend/src/services/api.js` - Servicios de API
- `frontend/src/pages/` - Páginas principales

### Configuración
- `package.json` - Dependencias raíz
- `backend/package.json` - Dependencias backend
- `frontend/package.json` - Dependencias frontend
- `render.yaml` - Configuración de deployment

---

## 🔧 FUNCIONALIDADES PRINCIPALES

### 1. **Procesamiento de Webhooks**
- Identificación automática de tipos de datos
- Almacenamiento en archivos CSV organizados
- Validación y limpieza de datos

### 2. **Consolidación de Reportes**
- Agrupación de archivos por fecha
- Filtrado por rangos temporales
- Generación de archivos consolidados

### 3. **Análisis de Campañas**
- Diferenciación entre BOT y PLANTILLA
- Tracking de respuestas de usuarios
- Métricas de efectividad

### 4. **Gestión de Transferencias**
- Seguimiento de tickets transferidos
- Historial completo de atención
- Análisis de flujos de trabajo

### 5. **Interfaz de Usuario**
- Dashboard en tiempo real
- Filtros de fecha avanzados
- Descarga de reportes
- Notificaciones de estado

---

## 🚀 ENDPOINTS PRINCIPALES

### Webhooks
- `POST /webhook` - Webhook general de BLiP
- `POST /api/bot-event` - Eventos específicos del bot
- `POST /api/campaign-event` - Eventos de campañas

### Reportes
- `GET /descargar/mensajes` - Descarga de mensajes
- `GET /descargar/contactos` - Descarga de contactos
- `GET /descargar/eventos` - Descarga de eventos
- `POST /consolidar/:tipo` - Consolidación por tipo

### API
- `GET /webhook` - Lista de webhooks recibidos
- `GET /api/campanas` - Lista de campañas disponibles
- `GET /api/reportes` - Generación de reportes

---

## 📈 CARACTERÍSTICAS AVANZADAS

### 1. **Procesamiento de Transferencias**
- Algoritmo V4 para tracking de transferencias
- Historial completo de atención
- Análisis de flujos de trabajo

### 2. **Consolidación Inteligente**
- Detección automática de tipos de datos
- Manejo de campos anidados
- Preservación de metadatos

### 3. **Filtrado Avanzado**
- Filtros por fecha con validación
- Filtros por tipo de campaña
- Filtros por estado de tickets

### 4. **Generación de ZIP**
- Compresión de múltiples archivos
- Organización por tipo de dato
- Nombres de archivo con timestamp

---

## 🔍 PATRONES DE CÓDIGO

### 1. **Manejo de Errores**
- Try-catch en funciones async
- Logging detallado con timestamps
- Respuestas HTTP consistentes

### 2. **Validación de Datos**
- Validación de fechas
- Verificación de tipos de datos
- Sanitización de entrada

### 3. **Logging**
- Console.log con prefijos de contexto
- Información de debug detallada
- Tracking de operaciones

### 4. **Modularización**
- Separación de responsabilidades
- Utilidades reutilizables
- Controllers específicos por dominio

---

## 🚨 CONSIDERACIONES IMPORTANTES

### 1. **Rendimiento**
- Procesamiento asíncrono de archivos grandes
- Manejo eficiente de memoria
- Optimización de operaciones CSV

### 2. **Escalabilidad**
- Almacenamiento en archivos (no base de datos)
- Procesamiento por lotes
- Generación de reportes bajo demanda

### 3. **Mantenibilidad**
- Código bien documentado
- Funciones con responsabilidad única
- Estructura modular clara

### 4. **Compatibilidad**
- Soporte para diferentes formatos de fecha
- Manejo de caracteres especiales
- Compatibilidad con diferentes versiones de Node.js

---

## 🎯 CASOS DE USO PRINCIPALES

### 1. **Análisis de Campañas**
- Tracking de efectividad de plantillas
- Análisis de respuestas de usuarios
- Métricas de engagement

### 2. **Gestión de Atención**
- Seguimiento de tickets
- Análisis de transferencias
- Optimización de flujos de trabajo

### 3. **Reportes Empresariales**
- Consolidación de datos históricos
- Análisis de tendencias
- Exportación para herramientas externas

### 4. **Monitoreo en Tiempo Real**
- Dashboard de actividad
- Alertas de eventos importantes
- Tracking de métricas clave

---

## 🔧 COMANDOS ÚTILES

### Desarrollo
```bash
# Instalar dependencias
npm run install

# Desarrollo simultáneo
npm run dev

# Solo backend
cd backend && npm run dev

# Solo frontend
cd frontend && npm start
```

### Producción
```bash
# Build del frontend
npm run build

# Iniciar producción
npm start
```

---

## 📚 RECURSOS ADICIONALES

### Documentación
- `README.md` - Documentación general
- `README_NUEVA_IMPLEMENTACION.md` - Guía de implementación
- `README_TRANSFERENCIAS.md` - Documentación de transferencias
- `README_CAMPAIGN_EVENT.md` - Eventos de campaña
- `README_BOT_EVENTS.md` - Eventos del bot
- `README_FLUJO_PLANTILLAS.md` - Flujo de plantillas

### Archivos de Prueba
- `test_*.js` - Archivos de prueba y debug
- `debug_production.js` - Herramientas de debug
- `generate_test_data_production.js` - Generación de datos de prueba

---

## 🎨 CONVENCIONES DE CÓDIGO

### Nomenclatura
- **Funciones**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Archivos**: kebab-case
- **Variables**: camelCase

### Estructura de Logs
- `[CONTEXTO] Mensaje` - Formato estándar
- Timestamps automáticos
- Información de debug detallada

### Manejo de Errores
- Try-catch en operaciones críticas
- Respuestas HTTP consistentes
- Logging de errores detallado

---

Este contexto proporciona una visión completa del proyecto para mejorar las interacciones con la IA y facilitar el desarrollo y mantenimiento del código. 