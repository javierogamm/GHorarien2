import { ID, Models, Query } from "appwrite";
import { appwriteConfig, databases, ensureAppwriteConfig } from "./appwriteClient";

export type UserRole = "Admin" | "Boss" | "User" | "Eventmaster" | "Otros";

export type UserRecord = Models.Document & {
  user: string;
  pass: string;
  role: UserRole;
  horasObtenidas?: number | string;
};

export const normalizeUserRoleValue = (role?: string | null): UserRole | null => {
  const normalized = role?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "admin") return "Admin";
  if (normalized === "boss") return "Boss";
  if (normalized === "eventmaster") return "Eventmaster";
  if (normalized === "user") return "User";
  if (normalized === "otros") return "Otros";
  return null;
};

export const parseHorasObtenidas = (value: number | string | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const validateUserCredentials = async (
  username: string,
  password: string
): Promise<UserRecord | null> => {
  ensureAppwriteConfig();
  const response = await databases.listDocuments<UserRecord>(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("user", username), Query.equal("pass", password)]
  );

  return response.documents[0] ?? null;
};

export const fetchUsers = async (): Promise<UserRecord[]> => {
  ensureAppwriteConfig();
  const limit = 100;
  let offset = 0;
  let allDocuments: UserRecord[] = [];
  let fetched = 0;

  do {
    const response = await databases.listDocuments<UserRecord>(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.limit(limit), Query.offset(offset)]
    );
    fetched = response.documents.length;
    allDocuments = allDocuments.concat(response.documents);
    offset += fetched;
  } while (fetched === limit);

  return allDocuments;
};

export const updateUserHorasObtenidas = async (
  documentId: string,
  horasObtenidas: number
): Promise<UserRecord> => {
  ensureAppwriteConfig();
  return databases.updateDocument<UserRecord>(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    documentId,
    { horasObtenidas: String(horasObtenidas) }
  );
};

export const updateUserPassword = async (
  documentId: string,
  password: string
): Promise<UserRecord> => {
  ensureAppwriteConfig();
  return databases.updateDocument<UserRecord>(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    documentId,
    { pass: password }
  );
};

export const createOtherUser = async (name: string): Promise<UserRecord> => {
  ensureAppwriteConfig();
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("El nombre es obligatorio.");
  }

  return databases.createDocument<UserRecord>(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    ID.unique(),
    {
      user: normalizedName,
      pass: "",
      role: "Otros",
      horasObtenidas: "0"
    }
  );
};
