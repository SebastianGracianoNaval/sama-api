# 🤖 GUÍA DE CONTEXTO PARA IA - Sama-Node

## 📋 RESUMEN EJECUTIVO

Este proyecto incluye **3 archivos de contexto** diseñados específicamente para mejorar las interacciones con la IA durante el desarrollo, debugging y mantenimiento del proyecto Sama-Node.

---

## 📁 ARCHIVOS DE CONTEXTO

### 1. **`CONTEXTO_PROYECTO.md`** 📊
**Propósito**: Visión general completa del proyecto
- Descripción del proyecto y objetivos
- Arquitectura y stack tecnológico
- Tipos de datos procesados (mensajes, contactos, eventos, tickets, plantillas)
- Funcionalidades principales
- Endpoints y flujos de procesamiento
- Patrones de código y convenciones
- Casos de uso principales

### 2. **`CONTEXTO_DESARROLLO.md`** 🔧
**Propósito**: Información técnica detallada para desarrollo
- Arquitectura técnica específica
- Estructura de datos BLiP
- Flujos de procesamiento detallados
- Utilidades clave (csvUtils.js, blipUtils.js)
- Patrones de debugging
- Problemas comunes y soluciones
- Métricas y monitoreo
- Configuración de desarrollo

### 3. **`PROMPTS_IA.md`** 🤖
**Propósito**: Prompts optimizados para interacciones con IA
- Prompts generales para análisis y debugging
- Prompts específicos por área (backend, frontend, CSV)
- Prompts de debugging para problemas comunes
- Prompts de análisis de arquitectura y código
- Prompts de implementación y refactoring
- Prompts de documentación y testing
- Consejos para usar los prompts efectivamente

---

## 🎯 CÓMO USAR ESTOS ARCHIVOS

### **Para Análisis de Código**
1. **Lee** `CONTEXTO_PROYECTO.md` para entender el contexto general
2. **Consulta** `CONTEXTO_DESARROLLO.md` para detalles técnicos específicos
3. **Usa** los prompts de `PROMPTS_IA.md` para formular tu pregunta

### **Para Debugging**
1. **Identifica** el área del problema (webhook, CSV, frontend, etc.)
2. **Revisa** la sección correspondiente en `CONTEXTO_DESARROLLO.md`
3. **Aplica** el prompt de debugging específico de `PROMPTS_IA.md`

### **Para Nuevas Funcionalidades**
1. **Entiende** la arquitectura en `CONTEXTO_PROYECTO.md`
2. **Analiza** los patrones técnicos en `CONTEXTO_DESARROLLO.md`
3. **Usa** los prompts de implementación de `PROMPTS_IA.md`

---

## 🚀 BENEFICIOS DE USAR ESTOS ARCHIVOS

### **Para el Desarrollador**
- ✅ **Respuestas más precisas** de la IA
- ✅ **Menos iteraciones** para obtener soluciones útiles
- ✅ **Código más coherente** con el proyecto existente
- ✅ **Debugging más eficiente**
- ✅ **Implementación más rápida** de nuevas funcionalidades

### **Para la IA**
- ✅ **Contexto completo** del proyecto
- ✅ **Patrones de código** específicos
- ✅ **Arquitectura conocida** de antemano
- ✅ **Casos de uso** claros
- ✅ **Soluciones más relevantes**

---

## 📝 EJEMPLO DE USO

### **Escenario**: Problema con procesamiento de webhooks

**Sin contexto**:
```
"Tengo un error en mi código de Node.js"
```

**Con contexto**:
```
Contexto: Sama-Node - Problema con procesamiento de webhooks

Error: Los webhooks de plantillas no se están procesando correctamente
Archivos involucrados: webhookController.js, csvUtils.js
Logs: [PEGAR LOGS ESPECÍFICOS]

Considerando la arquitectura del proyecto:
- Backend: Express con controllers y utils
- Procesamiento: CSV con json2csv
- Tipos de datos: mensajes, contactos, eventos, tickets, plantillas

Ayúdame a identificar la causa raíz y proponer soluciones.
```

---

## 🔧 INTEGRACIÓN CON CURSOR

### **Configuración Recomendada**
1. **Mantén** estos archivos en la raíz del proyecto
2. **Referencia** el contexto en tus prompts
3. **Actualiza** los archivos cuando cambie la arquitectura
4. **Comparte** el contexto con otros desarrolladores

### **Flujo de Trabajo Optimizado**
1. **Antes de preguntar**: Lee el contexto relevante
2. **Durante la pregunta**: Usa los prompts específicos
3. **Después de la respuesta**: Valida contra el contexto
4. **Iteración**: Refina basado en la respuesta

---

## 📈 MÉTRICAS DE ÉXITO

### **Indicadores de Mejora**
- ⏱️ **Tiempo de respuesta**: Reducción del 50% en iteraciones
- 🎯 **Precisión**: 90% de soluciones relevantes desde el primer intento
- 🔧 **Implementación**: 80% de código listo para usar
- 🐛 **Debugging**: 70% de problemas resueltos en primera interacción

---

## 🔄 MANTENIMIENTO

### **Cuándo Actualizar**
- ✅ **Nuevas funcionalidades** agregadas al proyecto
- ✅ **Cambios en arquitectura** o stack tecnológico
- ✅ **Nuevos patrones** de código implementados
- ✅ **Problemas recurrentes** identificados
- ✅ **Mejoras en prompts** descubiertas

### **Proceso de Actualización**
1. **Identifica** el cambio necesario
2. **Actualiza** el archivo correspondiente
3. **Valida** que la información sea precisa
4. **Comunica** el cambio al equipo
5. **Testea** con nuevos prompts

---

## 💡 CONSEJOS ADICIONALES

### **Para Maximizar el Beneficio**
1. **Sé específico** en tus preguntas
2. **Proporciona contexto** relevante
3. **Usa los prompts** como base, no como regla fija
4. **Itera** basado en las respuestas
5. **Documenta** las mejoras descubiertas

### **Para el Equipo**
1. **Comparte** estos archivos con todos los desarrolladores
2. **Establece** convenciones para usar el contexto
3. **Revisa** periódicamente la precisión de la información
4. **Colabora** en mejorar los prompts
5. **Mide** el impacto en la productividad

---

## 🎯 CONCLUSIÓN

Estos archivos de contexto están diseñados para **transformar** la forma en que interactúas con la IA durante el desarrollo del proyecto Sama-Node. Al proporcionar contexto específico y prompts optimizados, puedes obtener respuestas más precisas, relevantes y útiles.

**Recuerda**: El contexto es dinámico. Mantén estos archivos actualizados y mejóralos continuamente basado en tu experiencia y las necesidades del proyecto.

---

**¡Comienza a usar estos archivos hoy mismo y experimenta la diferencia en tus interacciones con la IA!** 🚀 