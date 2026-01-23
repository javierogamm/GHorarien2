import { Models, Query } from "appwrite";
import { appwriteConfig, databases, ensureAppwriteConfig } from "./appwriteClient";

export type UserRole = "Admin" | "Boss" | "User" | "Eventmaster";

export type UserRecord = Models.Document & {
  user: string;
  pass: string;
  role: UserRole;
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
