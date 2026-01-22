import { Client, Databases } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  throw new Error("Faltan variables de entorno de Appwrite.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const databases = new Databases(client);

export const appwriteConfig = {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "",
  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ?? "",
  eventsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID ?? "",
  establishmentCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_ESTABLISHMENT_ID ?? ""
};

export const ensureAppwriteConfig = () => {
  if (!appwriteConfig.databaseId) {
    throw new Error("Falta NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  }
  if (!appwriteConfig.usersCollectionId) {
    throw new Error("Falta NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID");
  }
  if (!appwriteConfig.eventsCollectionId) {
    throw new Error("Falta NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID");
  }
  if (!appwriteConfig.establishmentCollectionId) {
    throw new Error("Falta NEXT_PUBLIC_APPWRITE_ESTABLISHMENT_ID");
  }
};
