import { Account, Client, Functions, Storage, TablesDB, Teams } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT?.trim() ?? "";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID?.trim() ?? "";

export const isAppwriteConfigured = Boolean(endpoint && projectId);

export const appwriteClient = new Client();

if (endpoint) {
  appwriteClient.setEndpoint(endpoint);
}

if (projectId) {
  appwriteClient.setProject(projectId);
}

export const account = new Account(appwriteClient);

// appwrite@24 exposes TablesDB/listRows. Databases/listDocuments is deprecated,
// so repositories use Tables/Rows while keeping the conventional `databases` export name.
export const databases = new TablesDB(appwriteClient);
export const tablesDB = databases;
export const storage = new Storage(appwriteClient);
export const functions = new Functions(appwriteClient);
export const teams = new Teams(appwriteClient);

export const appwriteRuntimeConfig = {
  endpoint,
  projectId,
};
