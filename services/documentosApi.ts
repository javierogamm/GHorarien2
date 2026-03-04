export type Documento = {
  id: string | number;
  titulo?: string;
  created_at?: string;
  [key: string]: unknown;
};

type DocumentosApiResponse = {
  ok: boolean;
  data?: Documento[];
  error?: string;
};

export const getDocumentos = async (): Promise<Documento[]> => {
  const response = await fetch("/api/documentos", {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });

  const body = (await response.json()) as DocumentosApiResponse;

  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "No se pudieron obtener documentos.");
  }

  return body.data ?? [];
};
