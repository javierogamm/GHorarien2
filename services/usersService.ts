import {
  filters,
  insertRows,
  mapSupabaseDocument,
  selectRows,
  supabaseConfig,
  type SupabaseDocument,
  updateRows
} from "./supabaseClient";

export type UserRole = "Admin" | "Boss" | "User" | "Eventmaster" | "Otros";

export type UserRecord = SupabaseDocument & {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
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
  const data = await selectRows<UserRecord>(
    supabaseConfig.usersTable,
    [filters.eq("user", username), filters.eq("pass", password)],
    1
  );

  const row = data[0];
  return row ? (mapSupabaseDocument(row) as UserRecord) : null;
};

export const fetchUsers = async (): Promise<UserRecord[]> => {
  const data = await selectRows<UserRecord>(supabaseConfig.usersTable);
  return data.map((row) => mapSupabaseDocument(row) as UserRecord);
};

export const updateUserHorasObtenidas = async (
  documentId: string,
  horasObtenidas: number
): Promise<UserRecord> => {
  const data = await updateRows<UserRecord>(
    supabaseConfig.usersTable,
    { horasObtenidas: String(horasObtenidas) },
    [filters.eq("id", documentId)]
  );

  if (!data[0]) throw new Error("No se pudo actualizar horasObtenidas.");
  return mapSupabaseDocument(data[0]) as UserRecord;
};

export const updateUserPassword = async (
  documentId: string,
  password: string
): Promise<UserRecord> => {
  const data = await updateRows<UserRecord>(
    supabaseConfig.usersTable,
    { pass: password },
    [filters.eq("id", documentId)]
  );

  if (!data[0]) throw new Error("No se pudo actualizar la contraseña.");
  return mapSupabaseDocument(data[0]) as UserRecord;
};

export const createOtherUser = async (name: string): Promise<UserRecord> => {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("El nombre es obligatorio.");
  }

  const data = await insertRows<UserRecord>(supabaseConfig.usersTable, {
    user: normalizedName,
    pass: "",
    role: "Otros",
    horasObtenidas: "0"
  });

  if (!data[0]) throw new Error("No se pudo crear el usuario.");
  return mapSupabaseDocument(data[0]) as UserRecord;
};
