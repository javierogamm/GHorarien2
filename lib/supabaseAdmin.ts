import "server-only";

type QueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

const getSupabaseServerConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Falta SUPABASE_URL en variables de entorno del servidor.");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en variables de entorno del servidor.");
  }

  return { supabaseUrl, supabaseServiceRoleKey };
};

const buildHeaders = () => {
  const { supabaseServiceRoleKey } = getSupabaseServerConfig();

  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json"
  };
};

const buildBaseUrl = (table: string) => {
  const { supabaseUrl } = getSupabaseServerConfig();
  return new URL(`/rest/v1/${table}`, supabaseUrl);
};

const mapError = async (response: Response) => {
  const message = await response.text();
  return { message: `Supabase error (${response.status}): ${message}` };
};

const executeSelect = async <T>(table: string, selectColumns = "*", orderBy?: string) => {
  const url = buildBaseUrl(table);
  url.searchParams.set("select", selectColumns);

  if (orderBy) {
    url.searchParams.set("order", orderBy);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildHeaders(),
    cache: "no-store"
  });

  if (!response.ok) {
    return { data: null, error: await mapError(response) } satisfies QueryResult<T>;
  }

  const data = (await response.json()) as T[];
  return { data, error: null } satisfies QueryResult<T>;
};

export const supabaseAdmin = {
  from: <T = Record<string, unknown>>(table: string) => ({
    select: (selectColumns = "*") => ({
      order: async (column: string, options?: { ascending?: boolean }) => {
        const direction = options?.ascending === false ? "desc" : "asc";
        return executeSelect<T>(table, selectColumns, `${column}.${direction}`);
      }
    })
  })
};
