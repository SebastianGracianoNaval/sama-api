# 🤖 PROMPTS PARA IA - Sama-Node

## 📋 GUÍA DE PROMPTS OPTIMIZADOS

Este archivo contiene prompts específicos y optimizados para mejorar las interacciones con la IA durante el desarrollo del proyecto Sama-Node.

---

## 🎯 PROMPTS GENERALES

### 1. **Análisis de Código**
```
Contexto: Proyecto Sama-Node - Dashboard de webhooks BLiP
Stack: Node.js/Express (backend) + React/Material-UI (frontend)
Archivo: [ARCHIVO_ESPECÍFICO]

Analiza el siguiente código considerando:
- Patrones de logging: [CONTEXTO] Mensaje
- Manejo de errores: try-catch con console.error
- Estructura de datos BLiP (mensajes, contactos, eventos, tickets, plantillas)
- Procesamiento CSV con json2csv y csv-parse
- Validación de fechas con fechaEnRango()

[PEGAR CÓDIGO AQUÍ]

Proporciona:
1. Análisis de la lógica
2. Posibles mejoras
3. Problemas potenciales
4. Sugerencias de optimización
```

### 2. **Debugging de Problemas**
```
Contexto: Sama-Node - Problema con [TIPO_DE_PROBLEMA]

Síntomas:
- [DESCRIBIR SÍNTOMAS]

Archivos involucrados:
- [LISTAR ARCHIVOS]

Logs relevantes:
[PEGAR LOGS]

Considerando la arquitectura del proyecto:
- Backend: Express con controllers y utils
- Frontend: React con Material-UI
- Procesamiento: CSV con json2csv
- Almacenamiento: Archivos en data/[tipo]/

Ayúdame a:
1. Identificar la causa raíz
2. Proponer soluciones
3. Sugerir mejoras preventivas
```

### 3. **Nuevas Funcionalidades**
```
Contexto: Sama-Node - Nueva funcionalidad [NOMBRE]

Requerimientos:
- [DESCRIBIR FUNCIONALIDAD]

Considerando:
- Estructura actual del proyecto
- Patrones de código existentes
- Tipos de datos BLiP procesados
- Utilidades disponibles en csvUtils.js (1935 líneas)
- Controllers existentes (webhookController.js, reportController.js)

Proporciona:
1. Arquitectura de la solución
2. Archivos a modificar/crear
3. Código de implementación
4. Consideraciones de testing
```

---

## 🔧 PROMPTS ESPECÍFICOS POR ÁREA

### **Backend - Webhooks**

#### 1. **Nuevo Tipo de Webhook**
```
Contexto: Sama-Node - Nuevo tipo de webhook BLiP

Tipo: [NUEVO_TIPO]
Estructura de datos:
[PEGAR EJEMPLO JSON]

Considerando:
- blipUtils.js: identificarTipoJson()
- csvUtils.js: procesar[Tipo]()
- webhookController.js: handleWebhook()
- index.js: rutas de webhook

Implementa:
1. Identificación del tipo en blipUtils.js
2. Función de procesamiento en csvUtils.js
3. Manejo en webhookController.js
4. Ruta en index.js si es necesario
```

#### 2. **Optimización de Procesamiento**
```
Contexto: Sama-Node - Optimización de procesamiento de webhooks

Problema actual:
- [DESCRIBIR PROBLEMA DE RENDIMIENTO]

Archivos críticos:
- csvUtils.js (1935 líneas)
- webhookController.js (897 líneas)
- index.js (680 líneas)

Considerando:
- Procesamiento asíncrono
- Manejo de memoria
- Operaciones de archivo
- Validación de datos

Proporciona:
1. Análisis de cuellos de botella
2. Soluciones de optimización
3. Código refactorizado
4. Métricas de mejora
```

### **Backend - CSV y Reportes**

#### 1. **Nuevo Campo en CSV**
```
Contexto: Sama-Node - Nuevo campo en reportes CSV

Campo: [NOMBRE_CAMPO]
Tipo: [TIPO_DATO]
Origen: [DE_DÓNDE_VIENE]

Considerando:
- Estructura actual de CSV
- Función flattenObject() para campos anidados
- Consolidación de archivos
- Compatibilidad con reportes existentes

Implementa:
1. Modificación de función de procesamiento
2. Actualización de array de campos
3. Verificación en consolidación
4. Testing con datos reales
```

#### 2. **Nuevo Filtro de Reportes**
```
Contexto: Sama-Node - Nuevo filtro para reportes

Filtro: [TIPO_FILTRO]
Criterios: [CRITERIOS]

Considerando:
- Función fechaEnRango() existente
- Endpoints /descargar/*
- Validación de parámetros
- Frontend con Material-UI

Implementa:
1. Validación en backend
2. Endpoint actualizado
3. Modificación de frontend
4. Testing de filtros
```

### **Frontend - React**

#### 1. **Nuevo Componente**
```
Contexto: Sama-Node - Nuevo componente React

Componente: [NOMBRE_COMPONENTE]
Propósito: [DESCRIPCIÓN]

Considerando:
- Material-UI v7.1.1
- Estructura de componentes existente
- Patrones de API con axios
- Notificaciones con react-toastify

Implementa:
1. Estructura del componente
2. Integración con Material-UI
3. Manejo de estado
4. Integración con API
```

#### 2. **Optimización de UI**
```
Contexto: Sama-Node - Optimización de interfaz

Problema: [DESCRIBIR PROBLEMA UI/UX]

Componentes involucrados:
- [LISTAR COMPONENTES]

Considerando:
- Material-UI design system
- Responsive design
- Performance de React
- Accesibilidad

Proporciona:
1. Análisis del problema
2. Soluciones de UI/UX
3. Código optimizado
4. Consideraciones de accesibilidad
```

---

## 🚨 PROMPTS DE DEBUGGING

### **Problemas de Webhook**
```
Contexto: Sama-Node - Debugging de webhook

Error: [DESCRIBIR ERROR]
Webhook recibido:
[PEGAR JSON DEL WEBHOOK]

Logs del servidor:
[PEGAR LOGS]

Considerando:
- Función identificarTipoJson()
- Estructura de datos BLiP
- Procesamiento en csvUtils.js
- Almacenamiento en archivos

Ayúdame a:
1. Identificar el problema
2. Proponer solución
3. Verificar datos de entrada
4. Validar procesamiento
```

### **Problemas de CSV**
```
Contexto: Sama-Node - Problemas con archivos CSV

Problema: [DESCRIBIR PROBLEMA]
Archivo CSV generado:
[PEGAR PRIMERAS LÍNEAS DEL CSV]

Datos de entrada:
[PEGAR JSON DE ENTRADA]

Considerando:
- Función convertJsonToCsv()
- Manejo de campos anidados
- Encoding UTF-8
- Estructura de campos

Ayúdame a:
1. Identificar causa del problema
2. Corregir procesamiento
3. Validar estructura de datos
4. Verificar encoding
```

### **Problemas de Rendimiento**
```
Contexto: Sama-Node - Problemas de rendimiento

Síntoma: [DESCRIBIR PROBLEMA DE RENDIMIENTO]
Operación: [DESCRIBIR OPERACIÓN]

Métricas actuales:
- Tiempo de respuesta: [TIEMPO]
- Uso de memoria: [MEMORIA]
- Tamaño de archivos: [TAMAÑO]

Considerando:
- Procesamiento de archivos grandes
- Operaciones síncronas vs asíncronas
- Manejo de memoria
- Optimización de CSV

Ayúdame a:
1. Identificar cuellos de botella
2. Proponer optimizaciones
3. Implementar mejoras
4. Medir impacto
```

---

## 📈 PROMPTS DE ANÁLISIS

### **Análisis de Arquitectura**
```
Contexto: Sama-Node - Análisis de arquitectura

Área: [BACKEND/FRONTEND/INTEGRACIÓN]
Enfoque: [RENDIMIENTO/ESCALABILIDAD/MANTENIBILIDAD]

Considerando:
- Estructura actual del proyecto
- Patrones de código
- Dependencias críticas
- Casos de uso principales

Proporciona:
1. Análisis de la arquitectura actual
2. Identificación de fortalezas
3. Áreas de mejora
4. Recomendaciones específicas
```

### **Análisis de Código**
```
Contexto: Sama-Node - Análisis de código

Archivo: [NOMBRE_ARCHIVO]
Enfoque: [CALIDAD/PERFORMANCE/SECURITY]

Código a analizar:
[PEGAR CÓDIGO]

Considerando:
- Patrones del proyecto
- Mejores prácticas
- Estándares de código
- Casos edge

Proporciona:
1. Análisis de calidad
2. Problemas identificados
3. Sugerencias de mejora
4. Ejemplos de código optimizado
```

---

## 🎯 PROMPTS DE IMPLEMENTACIÓN

### **Nueva Funcionalidad Completa**
```
Contexto: Sama-Node - Implementación completa

Funcionalidad: [NOMBRE_FUNCIONALIDAD]
Requerimientos:
- [LISTAR REQUERIMIENTOS]

Considerando la arquitectura completa:
- Backend: Express + controllers + utils
- Frontend: React + Material-UI + services
- Procesamiento: CSV + webhooks
- Deployment: Render.com

Implementa:
1. Arquitectura de la solución
2. Backend: endpoints, controllers, utils
3. Frontend: componentes, servicios, UI
4. Testing y validación
5. Documentación
```

### **Refactoring de Código**
```
Contexto: Sama-Node - Refactoring

Archivo: [NOMBRE_ARCHIVO]
Problema: [DESCRIBIR PROBLEMA]

Código actual:
[PEGAR CÓDIGO]

Objetivos del refactoring:
- [LISTAR OBJETIVOS]

Considerando:
- Patrones del proyecto
- Mantenibilidad
- Performance
- Legibilidad

Proporciona:
1. Código refactorizado
2. Explicación de cambios
3. Beneficios obtenidos
4. Consideraciones de testing
```

---

## 📚 PROMPTS DE DOCUMENTACIÓN

### **Documentación de API**
```
Contexto: Sama-Node - Documentación de API

Endpoint: [ENDPOINT]
Método: [GET/POST/PUT/DELETE]

Considerando:
- Estructura de respuesta actual
- Parámetros de entrada
- Casos de uso
- Ejemplos de datos

Genera:
1. Descripción del endpoint
2. Parámetros de entrada
3. Estructura de respuesta
4. Ejemplos de uso
5. Casos edge y errores
```

### **Documentación de Componente**
```
Contexto: Sama-Node - Documentación de componente

Componente: [NOMBRE_COMPONENTE]
Propósito: [DESCRIPCIÓN]

Considerando:
- Props del componente
- Estados internos
- Integración con API
- Casos de uso

Genera:
1. Descripción del componente
2. Props y tipos
3. Estados y efectos
4. Ejemplos de uso
5. Consideraciones de testing
```

---

## 🔍 PROMPTS DE TESTING

### **Testing de Webhook**
```
Contexto: Sama-Node - Testing de webhook

Tipo: [TIPO_WEBHOOK]
Escenario: [DESCRIBIR ESCENARIO]

Datos de prueba:
[PEGAR JSON DE PRUEBA]

Considerando:
- Función identificarTipoJson()
- Procesamiento en csvUtils.js
- Almacenamiento de archivos
- Validación de datos

Genera:
1. Test case completo
2. Datos de entrada
3. Resultados esperados
4. Validaciones
5. Casos edge
```

### **Testing de Reporte**
```
Contexto: Sama-Node - Testing de reporte

Tipo: [TIPO_REPORTE]
Filtros: [FILTROS_APLICADOS]

Datos de entrada:
[PEGAR DATOS DE PRUEBA]

Considerando:
- Función de consolidación
- Filtros de fecha
- Estructura de CSV
- Validación de resultados

Genera:
1. Test case completo
2. Datos de entrada
3. Resultados esperados
4. Validaciones de CSV
5. Casos de error
```

---

## 💡 CONSEJOS PARA USAR ESTOS PROMPTS

### **Antes de Usar un Prompt**
1. **Contextualiza**: Siempre menciona que es el proyecto Sama-Node
2. **Especifica**: Indica el archivo o área específica
3. **Proporciona datos**: Incluye logs, errores o código relevante
4. **Define objetivos**: Especifica qué quieres lograr

### **Durante la Interacción**
1. **Sé específico**: Usa los prompts como base y personalízalos
2. **Proporciona contexto**: Incluye información relevante del proyecto
3. **Itera**: Refina el prompt basado en las respuestas
4. **Valida**: Verifica que la solución se ajuste al proyecto

### **Después de la Respuesta**
1. **Revisa**: Verifica que la solución sea coherente con el proyecto
2. **Adapta**: Ajusta el código a los patrones existentes
3. **Testea**: Valida la implementación
4. **Documenta**: Actualiza la documentación si es necesario

---

Estos prompts están diseñados específicamente para el proyecto Sama-Node y consideran su arquitectura, patrones de código y tecnologías utilizadas. Úsalos como base y personalízalos según tus necesidades específicas. 