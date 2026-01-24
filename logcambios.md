# Log de cambios

## v0.2.27
- Corrección del guardado de `horasObtenidas` en Appwrite enviando el valor como string para cumplir el esquema actual de la colección.
- Normalización de `horasObtenidas` a número en cliente para comparar correctamente antes de actualizar.

## v0.2.26
- Compatibilidad añadida con la colección `horasDeclaradas` mediante la variable `NEXT_PUBLIC_APPWRITE_HORASDECLARADAS_COLLECTION_ID`.
- Nuevo servicio para sumar las horas declaradas por usuario y actualización del tipado de `users` con `horasObtenidas`.
- Nueva vista "Cálculo de horas" accesible desde "Mis eventos" con 3 KPI: horas obtenidas, declaradas y restantes.
- Al entrar en "Cálculo de horas" se recalculan las horas (eventos × 3) y se guardan en `horasObtenidas` del usuario.

## v0.2.25
- Añadidos botones centrados "Crear evento" y "Crear varios eventos" junto al toggle Laboral/Natural.
- Nuevo modal "Crear varios eventos" con selección de nombre, tipo, asistentes, establecimiento, hora de inicio y un calendario reducido con multiselección por mes y año.
- La creación masiva genera eventos para cada día seleccionado y crea filas por asistente con los mismos detalles.
- Ajustes en la gestión de asistentes y establecimiento para soportar la creación masiva.

## v0.2.24
- Exportación CSV adaptada para Excel con separador punto y coma, sin comillas y con saneado de valores.

## v0.2.23
- Botones de exportación a Excel (CSV) añadidos en vistas "Mis eventos" y "Tabla de control".
- Generación de archivos con detalle de eventos según la vista seleccionada.

## v0.2.22
- Navegación semanal habilitada con botones de semana anterior/siguiente.
- Tarjetas semanales muestran solo la hora en formato HH:MM.
- Vista Tabla de control convertida a acordeón agrupado por usuario, año y mes.

## v0.2.21
- Tarjetas de eventos semanales compactadas con hora y asistentes en formato mínimo.

## v0.2.20
- Corrección del acordeón "Mis eventos" para usar `open` y evitar errores de compilación.

## v0.2.19
- Vista laboral activada por defecto con semana laboral en una sola línea en la vista semanal.
- Nueva vista "Mis eventos" en formato acordeón por año/mes con detalles desplegables.
- Selector de asistentes actualizado para mover usuarios con clic directo en la lista.

## v0.2.18
- Nueva vista semanal centrada en la semana actual, con tarjetas más grandes y eventos detallados.
- Toggle Natural/Laboral para ocultar sábados y domingos en vistas mensual y semanal.
- Selector de asistentes actualizado para mover usuarios entre listas con botones + y -.

## v0.2.17
- Eliminación de la hora fin en creación/edición/visualización, dejando solo hora de inicio.
- Restricción de rol "User" para impedir creación de eventos y limitar la edición a asistentes.
- Cambio de color de "Cena" a azul celeste.
- Encabezado de sesión compactado y alineado a la derecha.
- Botones toggle de vista (Mensual/Semanal) y toggles "Mis eventos" / "Tabla de control" con visibilidad restringida por rol.

## v0.2.16
- Adaptación al nuevo campo `role` en la colección `users`, con persistencia del rol en sesión.
- Selector visual de asistentes basado en la tabla de usuarios, usando botones + por usuario y chips de selección.
- Colores por usuario para hacer más visuales los asistentes y el listado de la tabla principal.
- Validaciones para evitar asistentes fuera de la colección `users`.

## v0.2.15
- Botón + en cada día para abrir el modal de creación, manteniendo el clic del día para ver detalles.
- Nuevo modal animado con el detalle diario de eventos en formato franjas (nombre, tipo, ubicación) y datos de asistentes/horas.
- Visibilidad reforzada del contador de asistentes en las tarjetas del calendario.

## v0.2.14
- Reincorporado el contador de asistentes en las tarjetas del calendario.
- Ordenados los eventos diarios según la hora de inicio.

## v0.2.13
- Modales de creación/edición con scroll interno para evitar desplazar la app al usar la rueda.
- Selector de establecimiento convertido en buscador con modal, lupa de acceso y alta rápida con botón +.
- Banda completa del evento coloreada por tipo y filtros superiores con colores que resaltan eventos del calendario.

## v0.2.12
- Colores fijos por `eventType` aplicados a la banda visible de cada evento en el calendario mensual.

## v0.2.11
- Corrección del tipado del formulario de edición para evitar errores de compilación.

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
