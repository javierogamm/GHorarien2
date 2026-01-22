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
  establecimiento
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
        establecimiento: establecimiento ?? ""
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

export type EstablishmentRecord = Models.Document & {
  nombre: string;
};

export const fetchEstablishments = async (): Promise<EstablishmentRecord[]> => {
  ensureAppwriteConfig();
  const response = await databases.listDocuments<EstablishmentRecord>(
    appwriteConfig.databaseId,
    appwriteConfig.establishmentCollectionId
  );

  return response.documents;
};
