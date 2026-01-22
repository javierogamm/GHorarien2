import { Query } from "appwrite";
import { appwriteConfig, databases, ensureAppwriteConfig } from "./appwriteClient";

export type UserRecord = {
  $id: string;
  user: string;
  pass: string;
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
