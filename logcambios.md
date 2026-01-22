# Log de cambios

## v0.2.1
- Creación de eventos desde un día concreto del calendario con fecha asignada a la columna `fecha`.
- Resaltado del día seleccionado y validación para exigir la selección de fecha antes de crear eventos.
- Sincronización de las filas de asistentes con la fecha seleccionada para mejorar la visualización en el calendario.

## v0.2.0
- Renombradas las categorías del calendario a "Talleres de tarde", "Comida", "Cena" y "Visita turística".
- Selector de mes en el calendario mensual.
- Formulario para crear eventos con nombre, tipo y asistentes, generando filas por asistente.
- Inclusión del campo `nombre` en los eventos y actualización de documentación.

## v0.1.0
- Inicialización del proyecto Next.js con App Router y Tailwind CSS.
- Implementación de login custom contra Appwrite (colección `users`).
- Vista de calendario mensual con eventos por usuario desde Appwrite.
- Documentación de despliegue y configuración.

## v0.1.1
- Ajuste de la rejilla del calendario a 7 columnas fijas con scroll horizontal en pantallas pequeñas.
- Actualización de Next.js a versión con parche de seguridad.

## v0.1.2
- Ajuste de tipado Appwrite para compatibilidad con `Models.Document`.

## v0.1.3
- Configuración de Vercel para forzar la detección de Next.js.

## v0.1.4
- Registro detallado en la pantalla de acceso con estados de conexión a Appwrite.
