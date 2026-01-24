import { ID, Models, Query } from "appwrite";
import type { EventCategory } from "../constants/eventCategories";
import { appwriteConfig, databases, ensureAppwriteConfig } from "./appwriteClient";

export type CalendarEvent = Models.Document & {
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
};

export const fetchEventsForUser = async (
  username: string
): Promise<CalendarEvent[]> => {
  ensureAppwriteConfig();
  const response = await databases.listDocuments<CalendarEvent>(
    appwriteConfig.databaseId,
    appwriteConfig.eventsCollectionId,
    [Query.equal("user", username)]
  );

  return response.documents;
};

export const fetchAllEvents = async (): Promise<CalendarEvent[]> => {
  ensureAppwriteConfig();
  const limit = 100;
  let offset = 0;
  let allDocuments: CalendarEvent[] = [];
  let fetched = 0;

  do {
    const response = await databases.listDocuments<CalendarEvent>(
      appwriteConfig.databaseId,
      appwriteConfig.eventsCollectionId,
      [Query.limit(limit), Query.offset(offset)]
    );
    fetched = response.documents.length;
    allDocuments = allDocuments.concat(response.documents);
    offset += fetched;
  } while (fetched === limit);

  return allDocuments;
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
  menu
}: CreateEventsInput): Promise<CalendarEvent[]> => {
  ensureAppwriteConfig();
  const payloads = attendees.map((attendee) =>
    databases.createDocument<CalendarEvent>(
      appwriteConfig.databaseId,
      appwriteConfig.eventsCollectionId,
      ID.unique(),
      {
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
        menu: menu ?? ""
      }
    )
  );

  return Promise.all(payloads);
};

export const updateEvent = async (
  documentId: string,
  data: Partial<CalendarEvent>
): Promise<CalendarEvent> => {
  ensureAppwriteConfig();
  return databases.updateDocument<CalendarEvent>(
    appwriteConfig.databaseId,
    appwriteConfig.eventsCollectionId,
    documentId,
    data
  );
};

export const deleteEvent = async (documentId: string): Promise<void> => {
  ensureAppwriteConfig();
  await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.eventsCollectionId,
    documentId
  );
};

export type EstablishmentStatus = "sugerido" | "aceptado";

export type EstablishmentRecord = Models.Document & {
  establecimientoId?: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  urlMaps?: string;
  estado?: EstablishmentStatus;
};

export const fetchEstablishments = async (): Promise<EstablishmentRecord[]> => {
  ensureAppwriteConfig();
  const response = await databases.listDocuments<EstablishmentRecord>(
    appwriteConfig.databaseId,
    appwriteConfig.establishmentCollectionId
  );

  return response.documents;
};

type CreateEstablishmentInput = {
  establecimientoId: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  urlMaps?: string;
  estado?: EstablishmentStatus;
};

export const createEstablishment = async (
  payload: CreateEstablishmentInput
): Promise<EstablishmentRecord> => {
  ensureAppwriteConfig();
  return databases.createDocument<EstablishmentRecord>(
    appwriteConfig.databaseId,
    appwriteConfig.establishmentCollectionId,
    ID.unique(),
    payload
  );
};

export const updateEstablishment = async (
  documentId: string,
  data: Partial<EstablishmentRecord>
): Promise<EstablishmentRecord> => {
  ensureAppwriteConfig();
  return databases.updateDocument<EstablishmentRecord>(
    appwriteConfig.databaseId,
    appwriteConfig.establishmentCollectionId,
    documentId,
    data
  );
};

export const deleteEstablishment = async (documentId: string): Promise<void> => {
  ensureAppwriteConfig();
  await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.establishmentCollectionId,
    documentId
  );
};
