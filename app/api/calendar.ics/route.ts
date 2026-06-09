import { NextRequest, NextResponse } from "next/server";

import {
  fetchAllEvents,
  fetchEventsForUser,
  type CalendarEvent
} from "../../../services/eventsService";
import { buildEventGroupKey } from "../../../utils/eventGrouping";

const ICS_PROD_ID = "-//MyApp//Calendar//EN";

type GroupedCalendarEvent = {
  key: string;
  baseEvent: CalendarEvent;
  attendees: string[];
  lastModified: Date;
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

const getIcalEventDurationHours = (eventType: CalendarEvent["eventType"]): number =>
  eventType === "Comida" ? 2 : 3;

/**
 * Crea un UID estable por evento agrupado para evitar un VEVENT por cada usuario.
 */
const toGroupedEventUid = (groupKey: string): string =>
  `${groupKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "evento"}@myapp.com`;

/**
 * Agrupa eventos duplicados por asistentes en un único evento lógico.
 */
const groupEventsForIcs = (events: CalendarEvent[]): GroupedCalendarEvent[] => {
  const grouped = new Map<string, GroupedCalendarEvent>();

  events.forEach((event) => {
    const key = buildEventGroupKey(event);
    const existing = grouped.get(key);
    const attendee = event.user?.trim();
    const updatedAt = event.$updatedAt ? new Date(event.$updatedAt) : new Date();

    if (!existing) {
      grouped.set(key, {
        key,
        baseEvent: event,
        attendees: attendee ? [attendee] : [],
        lastModified: updatedAt
      });
      return;
    }

    if (attendee && !existing.attendees.includes(attendee)) {
      existing.attendees.push(attendee);
      existing.attendees.sort((left, right) => left.localeCompare(right));
    }

    if (updatedAt.getTime() > existing.lastModified.getTime()) {
      existing.lastModified = updatedAt;
    }
  });

  return Array.from(grouped.values());
};

/**
 * Genera bloque VEVENT con los campos requeridos para Outlook/ICS.
 */
const buildEventBlock = (groupedEvent: GroupedCalendarEvent): string => {
  const now = new Date();
  const { baseEvent, attendees, key, lastModified } = groupedEvent;

  const startDate = toEventDate(baseEvent.fecha, baseEvent.horaInicio, "00:00:00");
  const endDate = new Date(
    startDate.getTime() + getIcalEventDurationHours(baseEvent.eventType) * 60 * 60 * 1000
  );

  const summary = escapeICalText(baseEvent.nombre?.trim() || "Evento");
  const descriptionParts = [
    baseEvent.notas?.trim() ? `Notas: ${baseEvent.notas.trim()}` : "",
    baseEvent.establecimiento?.trim()
      ? `Establecimiento: ${baseEvent.establecimiento.trim()}`
      : "",
    attendees.length > 0 ? `Asistentes: ${attendees.join(", ")}` : "Asistentes: Sin asistentes"
  ].filter(Boolean);

  const description = escapeICalText(descriptionParts.join("\n") || "Sin descripción");

  return [
    "BEGIN:VEVENT",
    `UID:${toGroupedEventUid(key)}`,
    `DTSTAMP:${toICalUtcDateTime(now)}`,
    `LAST-MODIFIED:${toICalUtcDateTime(lastModified)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `DTSTART:${toICalUtcDateTime(startDate)}`,
    `DTEND:${toICalUtcDateTime(endDate)}`,
    "END:VEVENT"
  ].join("\r\n");
};

/**
 * Construye la respuesta iCalendar compartida por las exportaciones globales,
 * por usuario y por selección de eventos.
 */
const createICalendarResponse = (events: CalendarEvent[]) => {
  const groupedEvents = groupEventsForIcs(events);
  const icsBody = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${ICS_PROD_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...groupedEvents.map((event) => buildEventBlock(event)),
    "END:VCALENDAR"
  ].join("\r\n");

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
};

const createErrorResponse = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Error interno";

  return new NextResponse(message, {
    status: 500,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
};

/**
 * Endpoint público: /api/calendar.ics
 * Devuelve el feed global o, con `?user=...`, el calendario individual solicitado.
 */
export async function GET(request: NextRequest) {
  try {
    const requestedUser = request.nextUrl.searchParams.get("user")?.trim() ?? "";
    const events = requestedUser
      ? await fetchEventsForUser(requestedUser)
      : await fetchAllEvents();

    return createICalendarResponse(events);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * Genera un archivo iCalendar con una selección concreta de eventos de un usuario.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      user?: unknown;
      eventKeys?: unknown;
    };
    const requestedUser = typeof body.user === "string" ? body.user.trim() : "";
    const requestedEventKeys = Array.isArray(body.eventKeys)
      ? body.eventKeys.filter((key): key is string => typeof key === "string")
      : [];

    if (!requestedUser) {
      return new NextResponse("El usuario es obligatorio.", { status: 400 });
    }

    if (requestedEventKeys.length === 0) {
      return new NextResponse("Selecciona al menos un evento.", { status: 400 });
    }

    const selectedKeys = new Set(requestedEventKeys);
    const userEvents = await fetchEventsForUser(requestedUser);
    const selectedEvents = userEvents.filter((event) =>
      selectedKeys.has(buildEventGroupKey(event))
    );

    if (selectedEvents.length === 0) {
      return new NextResponse("No se encontraron eventos para la selección indicada.", {
        status: 404
      });
    }

    return createICalendarResponse(selectedEvents);
  } catch (error) {
    return createErrorResponse(error);
  }
}
