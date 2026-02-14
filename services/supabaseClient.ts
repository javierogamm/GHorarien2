export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  anonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  usersTable: "users",
  eventsTable: "tabla",
  horasDeclaradasTable: "horasdeclaradas",
  horasObtenidasTable: "horasobtenidas",
  establishmentTable: "establecimiento"
};

export type SupabaseDocument = {
  id?: string | number | null;
  "$id"?: string | number | null;
  created_at?: string | null;
  "$createdAt"?: string | null;
  updated_at?: string | null;
  "$updatedAt"?: string | null;
};

type SupabaseInsertPayload = Record<string, unknown>;

type FilterValue = string | number | boolean;
type Filter = {
  column: string;
  op: "eq" | "in";
  value: FilterValue | FilterValue[];
};

const buildUrl = (table: string, filters: Filter[], limit?: number) => {
  const url = new URL(`/rest/v1/${table}`, supabaseConfig.url);
  url.searchParams.set("select", "*");

  filters.forEach((filter) => {
    if (filter.op === "eq") {
      url.searchParams.append(filter.column, `eq.${filter.value}`);
      return;
    }

    const values = (filter.value as FilterValue[])
      .map((value) => `${value}`.replace(/,/g, "\\,"))
      .join(",");
    url.searchParams.append(filter.column, `in.(${values})`);
  });

  if (typeof limit === "number") {
    url.searchParams.set("limit", String(limit));
  }

  return url.toString();
};

const requestJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${details}`);
  }
  if (response.status === 204) {
    return [] as T;
  }
  return (await response.json()) as T;
};

const getHeaders = () => ({
  apikey: supabaseConfig.anonKey,
  Authorization: `Bearer ${supabaseConfig.anonKey}`,
  "Content-Type": "application/json"
});

const createDocumentId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const withSupabaseDocumentId = (payload: SupabaseInsertPayload): SupabaseInsertPayload => {
  const hasValidId =
    typeof payload["$id"] === "string" && payload["$id"].trim().length > 0;

  if (hasValidId) {
    return payload;
  }

  return {
    ...payload,
    "$id": createDocumentId()
  };
};

export const ensureSupabaseConfig = () => {
  if (!supabaseConfig.url)
    throw new Error("Falta SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL)");
  if (!supabaseConfig.anonKey)
    throw new Error("Falta SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)");
};

export const mapSupabaseDocument = <T extends SupabaseDocument>(row: T) => {
  const rawId = row.id ?? row["$id"];
  if (typeof rawId === "undefined" || rawId === null) {
    throw new Error("La fila no contiene una columna id o $id en Supabase.");
  }

  const createdAt = row.created_at ?? row["$createdAt"];
  const updatedAt = row.updated_at ?? row["$updatedAt"];

  return {
    ...row,
    $id: String(rawId),
    $createdAt: createdAt ?? undefined,
    $updatedAt: updatedAt ?? undefined
  };
};

export const selectRows = async <T>(
  table: string,
  filters: Filter[] = [],
  limit?: number
): Promise<T[]> => {
  ensureSupabaseConfig();
  const url = buildUrl(table, filters, limit);
  return requestJson<T[]>(url, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store"
  });
};

export const insertRows = async <T>(table: string, payload: object | object[]): Promise<T[]> => {
  ensureSupabaseConfig();
  const url = buildUrl(table, []);
  const normalizedPayload = Array.isArray(payload)
    ? payload.map((row) => withSupabaseDocumentId(row as SupabaseInsertPayload))
    : withSupabaseDocumentId(payload as SupabaseInsertPayload);

  return requestJson<T[]>(url, {
    method: "POST",
    headers: {
      ...getHeaders(),
      Prefer: "return=representation"
    },
    body: JSON.stringify(normalizedPayload)
  });
};

export const updateRows = async <T>(
  table: string,
  payload: object,
  filters: Filter[]
): Promise<T[]> => {
  ensureSupabaseConfig();
  const url = buildUrl(table, filters);
  return requestJson<T[]>(url, {
    method: "PATCH",
    headers: {
      ...getHeaders(),
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });
};

export const deleteRows = async (table: string, filters: Filter[]): Promise<void> => {
  ensureSupabaseConfig();
  const url = buildUrl(table, filters);
  await requestJson<unknown[]>(url, {
    method: "DELETE",
    headers: {
      ...getHeaders(),
      Prefer: "return=minimal"
    }
  });
};

export const filters = {
  eq: (column: string, value: FilterValue): Filter => ({ column, op: "eq", value }),
  in: (column: string, value: FilterValue[]): Filter => ({ column, op: "in", value })
};
