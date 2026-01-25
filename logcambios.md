# Log de cambios

## v0.2.44
- En el detalle de establecimientos se muestra la URL de Maps como hipervínculo visible.
- Se consolida la versión de la app en `0.2.44`.

## v0.2.43
- La URL de ubicación del establecimiento ahora se construye desde la columna de ubicación/dirección registrada, priorizando la URL Maps si existe.
- Se consolida la versión de la app en `0.2.43`.

## v0.2.42
- Se añade el módulo completo de **Restaurantes** con acceso desde el panel superior, "Mis eventos" y "Tabla de control".
- La gestión de restaurantes incorpora estado **sugerido/aceptado**, listado en acordeón y detalle con dirección, teléfono y enlace a Maps con icono.
- Se habilitan acciones de sugerir, crear (con ID correlativo `establecimientoId`), editar y eliminar; además, los roles Admin/Boss/Eventmaster pueden aceptar sugerencias.
- Se consolida la versión de la app en `0.2.42`.

## v0.2.41
- En la vista mensual, se reserva más espacio para el contador de asistentes y se trunca el nombre justo antes del número.
- En la vista semanal, el nombre y el establecimiento se separan en dos líneas sin el separador "•".
- El establecimiento se muestra en una única línea con truncado para ocupar el máximo ancho disponible.
- Se consolida la versión de la app en `0.2.41`.

## v0.2.40
- El establecimiento predeterminado al crear eventos pasa a ser **“Rte. Goya (Hotel Diagonal Plaza)”**, con fallback al primer establecimiento disponible si fuera necesario.
- Se añade un enlace **“LINK a UBICACIÓN DEL RESTAURANTE”** justo debajo del campo de notas en los modales de crear y editar, abriendo Google Maps con el establecimiento seleccionado.
- En las vistas de calendario **semanal y mensual** se elimina la visualización explícita del **tipo de evento** en las tarjetas.
- El número de asistentes se refuerza visualmente en las tarjetas del calendario:
  - Se muestra en la esquina inferior derecha.
  - Se presenta con un tamaño más grande para mejorar la legibilidad.
- Se consolida la versión de la app en `0.2.40`.

## v0.2.39
- Se eliminan los textos de ayuda “Clic para añadir” y “Clic para quitar” en el editor de eventos (crear, editar y creación masiva), dejando la interacción más limpia.
- Se consolida la versión de la app en `0.2.39`.

## v0.2.38
- Se elimina el puntito de color junto al nombre en las listas de usuarios al añadir/quitar asistentes (crear, editar y creación masiva), dejando solo la pastilla con el nombre.
- La cabecera del calendario se reorganiza:
  - "Mis eventos" y "Tabla de control" se mueven a una nueva fila superior.
  - Los botones de navegación (semana/mes anterior y siguiente) bajan a una fila inferior y se muestran más pequeños.
- Se consolida la versión de la app en `0.2.38`.

## v0.2.37
- El nombre del evento ahora se genera automáticamente al crear y editar, concatenando según el tipo:
  - Comida y cena: `Tipo - Establecimiento - fecha`.
  - Talleres: `Taller - certificación - promoción - fecha`.
  - Visitas culturales: `Visita cultural - establecimiento - certificación - promoción - fecha`.
- El nombre autogenerado sigue siendo editable: si el usuario lo modifica manualmente, se respeta.
- En la creación masiva, el nombre automático se ajusta por cada fecha seleccionada cuando no se ha personalizado el nombre.
- Se elimina la visualización del **ROL** en las cajas de asistentes de los modales de crear, editar y crear varios eventos.
- Se consolida la versión de la app en `0.2.37`.

## v0.2.36
- El modal de **Crear evento** y el de **Detalle/edición** se amplían al doble de ancho (`max-w-4xl`) manteniendo el scroll vertical.
- Ambos modales se reorganizan en dos grandes apartados izquierda/derecha:
  - Izquierda: Nombre, tipo, fecha, hora inicio, asistentes, certificación y promoción.
  - Derecha: Establecimiento, menú y notas.
- El campo **Menú** pasa a un flujo progresivo con botón **“Añadir plato”**:
  - Permite hasta 8 platos.
  - Cada clic añade una nueva caja de texto debajo de la anterior.
- El menú se normaliza para guardarse en la columna `menu` separado por `;` (p.ej. `Gamba con foie;Escalopines;Dulce de leche`).
- La creación masiva también normaliza el menú admitiendo `;` o saltos de línea y guardando siempre con `;`.
- Se consolida la versión de la app en `0.2.36`.

## v0.2.35
- Se añaden los nuevos campos `certificacion`, `promocion` y `menu` al tipado de eventos y a la creación/actualización en la colección `tabla`.
- Se incorpora un selector de **Certificación** (CAAG, CAZ, GFD, OTROS) y los campos libres de **Promoción** y **Menú** en "Crear evento" y "Crear varios eventos".
- En la edición/detalle del evento se añaden los mismos campos y el **Menú** se sitúa justo encima de "Notas".
- El campo **Menú** permite maquetar contenido como lista con puntos mediante una vista previa que interpreta cada línea como un elemento.
- La agrupación de eventos ahora considera `certificacion`, `promocion` y `menu` para evitar mezclar eventos con distinto detalle.
- Se consolida la versión de la app en `0.2.35`.

## v0.2.34
- Se añaden iconos SVG multicolor y modernos para Calendario, Mis eventos, Cálculo de horas y Tabla de control.
- Los toggles principales y los botones de navegación ahora muestran el icono correspondiente alineado a la izquierda del texto.
- Los encabezados de los módulos "Mis eventos", "Cálculo de horas" y "Tabla de control" incorporan sus iconos para reforzar la identificación visual.
- En la vista "Tabla de control" se añaden dos acciones por usuario en el acordeón: acceso directo a "Mis eventos" y a "Cálculo de horas" con el contexto de ese usuario.
- Se habilita un contexto de usuario objetivo para que "Mis eventos" y "Cálculo de horas" puedan abrirse para un usuario concreto desde la Tabla de control, mostrando claramente el usuario activo.

## v0.2.33
- Eliminada la referencia visual a la "Escala máxima" en la cabecera del gráfico de barras de horas.
- Al guardar en "Declarar horas" el modal ahora se cierra automáticamente, tanto en altas como en ediciones.
- Se añade bajo el gráfico un listado de horas declaradas con: Día, nº de horas, Motivo y Fecha del último cambio.
- El listado permite editar cada registro, abriendo el modal con sus datos precargados y reescribiendo la declaración al guardar.
- El listado permite eliminar declaraciones de horas con confirmación previa.
- Se amplía el servicio `horasDeclaradasService` con utilidades para normalizar horas declaradas y operaciones de actualización/eliminación.

## v0.2.32
- El punto final ahora siempre se alinea a horas enteras respecto al inicio (p.ej. 07:30 → 08:30, 09:30, etc.), eliminando duraciones de media hora.
- Se recalculan y limitan los extremos del rango para respetar la ventana 07:30-16:30 con pasos de 1 hora desde el inicio.
- Se corrige el desajuste visual del slider usando el rango completo como base del control, haciendo que el coloreado coincida con el punto derecho.

## v0.2.31
- El slider de "Declarar horas" se rehizo como rango con dos puntos (inicio y fin) dentro de la ventana 07:30-16:30.
- El punto de inicio ahora permite seleccionar cualquier hora o media hora.
- El punto final se mueve únicamente en horas enteras y se ajusta dinámicamente según el inicio.
- Se limita el rango declarado a un máximo de 7 horas y se recalculan automáticamente `horasDeclaradas` y `horasDeclaradasRango`.

## v0.2.30
- El slider de "Declarar horas" ahora selecciona la hora de inicio dentro de la ventana 07:30-16:30, manteniendo una duración fija de 7 horas enteras.
- Se muestra el rango calculado (inicio-fin) y la ventana diaria permitida directamente en el modal para mayor claridad.
- Se guarda el nuevo campo `horasDeclaradasRango` en la colección `horasDeclaradas` con el formato `HH:MM-HH:MM` derivado del slider.

## v0.2.29
- Restricción del slider "Declarar horas" para permitir solo horas enteras (mínimo 1 hora, paso 1).
- Validación adicional en el envío para rechazar valores no enteros y mostrar un mensaje claro al usuario.
- Ajuste del texto descriptivo del modal para indicar explícitamente que solo se admiten horas enteras.

## v0.2.28
- Nuevo modal "Declarar horas" dentro de "Cálculo de horas" con slider moderno y dinámico (máximo 7 horas, paso de 0,5).
- Campo "Motivo" con entrada textual limitada a 200 caracteres y contador visible.
- Calendario reducido idéntico al de "Crear varios eventos", ahora para seleccionar un único día y guardar `fechaHorasDeclaradas`.
- Al guardar la declaración se crea un registro en la colección `horasDeclaradas` con `horasDeclaradas`, `motivo`, `fechaHorasDeclaradas` y el usuario.
- La vista "Cálculo de horas" ahora prioriza un gráfico de barras gruesas con dos columnas: horas obtenidas y horas declaradas.
- El rango máximo del gráfico se calcula como `horasObtenidas + 10`, manteniendo visibles los 3 KPI por encima del gráfico.

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
