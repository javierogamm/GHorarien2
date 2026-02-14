import type { EventCategory } from "../constants/eventCategories";
import {
  deleteRows,
  filters,
  insertRows,
  mapSupabaseDocument,
  selectRows,
  supabaseConfig,
  type SupabaseDocument,
  updateRows
} from "./supabaseClient";
import { createHorasObtenidasForAttendees } from "./horasObtenidasService";
import { fetchUsers, normalizeUserRoleValue } from "./usersService";

export type CalendarEvent = SupabaseDocument & {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  eventType: EventCategory;
  user: string;
  nombre?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duration: number;
  notas?: string;
  establecimiento?: string;
  certificacion?: string;
  promocion?: string;
  menu?: string;
  importe?: number;
  import?: number;
};

const asText = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

const normalizeEvent = (event: CalendarEvent): CalendarEvent => {
  const backendImporte =
    typeof event.importe === "number"
      ? event.importe
      : typeof event.import === "number"
        ? event.import
        : 0;

  return {
    ...event,
    eventType: asText(event.eventType) as EventCategory,
    user: asText(event.user),
    nombre: asText(event.nombre),
    fecha: asText(event.fecha),
    horaInicio: asText(event.horaInicio),
    horaFin: asText(event.horaFin),
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
  const data = await selectRows<CalendarEvent>(supabaseConfig.eventsTable, [
    filters.eq("user", username)
  ]);

  return data.map((row) => normalizeEvent(mapSupabaseDocument(row) as CalendarEvent));
};

export const fetchAllEvents = async (): Promise<CalendarEvent[]> => {
  const data = await selectRows<CalendarEvent>(supabaseConfig.eventsTable);
  return data.map((row) => normalizeEvent(mapSupabaseDocument(row) as CalendarEvent));
};

type CreateEventsInput = {
  nombre: string;
  eventType: EventCategory;
  attendees: string[];
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duration: number;
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
    duration,
    notas: notas ?? "",
    establecimiento: establecimiento ?? "",
    certificacion: certificacion ?? "",
    promocion: promocion ?? "",
    menu: menu ?? "",
    import: typeof importe === "number" ? importe : 0
  }));

  const data = await insertRows<CalendarEvent>(supabaseConfig.eventsTable, rows);
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
  const payload: Partial<CalendarEvent> = {
    ...data
  };

  if (typeof data.importe === "number") {
    payload.import = data.importe;
    delete payload.importe;
  }

  const updated = await updateRows<CalendarEvent>(
    supabaseConfig.eventsTable,
    payload,
    [filters.eq("$id", documentId)]
  );

  if (!updated[0]) throw new Error("No se pudo actualizar el evento.");
  return normalizeEvent(mapSupabaseDocument(updated[0]) as CalendarEvent);
};

export const deleteEvent = async (documentId: string): Promise<void> => {
  await deleteRows(supabaseConfig.eventsTable, [filters.eq("$id", documentId)]);
};

export type EstablishmentStatus = "sugerido" | "aceptado";

export type EstablishmentRecord = SupabaseDocument & {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  establecimientoId?: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  ubicacion?: string;
  estado?: EstablishmentStatus;
};

export const fetchEstablishments = async (): Promise<EstablishmentRecord[]> => {
  const data = await selectRows<EstablishmentRecord>(supabaseConfig.establishmentTable);
  return data.map((row) => {
    const record = mapSupabaseDocument(row) as EstablishmentRecord;
    return {
      ...record,
      establecimientoId:
        typeof record.establecimientoId === "number"
          ? record.establecimientoId
          : Number.parseInt(asText(record.establecimientoId, ""), 10) || undefined,
      nombre: asText(record.nombre),
      direccion: asText(record.direccion),
      telefono: asText(record.telefono),
      ubicacion: asText(record.ubicacion),
      estado: record.estado === "sugerido" ? "sugerido" : "aceptado"
    };
  });
};

type CreateEstablishmentInput = {
  establecimientoId: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  ubicacion?: string;
  estado?: EstablishmentStatus;
};

export const createEstablishment = async (
  payload: CreateEstablishmentInput
): Promise<EstablishmentRecord> => {
  const data = await insertRows<EstablishmentRecord>(supabaseConfig.establishmentTable, payload);
  if (!data[0]) throw new Error("No se pudo crear el establecimiento.");
  return mapSupabaseDocument(data[0]) as EstablishmentRecord;
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
  return mapSupabaseDocument(updated[0]) as EstablishmentRecord;
};

export const deleteEstablishment = async (documentId: string): Promise<void> => {
  await deleteRows(supabaseConfig.establishmentTable, [filters.eq("$id", documentId)]);
};
