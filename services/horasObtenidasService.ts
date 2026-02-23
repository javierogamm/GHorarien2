import type { EventCategory } from "../constants/eventCategories";
import {
  deleteRows,
  filters,
  insertRows,
  mapSupabaseDocument,
  selectRows,
  supabaseConfig,
  type SupabaseDocument
} from "./supabaseClient";

export type HorasObtenidasRecord = SupabaseDocument & {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  user: string;
  numeroHoras: number;
  causa: string;
  fechaObtencion: string;
};

const asText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const normalizeHorasObtenidasRecord = (
  row: HorasObtenidasRecord
): HorasObtenidasRecord => ({
  ...row,
  user: asText(row.user),
  numeroHoras:
    typeof row.numeroHoras === "number"
      ? row.numeroHoras
      : Number.parseFloat(asText(row.numeroHoras)) || 0,
  causa: asText(row.causa),
  fechaObtencion: asText(row.fechaObtencion)
});

export const MINUTES_PER_EVENT = 3 * 60;
export const MINUTES_PER_SOLO_COMIDA = 2 * 60;
const isHoursGeneratingEvent = (eventType: EventCategory) => eventType !== "Comida";

type CreateHorasObtenidasInput = {
  attendees: string[];
  eventType: EventCategory;
  causa: string;
  fechaObtencion: string;
};

type DeleteHorasObtenidasInput = {
  attendees: string[];
  eventType: EventCategory;
  causa: string;
  fechaObtencion: string;
};

type CreateHorasObtenidasSoloComidaInput = {
  user: string;
  causa: string;
  fechaObtencion: string;
};

type DeleteHorasObtenidasSoloComidaInput = {
  user: string;
  causa: string;
  fechaObtencion: string;
};

type FetchHorasObtenidasForUserInput = {
  user: string;
  causa?: string;
  fechaObtencion?: string;
  numeroHoras?: number;
};

export const createHorasObtenidasForAttendees = async ({
  attendees,
  eventType,
  causa,
  fechaObtencion
}: CreateHorasObtenidasInput): Promise<HorasObtenidasRecord[]> => {
  if (!isHoursGeneratingEvent(eventType) || attendees.length === 0) {
    return [];
  }

  const rows = attendees.map((attendee) => ({
    user: attendee,
    numeroHoras: MINUTES_PER_EVENT,
    causa,
    fechaObtencion
  }));

  const data = await insertRows<HorasObtenidasRecord>(supabaseConfig.horasObtenidasTable, rows);
  return data.map((row) =>
    normalizeHorasObtenidasRecord(mapSupabaseDocument(row) as HorasObtenidasRecord)
  );
};

export const deleteHorasObtenidasForAttendees = async ({
  attendees,
  eventType,
  causa,
  fechaObtencion
}: DeleteHorasObtenidasInput): Promise<void> => {
  if (!isHoursGeneratingEvent(eventType) || attendees.length === 0) {
    return;
  }

  await deleteRows(supabaseConfig.horasObtenidasTable, [
    filters.in("user", attendees),
    filters.eq("causa", causa),
    filters.eq("fechaObtencion", fechaObtencion),
    filters.eq("numeroHoras", MINUTES_PER_EVENT)
  ]);
};

export const createHorasObtenidasForSoloComida = async ({
  user,
  causa,
  fechaObtencion
}: CreateHorasObtenidasSoloComidaInput): Promise<HorasObtenidasRecord> => {
  const data = await insertRows<HorasObtenidasRecord>(supabaseConfig.horasObtenidasTable, {
    user,
    numeroHoras: MINUTES_PER_SOLO_COMIDA,
    causa,
    fechaObtencion
  });

  if (!data[0]) throw new Error("No se pudo crear horas obtenidas para solo comida.");
  return normalizeHorasObtenidasRecord(mapSupabaseDocument(data[0]) as HorasObtenidasRecord);
};

export const deleteHorasObtenidasForSoloComida = async ({
  user,
  causa,
  fechaObtencion
}: DeleteHorasObtenidasSoloComidaInput): Promise<void> => {
  await deleteRows(supabaseConfig.horasObtenidasTable, [
    filters.eq("user", user),
    filters.eq("causa", causa),
    filters.eq("fechaObtencion", fechaObtencion),
    filters.eq("numeroHoras", MINUTES_PER_SOLO_COMIDA)
  ]);
};

export const fetchAllHorasObtenidas = async (): Promise<HorasObtenidasRecord[]> => {
  const data = await selectRows<HorasObtenidasRecord>(supabaseConfig.horasObtenidasTable);
  return data.map((row) =>
    normalizeHorasObtenidasRecord(mapSupabaseDocument(row) as HorasObtenidasRecord)
  );
};

export const fetchHorasObtenidasForUser = async ({
  user,
  causa,
  fechaObtencion,
  numeroHoras
}: FetchHorasObtenidasForUserInput): Promise<HorasObtenidasRecord[]> => {
  const queryFilters = [filters.eq("user", user)];
  if (causa) queryFilters.push(filters.eq("causa", causa));
  if (fechaObtencion) queryFilters.push(filters.eq("fechaObtencion", fechaObtencion));
  if (typeof numeroHoras === "number") {
    queryFilters.push(filters.eq("numeroHoras", numeroHoras));
  }

  const data = await selectRows<HorasObtenidasRecord>(supabaseConfig.horasObtenidasTable, queryFilters);
  return data.map((row) =>
    normalizeHorasObtenidasRecord(mapSupabaseDocument(row) as HorasObtenidasRecord)
  );
};

export const replaceAllHorasObtenidas = async (
  rows: Array<Pick<HorasObtenidasRecord, "user" | "numeroHoras" | "causa" | "fechaObtencion">>
): Promise<HorasObtenidasRecord[]> => {
  await deleteRows(supabaseConfig.horasObtenidasTable, []);
  if (rows.length === 0) return [];

  const data = await insertRows<HorasObtenidasRecord>(supabaseConfig.horasObtenidasTable, rows);
  return data.map((row) =>
    normalizeHorasObtenidasRecord(mapSupabaseDocument(row) as HorasObtenidasRecord)
  );
};
