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

const HOURS_PER_EVENT = 3;
const HOURS_PER_SOLO_COMIDA = 2;
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
    numeroHoras: HOURS_PER_EVENT,
    causa,
    fechaObtencion
  }));

  const data = await insertRows<HorasObtenidasRecord>(supabaseConfig.horasObtenidasTable, rows);
  return data.map((row) => mapSupabaseDocument(row) as HorasObtenidasRecord);
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
    filters.eq("numeroHoras", HOURS_PER_EVENT)
  ]);
};

export const createHorasObtenidasForSoloComida = async ({
  user,
  causa,
  fechaObtencion
}: CreateHorasObtenidasSoloComidaInput): Promise<HorasObtenidasRecord> => {
  const data = await insertRows<HorasObtenidasRecord>(supabaseConfig.horasObtenidasTable, {
    user,
    numeroHoras: HOURS_PER_SOLO_COMIDA,
    causa,
    fechaObtencion
  });

  if (!data[0]) throw new Error("No se pudo crear horas obtenidas para solo comida.");
  return mapSupabaseDocument(data[0]) as HorasObtenidasRecord;
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
    filters.eq("numeroHoras", HOURS_PER_SOLO_COMIDA)
  ]);
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
  return data.map((row) => mapSupabaseDocument(row) as HorasObtenidasRecord);
};
