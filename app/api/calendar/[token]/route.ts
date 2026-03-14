import { NextResponse } from "next/server";

import { fetchAllEvents, type CalendarEvent } from "../../../../services/eventsService";

const ICS_PROD_ID = "-//MyApp//Calendar//EN";
const CALENDAR_TOKEN_ENV_NAME = "CALENDAR_FEED_TOKEN";
const FALLBACK_TOKEN_ENV_NAME = "API_SESSION_TOKEN";

/**
 * Resuelve los tokens válidos para el feed ICS.
 * Mantiene compatibilidad con despliegues que todavía usan API_SESSION_TOKEN.
 */
const resolveValidCalendarTokens = (): string[] => {
  const primaryToken = process.env[CALENDAR_TOKEN_ENV_NAME]?.trim();
  const fallbackToken = process.env[FALLBACK_TOKEN_ENV_NAME]?.trim();

  return [primaryToken, fallbackToken].filter(
    (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index
  );
};

/**
 * Escapa caracteres reservados de iCalendar para que SUMMARY y DESCRIPTION sean válidos.
 */
const escapeICalText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

/**
 * Convierte una fecha JavaScript al formato UTC de iCalendar: YYYYMMDDTHHmmssZ
 */
const toICalUtcDateTime = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

/**
 * Normaliza distintos formatos de fecha/hora del evento y devuelve una instancia Date válida.
 */
const toEventDate = (fecha: string, hora: string, fallbackHour = "00:00:00"): Date => {
  const datePart = fecha.includes("T") ? fecha.split("T")[0] : fecha;
  const timePart = hora.includes("T")
    ? (hora.split("T")[1] ?? fallbackHour)
    : hora || fallbackHour;

  const normalizedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
  const parsed = new Date(`${datePart}T${normalizedTime}`);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(`${datePart}T${fallbackHour}`);
};

/**
 * Genera bloque VEVENT con los campos requeridos para Outlook/ICS.
 */
const buildEventBlock = (event: CalendarEvent): string => {
  const now = new Date();
  const updatedAt = event.$updatedAt ? new Date(event.$updatedAt) : now;

  const startDate = toEventDate(event.fecha, event.horaInicio, "00:00:00");
  const endDate = toEventDate(event.fecha, event.horaFin, "23:59:59");

  const summary = escapeICalText(event.nombre?.trim() || "Evento");
  const descriptionParts = [
    event.notas?.trim() ? `Notas: ${event.notas.trim()}` : "",
    event.establecimiento?.trim() ? `Establecimiento: ${event.establecimiento.trim()}` : "",
    event.user?.trim() ? `Usuario: ${event.user.trim()}` : ""
  ].filter(Boolean);

  const description = escapeICalText(descriptionParts.join("\n") || "Sin descripción");

  return [
    "BEGIN:VEVENT",
    `UID:${event.$id}@myapp.com`,
    `DTSTAMP:${toICalUtcDateTime(now)}`,
    `LAST-MODIFIED:${toICalUtcDateTime(updatedAt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `DTSTART:${toICalUtcDateTime(startDate)}`,
    `DTEND:${toICalUtcDateTime(endDate)}`,
    "END:VEVENT"
  ].join("\r\n");
};

/**
 * Endpoint público: /api/calendar/[token] o /api/calendar/[token].ics
 * Devuelve un feed completo iCalendar para suscripción en Outlook 365.
 */
export async function GET(
  _request: Request,
  context: { params: { token: string } }
) {
  try {
    const routeToken = context.params.token.replace(/\.ics$/i, "");
    const validTokens = resolveValidCalendarTokens();

    // Validación del token público para evitar exponer eventos sin control.
    if (!routeToken || validTokens.length === 0 || !validTokens.includes(routeToken)) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    // Se obtienen los eventos existentes desde el servicio actual de datos.
    const events = await fetchAllEvents();

    // Se arma el archivo ICS completo con cabecera VCALENDAR + todos los VEVENT.
    const icsBody = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:${ICS_PROD_ID}`,
      "CALSCALE:GREGORIAN",
      ...events.map((event) => buildEventBlock(event)),
      "END:VCALENDAR"
    ].join("\r\n");

    // Se responde como texto ICS para que Outlook pueda suscribirse al feed.
    return new NextResponse(icsBody, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";

    return new NextResponse(message, {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });
  }
}
