# Reestructuración a gestión de trabajadores

## Respaldo

Antes de aplicar cambios se creó el archivo:

`C:\Users\felip\.copilot\session-state\65197b32-3623-4d9e-b38d-c1b2494a0c26\files\mr2025-before-restructure.zip`

No se modificaron ni eliminaron registros históricos de MongoDB durante esta reestructuración.

## Backend reemplazado

Se conservaron Express y MongoDB. Se eliminaron los módulos, rutas, modelos, controladores y servicios de:

- conductores;
- pasajeros;
- vehículos;
- rutas;
- incidencias;
- finanzas y vales;
- chat y conversaciones;
- Firebase;
- tokens push;
- autenticación por cookie/JWT;
- limpieza cron de mensajes.

Los nuevos módulos son:

- `src/models/workerModels.js`
- `src/models/trainingModels.js`
- `src/controllers/workerController.js`
- `src/controllers/trainingController.js`
- `src/controllers/dashboardController.js`
- `src/controllers/reportController.js`

Las eliminaciones de trabajadores y capacitaciones son eliminaciones suaves: se conservan sus registros y certificados asociados.

## Frontend reemplazado

La aplicación web ahora abre directamente el Dashboard Operativo y solo ofrece:

- Dashboard Operativo;
- Trabajadores;
- Capacitaciones;
- Reportes;
- Configuración.

Los archivos de componentes, contextos y configuraciones del sistema anterior fueron retirados.

## Aplicación móvil

La aplicación móvil quedó desactivada y muestra únicamente un aviso informativo. No contiene navegación de conductores, autenticación, chat, Firebase ni notificaciones.
