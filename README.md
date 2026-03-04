# Calendario GHorarien

Aplicación web con Next.js + Supabase para gestionar eventos por usuario.

## Variables de entorno

Crea un archivo `.env.local` con:

```bash
# Frontend (solo públicas)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Backend seguro (nunca exponer al cliente)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
API_SESSION_TOKEN=
```

> `SUPABASE_SERVICE_ROLE_KEY` debe existir **solo** en entorno de servidor (`.env.local`, Vercel env vars, etc.).

## Patrón de seguridad recomendado (sin RLS)

- El frontend **no** consulta Supabase directamente para datos sensibles.
- El frontend llama a API Routes (`/api/...`).
- Las API Routes validan sesión básica por cookie/token.
- La API Route consulta Supabase con `SUPABASE_SERVICE_ROLE_KEY` desde backend.
- La `service_role` nunca se exporta al navegador.

## Ejemplo de refactor frontend

### Antes (acceso directo desde frontend)

```ts
// ❌ Antes: directo a Supabase desde cliente
const { data, error } = await supabase.from("documentos").select("*");
```

### Después (acceso vía API Route)

```ts
// ✅ Después: frontend consume backend seguro
const response = await fetch("/api/documentos", {
  method: "GET",
  credentials: "include"
});
const payload = await response.json();
```

## Desarrollo local

```bash
npm install
npm run dev
```
