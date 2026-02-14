import type { EventCategory } from "../constants/eventCategories";
import {
  deleteRows,
  filters,
  insertRows,
  mapSupabaseDocument,
  selectRows,
  supabaseConfig,
  type SupabaseDocument,
  updateRows,
  isMissingRelationError
} from "./supabaseClient";
import { createHorasObtenidasForAttendees } from "./horasObtenidasService";
import { fetchUsers, normalizeUserRoleValue } from "./usersService";

export type CalendarEvent = SupabaseDocument & {
  $id: string;
  $permissions?: string;
  $createdAt?: string;
  $updatedAt?: string;
  eventType: EventCategory;
  user: string;
  nombre?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duration: number | string;
  status?: string;
  notas?: string;
  establecimiento?: string;
  certificacion?: string;
  promocion?: string;
  menu?: string;
  importe?: number;
  import?: number | string;
};

const asText = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

const parsePromotion = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const trimmed = asText(value).trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};


const eventTableCandidates = [
  "tabla",
  supabaseConfig.eventsTable,
  supabaseConfig.fallbackEventsTable
].filter(
  (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index
);

let resolvedEventsTable: string | null = null;

const resolveEventsTable = async (): Promise<string> => {
  if (resolvedEventsTable) return resolvedEventsTable;

  let lastError: unknown;

  for (const candidate of eventTableCandidates) {
    try {
      await selectRows<CalendarEvent>(candidate, [], 1);
      resolvedEventsTable = candidate;
      return candidate;
    } catch (error) {
      if (isMissingRelationError(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastError instanceof Error) {
    throw new Error(
      `No se encontró ninguna tabla de eventos disponible (${eventTableCandidates.join(", ")}). ${lastError.message}`
    );
  }

  throw new Error(
    `No se encontró ninguna tabla de eventos disponible (${eventTableCandidates.join(", ")}).`
  );
};

const normalizeEvent = (event: CalendarEvent): CalendarEvent => {
  const backendImporteRaw = event.importe ?? event.import;
  const backendImporte =
    typeof backendImporteRaw === "number"
      ? backendImporteRaw
      : Number.parseFloat(asText(backendImporteRaw, "0")) || 0;

  const durationValue =
    typeof event.duration === "number"
      ? event.duration
      : Number.parseFloat(asText(event.duration, "0")) || 0;

  return {
    ...event,
    eventType: asText(event.eventType) as EventCategory,
    user: asText(event.user),
    nombre: asText(event.nombre),
    fecha: asText(event.fecha),
    horaInicio: asText(event.horaInicio),
    horaFin: asText(event.horaFin),
    duration: durationValue,
    status: asText(event.status),
    notas: asText(event.notas),
    establecimiento: asText(event.establecimiento),
    certificacion: asText(event.certificacion),
    promocion: asText(event.promocion),
    menu: asText(event.menu),
    importe: backendImporte
  };
};

export const fetchEventsForUser = async (
  username: string
): Promise<CalendarEvent[]> => {
  const eventsTable = await resolveEventsTable();
  const data = await selectRows<CalendarEvent>(eventsTable, [
    filters.eq("user", username)
  ]);

  return data.map((row) => normalizeEvent(mapSupabaseDocument(row) as CalendarEvent));
};

export const fetchAllEvents = async (): Promise<CalendarEvent[]> => {
  const eventsTable = await resolveEventsTable();
  const data = await selectRows<CalendarEvent>(eventsTable);
  return data.map((row) => normalizeEvent(mapSupabaseDocument(row) as CalendarEvent));
};

type CreateEventsInput = {
  nombre: string;
  eventType: EventCategory;
  attendees: string[];
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duration: number | string;
  notas?: string;
  establecimiento?: string;
  certificacion?: string;
  promocion?: string;
  menu?: string;
  importe?: number;
};

export const createEventsForAttendees = async ({
  nombre,
  eventType,
  attendees,
  fecha,
  horaInicio,
  horaFin,
  duration,
  notas,
  establecimiento,
  certificacion,
  promocion,
  menu,
  importe
}: CreateEventsInput): Promise<CalendarEvent[]> => {
  if (attendees.length === 0) return [];

  const rows = attendees.map((attendee) => ({
    nombre,
    eventType,
    user: attendee,
    fecha,
    horaInicio,
    horaFin,
    duration: String(duration),
    notas: notas ?? "",
    establecimiento: establecimiento ?? "",
    certificacion: certificacion ?? "",
    promocion: parsePromotion(promocion),
    menu: menu ?? "",
    import: typeof importe === "number" ? String(importe) : "0"
  }));

  const eventsTable = await resolveEventsTable();
  const data = await insertRows<CalendarEvent>(eventsTable, rows);
  const createdEvents = data.map((row) => mapSupabaseDocument(row) as CalendarEvent);

  const users = await fetchUsers();
  const excludedHoursUsers = new Set(
    users
      .filter((user) => normalizeUserRoleValue(user.role) === "Otros")
      .map((user) => user.user)
  );
  const hoursEligibleAttendees = attendees.filter((attendee) => !excludedHoursUsers.has(attendee));

  await createHorasObtenidasForAttendees({
    attendees: hoursEligibleAttendees,
    eventType,
    causa: nombre,
    fechaObtencion: fecha
  });

  return createdEvents.map(normalizeEvent);
};

export const updateEvent = async (
  documentId: string,
  data: Partial<CalendarEvent>
): Promise<CalendarEvent> => {
  const payload: Record<string, unknown> = {
    ...data
  };

  if (typeof data.importe !== "undefined") {
    payload.import = String(data.importe ?? 0);
    delete payload.importe;
  }

  if (typeof data.duration !== "undefined") {
    payload.duration = String(data.duration ?? 0);
  }

  if (typeof data.promocion !== "undefined") {
    payload.promocion = parsePromotion(data.promocion);
  }

  const updated = await updateRows<CalendarEvent>(
    await resolveEventsTable(),
    payload,
    [filters.eq("$id", documentId)]
  );

  if (!updated[0]) throw new Error("No se pudo actualizar el evento.");
  return normalizeEvent(mapSupabaseDocument(updated[0]) as CalendarEvent);
};

export const deleteEvent = async (documentId: string): Promise<void> => {
  await deleteRows(await resolveEventsTable(), [filters.eq("$id", documentId)]);
};

export type EstablishmentStatus = "sugerido" | "aceptado";

export type EstablishmentRecord = SupabaseDocument & {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  establecimientoId?: number;
  nombre: string;
  direccion?: string;
  tipo?: string;
  telefono?: string;
  correoElectronico?: string;
  ubicacion?: string;
  estado?: EstablishmentStatus;
};

const normalizeEstablishment = (row: EstablishmentRecord): EstablishmentRecord => ({
  ...row,
  establecimientoId:
    typeof row.establecimientoId === "number"
      ? row.establecimientoId
      : Number.parseInt(asText(row.establecimientoId, ""), 10) || undefined,
  nombre: asText(row.nombre),
  direccion: asText(row.direccion),
  tipo: asText(row.tipo),
  telefono: asText(row.telefono),
  correoElectronico: asText(row.correoElectronico),
  ubicacion: asText(row.ubicacion),
  estado: row.estado === "sugerido" ? "sugerido" : "aceptado"
});

export const fetchEstablishments = async (): Promise<EstablishmentRecord[]> => {
  const data = await selectRows<EstablishmentRecord>(supabaseConfig.establishmentTable);
  return data.map((row) => normalizeEstablishment(mapSupabaseDocument(row) as EstablishmentRecord));
};

type CreateEstablishmentInput = {
  establecimientoId: number;
  nombre: string;
  direccion?: string;
  tipo?: string;
  telefono?: string;
  correoElectronico?: string;
  ubicacion?: string;
  estado?: EstablishmentStatus;
};

export const createEstablishment = async (
  payload: CreateEstablishmentInput
): Promise<EstablishmentRecord> => {
  const data = await insertRows<EstablishmentRecord>(supabaseConfig.establishmentTable, payload);
  if (!data[0]) throw new Error("No se pudo crear el establecimiento.");
  return normalizeEstablishment(mapSupabaseDocument(data[0]) as EstablishmentRecord);
};

export const updateEstablishment = async (
  documentId: string,
  data: Partial<EstablishmentRecord>
): Promise<EstablishmentRecord> => {
  const updated = await updateRows<EstablishmentRecord>(
    supabaseConfig.establishmentTable,
    data,
    [filters.eq("$id", documentId)]
  );

  if (!updated[0]) throw new Error("No se pudo actualizar el establecimiento.");
  return normalizeEstablishment(mapSupabaseDocument(updated[0]) as EstablishmentRecord);
};

export const deleteEstablishment = async (documentId: string): Promise<void> => {
  await deleteRows(supabaseConfig.establishmentTable, [filters.eq("$id", documentId)]);
};

export type EventReviewRecord = SupabaseDocument & {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  establecimiento?: string;
  user?: string;
  evento_nombre?: string;
  fechaevento?: string;
  notas?: string;
  stars?: number;
};

const normalizeReview = (row: EventReviewRecord): EventReviewRecord => ({
  ...row,
  establecimiento: asText(row.establecimiento),
  user: asText(row.user),
  evento_nombre: asText(row.evento_nombre),
  fechaevento: asText(row.fechaevento),
  notas: asText(row.notas),
  stars:
    typeof row.stars === "number"
      ? row.stars
      : Number.parseFloat(asText(row.stars, "0")) || 0
});

export const fetchReviews = async (): Promise<EventReviewRecord[]> => {
  const data = await selectRows<EventReviewRecord>("reviews");
  return data.map((row) => normalizeReview(mapSupabaseDocument(row) as EventReviewRecord));
};

type CreateReviewInput = {
  establecimiento: string;
  user: string;
  evento_nombre: string;
  fechaevento: string;
  notas?: string;
  stars: number;
};

export const createReview = async (
  payload: CreateReviewInput
): Promise<EventReviewRecord> => {
  const data = await insertRows<EventReviewRecord>("reviews", payload);
  if (!data[0]) throw new Error("No se pudo crear la review.");
  return normalizeReview(mapSupabaseDocument(data[0]) as EventReviewRecord);
};

export const updateReview = async (
  documentId: string,
  data: Partial<EventReviewRecord>
): Promise<EventReviewRecord> => {
  const updated = await updateRows<EventReviewRecord>("reviews", data, [
    filters.eq("$id", documentId)
  ]);

  if (!updated[0]) throw new Error("No se pudo actualizar la review.");
  return normalizeReview(mapSupabaseDocument(updated[0]) as EventReviewRecord);
};
