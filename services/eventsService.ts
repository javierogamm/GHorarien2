import { Models, Query } from "appwrite";
import type { EventCategory } from "../constants/eventCategories";
import { appwriteConfig, databases, ensureAppwriteConfig } from "./appwriteClient";

export type CalendarEvent = Models.Document & {
  eventType: EventCategory;
  user: string;
  horaInicio: string;
  horaFin: string;
  duration: number;
  notas: string;
};

export const fetchEventsForUserAndRange = async (
  username: string,
  startISO: string,
  endISO: string
): Promise<CalendarEvent[]> => {
  ensureAppwriteConfig();
  const response = await databases.listDocuments<CalendarEvent>(
    appwriteConfig.databaseId,
    appwriteConfig.eventsCollectionId,
    [
      Query.equal("user", username),
      Query.greaterThanEqual("horaInicio", startISO),
      Query.lessThanEqual("horaInicio", endISO)
    ]
  );

  return response.documents;
};
