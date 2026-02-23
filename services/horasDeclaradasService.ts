import {
  deleteRows,
  filters,
  insertRows,
  mapSupabaseDocument,
  selectRows,
  supabaseConfig,
  type SupabaseDocument,
  updateRows
} from "./supabaseClient";

export type HorasDeclaradasRecord = SupabaseDocument & {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  horasDeclaradas?: number | string | null;
  horasDeclaradasRango?: string;
  user: string;
  motivo?: string;
  fechaHorasDeclaradas?: string;
};

const asText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const normalizeHorasDeclaradasRecord = (
  row: HorasDeclaradasRecord
): HorasDeclaradasRecord => ({
  ...row,
  user: asText(row.user),
  motivo: asText(row.motivo),
  horasDeclaradasRango: asText(row.horasDeclaradasRango),
  fechaHorasDeclaradas: asText(row.fechaHorasDeclaradas)
});

type CreateHorasDeclaradasInput = {
  user: string;
  horasDeclaradas: number;
  horasDeclaradasRango: string;
  motivo: string;
  fechaHorasDeclaradas: string;
};

type UpdateHorasDeclaradasInput = {
  horasDeclaradas: number;
  horasDeclaradasRango: string;
  motivo: string;
  fechaHorasDeclaradas: string;
};

export const toHorasDeclaradasNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const toHorasDeclaradasMinutes = (value: number | string | null | undefined) => {
  const numericValue = toHorasDeclaradasNumber(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;

  if (numericValue <= 24) {
    return Math.round(numericValue * 60);
  }

  return Math.round(numericValue);
};

export const fetchHorasDeclaradasForUser = async (
  username: string
): Promise<HorasDeclaradasRecord[]> => {
  const data = await selectRows<HorasDeclaradasRecord>(supabaseConfig.horasDeclaradasTable, [
    filters.eq("user", username)
  ]);

  return data.map((row) =>
    normalizeHorasDeclaradasRecord(mapSupabaseDocument(row) as HorasDeclaradasRecord)
  );
};

export const fetchAllHorasDeclaradas = async (): Promise<HorasDeclaradasRecord[]> => {
  const data = await selectRows<HorasDeclaradasRecord>(supabaseConfig.horasDeclaradasTable);
  return data.map((row) =>
    normalizeHorasDeclaradasRecord(mapSupabaseDocument(row) as HorasDeclaradasRecord)
  );
};

export const sumHorasDeclaradasForUser = async (username: string): Promise<number> => {
  const documents = await fetchHorasDeclaradasForUser(username);
  return documents.reduce(
    (total, document) => total + toHorasDeclaradasMinutes(document.horasDeclaradas),
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
  const data = await insertRows<HorasDeclaradasRecord>(supabaseConfig.horasDeclaradasTable, {
    user,
    horasDeclaradas,
    horasDeclaradasRango,
    motivo,
    fechaHorasDeclaradas
  });

  if (!data[0]) throw new Error("No se pudo crear la declaración de horas.");
  return normalizeHorasDeclaradasRecord(mapSupabaseDocument(data[0]) as HorasDeclaradasRecord);
};

export const updateHorasDeclaradas = async (
  documentId: string,
  {
    horasDeclaradas,
    horasDeclaradasRango,
    motivo,
    fechaHorasDeclaradas
  }: UpdateHorasDeclaradasInput
): Promise<HorasDeclaradasRecord> => {
  const data = await updateRows<HorasDeclaradasRecord>(
    supabaseConfig.horasDeclaradasTable,
    {
      horasDeclaradas,
      horasDeclaradasRango,
      motivo,
      fechaHorasDeclaradas
    },
    [filters.eq("$id", documentId)]
  );

  if (!data[0]) throw new Error("No se pudo actualizar la declaración de horas.");
  return normalizeHorasDeclaradasRecord(mapSupabaseDocument(data[0]) as HorasDeclaradasRecord);
};

export const deleteHorasDeclaradas = async (documentId: string): Promise<void> => {
  await deleteRows(supabaseConfig.horasDeclaradasTable, [filters.eq("$id", documentId)]);
};
