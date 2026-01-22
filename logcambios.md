# Log de cambios

## v0.2.10
- Ajuste del cliente Appwrite para evitar errores de despliegue al cargar sin variables de entorno.
- Indicador visual por color en la columna de tipo de evento dentro de la tabla.

## v0.2.9
- Selección de hora de inicio y fin en creación/edición, guardando la hora en `fecha`, `horaInicio` y `horaFin`.
- Edición completa de eventos desde el modal, con actualización de asistentes y valores asociados.
- Incorporación de establecimiento obligatorio desde la colección `establecimiento` y visualización en la tabla.

## v0.2.8
- Tarjetas de eventos sin texto de tipo, con franja de color más compacta y colores por categoría.
- Cierre automático del modal al crear eventos correctamente.
- Eliminados ejemplos de texto en los campos del modal de creación.
- Añadida la configuración de la colección `establecimiento` desde Appwrite para uso futuro.

## v0.2.7
- El formulario de creación de eventos ahora se abre en un modal animado al seleccionar un día del calendario.
- Visualización de eventos como franjas apiladas de ancho completo con nombre y contador de asistentes.
- Modal de detalle al pulsar un evento, mostrando el listado de asistentes.
- Actualización de categorías y colores para Comida, Cena, Taller y Visita cultural.

## v0.2.6
- Normalización del campo `fecha` para ignorar horas al filtrar eventos mensuales y agruparlos en el calendario.
- Reutilización del listado completo de eventos para pintar todas las fechas en el calendario.
- Utilidad compartida para parsear fechas en formato ISO o `dd/MM/yyyy`.

## v0.2.5
- Listado completo de la colección `tabla` debajo del calendario con detalle de campos.
- Carga paginada de todos los registros de eventos desde Appwrite para la tabla completa.
- Recarga de la tabla completa tras crear eventos para reflejar los nuevos registros.

## v0.2.4
- Carga de eventos filtrada por mes/año desde `fecha` usando comparación por año/mes/día.
- Comparación diaria basada en `Date` para ubicar eventos en la celda correcta del calendario.
- Eliminación de la visualización de horarios en las tarjetas del calendario.
- Formateo local de fechas para persistencia sin depender de `toISOString()`.

## v0.2.3
- Agrupación de filas por evento para compactar la representación diaria en el calendario.
- Tarjetas de evento con nombre y tipo visibles, más conteo de asistentes cuando aplica.
- Tipado compartido para eventos compactos en la vista calendario.

## v0.2.2
- Ajuste del calendario para emparejar eventos por la columna `fecha`, garantizando la coincidencia diaria.
- Visualización de eventos como franjas compactas dentro de cada día del calendario.
- Documentación ampliada para exigir el campo `fecha` en la colección `tabla`.

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
