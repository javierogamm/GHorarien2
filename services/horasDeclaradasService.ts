import { ID, Models, Query } from "appwrite";
import { appwriteConfig, databases, ensureAppwriteConfig } from "./appwriteClient";

export type HorasDeclaradasRecord = Models.Document & {
  horasDeclaradas?: number | string | null;
  horasDeclaradasRango?: string;
  user: string;
  motivo?: string;
  fechaHorasDeclaradas?: string;
};

type CreateHorasDeclaradasInput = {
  user: string;
  horasDeclaradas: number;
  horasDeclaradasRango: string;
  motivo: string;
  fechaHorasDeclaradas: string;
};

const ensureHorasDeclaradasConfig = () => {
  ensureAppwriteConfig();
  if (!appwriteConfig.horasDeclaradasCollectionId) {
    throw new Error("Falta NEXT_PUBLIC_APPWRITE_HORASDECLARADAS_COLLECTION_ID");
  }
};

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const fetchHorasDeclaradasForUser = async (
  username: string
): Promise<HorasDeclaradasRecord[]> => {
  ensureHorasDeclaradasConfig();
  const limit = 100;
  let offset = 0;
  let allDocuments: HorasDeclaradasRecord[] = [];
  let fetched = 0;

  do {
    const response = await databases.listDocuments<HorasDeclaradasRecord>(
      appwriteConfig.databaseId,
      appwriteConfig.horasDeclaradasCollectionId,
      [
        Query.equal("user", username),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );
    fetched = response.documents.length;
    allDocuments = allDocuments.concat(response.documents);
    offset += fetched;
  } while (fetched === limit);

  return allDocuments;
};

export const sumHorasDeclaradasForUser = async (username: string): Promise<number> => {
  const documents = await fetchHorasDeclaradasForUser(username);
  return documents.reduce(
    (total, document) => total + toNumber(document.horasDeclaradas),
    0
  );
};

export const createHorasDeclaradas = async ({
  user,
  horasDeclaradas,
  horasDeclaradasRango,
  motivo,
  fechaHorasDeclaradas
}: CreateHorasDeclaradasInput): Promise<HorasDeclaradasRecord> => {
  ensureHorasDeclaradasConfig();
  return databases.createDocument<HorasDeclaradasRecord>(
    appwriteConfig.databaseId,
    appwriteConfig.horasDeclaradasCollectionId,
    ID.unique(),
    {
      user,
      horasDeclaradas,
      horasDeclaradasRango,
      motivo,
      fechaHorasDeclaradas
    }
  );
};
