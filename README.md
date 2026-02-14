# Calendario GHorarien

Aplicación web con Next.js + Supabase para gestionar eventos por usuario.

## Variables de entorno

Crea un archivo `.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Base de datos en Supabase

La app usa estas tablas (nombres exactos):

- `users`
- `tabla`
- `horasobtenidas`
- `horasdeclaradas`
- `establecimiento`

> Importante: Mantén la **misma estructura de columnas** que ya usabas en Appwrite para conservar funcionalidad.

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en todos los entornos.
3. Despliega normalmente.

## Desarrollo local

```bash
npm install
npm run dev
```
