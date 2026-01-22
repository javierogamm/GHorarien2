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

type CreateEventsInput = {
  nombre: string;
  eventType: EventCategory;
  attendees: string[];
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duration: number;
  notas?: string;
};

export const createEventsForAttendees = async ({
  nombre,
  eventType,
  attendees,
  fecha,
  horaInicio,
  horaFin,
  duration,
  notas
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
        notas: notas ?? ""
      }
    )
  );

  return Promise.all(payloads);
};
