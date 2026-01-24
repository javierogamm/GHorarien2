import type { CalendarEvent } from "../services/eventsService";
import { normalizeCertification } from "../constants/certifications";
import { parseDateWithoutTime } from "./calendarDates";

const normalizeText = (value?: string | null) => value?.trim() ?? "";

export const buildEventGroupKey = (event: CalendarEvent) => {
  const eventDate = parseDateWithoutTime(event.fecha);
  const dateKey = !eventDate
    ? ""
    : `${eventDate.getFullYear()}-${eventDate.getMonth() + 1}-${eventDate.getDate()}`;

  return [
    dateKey,
    normalizeText(event.nombre),
    event.eventType ?? "",
    event.horaInicio ?? "",
    normalizeCertification(event.certificacion),
    normalizeText(event.promocion),
    normalizeText(event.menu)
  ].join("|");
};
