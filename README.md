# BLiP Webhook Dashboard

Este proyecto es un dashboard para visualizar y gestionar webhooks de BLiP, con la capacidad de descargar reportes en formato CSV.

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

### Backend (Node.js/Express)
- API REST para manejar webhooks y descargas de reportes
- Almacenamiento de datos en archivos CSV
- Procesamiento de datos de BLiP

### Frontend (React)
- Interfaz de usuario moderna con Material-UI
- Visualización de webhooks en tiempo real
- Descarga de reportes con filtros de fecha

## Requisitos

- Node.js >= 14.x
- npm >= 6.x

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd sama-node
```

2. Instalar dependencias del backend:
```bash
cd backend
npm install
```

3. Instalar dependencias del frontend:
```bash
cd ../frontend
npm install
```

## Configuración

1. Crear un archivo `.env` en el directorio `backend` con las siguientes variables:
```
PORT=3000
```

## Ejecución

1. Iniciar el backend:
```bash
cd backend
npm start
```

2. Iniciar el frontend:
```bash
cd frontend
npm start
```

El backend estará disponible en `http://localhost:3000` y el frontend en `http://localhost:3001`.

## Características

- Visualización de webhooks en tiempo real
- Descarga de reportes en formato CSV
- Filtrado de reportes por fecha
- Interfaz de usuario moderna y responsiva
- Notificaciones toast para feedback al usuario

## Tecnologías Utilizadas

### Backend
- Node.js
- Express
- EJS (para vistas)
- json2csv
- archiver

### Frontend
- React
- Material-UI
- React Router
- Axios
- React-Toastify

## Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia ISC. 