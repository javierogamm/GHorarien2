import { ID, Models, Query } from "appwrite";
import type { EventCategory } from "../constants/eventCategories";
import { appwriteConfig, databases, ensureAppwriteConfig } from "./appwriteClient";

export type HorasObtenidasRecord = Models.Document & {
  user: string;
  numeroHoras: number;
  causa: string;
  fechaObtencion: string;
};

const HOURS_PER_EVENT = 3;
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

const ensureHorasObtenidasConfig = () => {
  ensureAppwriteConfig();
  if (!appwriteConfig.horasObtenidasCollectionId) {
    throw new Error("Falta NEXT_PUBLIC_APPWRITE_HORASOBTENIDAS_COLLECTION_ID");
  }
};

export const createHorasObtenidasForAttendees = async ({
  attendees,
  eventType,
  causa,
  fechaObtencion
}: CreateHorasObtenidasInput): Promise<HorasObtenidasRecord[]> => {
  if (!isHoursGeneratingEvent(eventType)) {
    return [];
  }
  ensureHorasObtenidasConfig();
  const payloads = attendees.map((attendee) =>
    databases.createDocument<HorasObtenidasRecord>(
      appwriteConfig.databaseId,
      appwriteConfig.horasObtenidasCollectionId,
      ID.unique(),
      {
        user: attendee,
        numeroHoras: HOURS_PER_EVENT,
        causa,
        fechaObtencion
      }
    )
  );

  return Promise.all(payloads);
};

export const deleteHorasObtenidasForAttendees = async ({
  attendees,
  eventType,
  causa,
  fechaObtencion
}: DeleteHorasObtenidasInput): Promise<void> => {
  if (!isHoursGeneratingEvent(eventType)) {
    return;
  }
  ensureHorasObtenidasConfig();
  const limit = 100;

  await Promise.all(
    attendees.map(async (attendee) => {
      let offset = 0;
      let fetched = 0;
      do {
        const response = await databases.listDocuments<HorasObtenidasRecord>(
          appwriteConfig.databaseId,
          appwriteConfig.horasObtenidasCollectionId,
          [
            Query.equal("user", attendee),
            Query.equal("causa", causa),
            Query.equal("fechaObtencion", fechaObtencion),
            Query.limit(limit),
            Query.offset(offset)
          ]
        );
        fetched = response.documents.length;
        offset += fetched;
        await Promise.all(
          response.documents.map((doc) =>
            databases.deleteDocument(
              appwriteConfig.databaseId,
              appwriteConfig.horasObtenidasCollectionId,
              doc.$id
            )
          )
        );
      } while (fetched === limit);
    })
  );
};
