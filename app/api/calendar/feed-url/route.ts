import { NextResponse } from "next/server";

const CALENDAR_TOKEN_ENV_NAME = "CALENDAR_FEED_TOKEN";
const FALLBACK_TOKEN_ENV_NAME = "API_SESSION_TOKEN";

/**
 * Resuelve token de calendario, con fallback para despliegues que aún usan API_SESSION_TOKEN.
 */
const resolveCalendarToken = (): string => {
  const calendarToken = process.env[CALENDAR_TOKEN_ENV_NAME]?.trim();
  if (calendarToken) return calendarToken;

  const fallbackToken = process.env[FALLBACK_TOKEN_ENV_NAME]?.trim();
  if (fallbackToken) return fallbackToken;

  return "";
};

/**
 * Devuelve la URL pública completa del feed ICS para consumo del frontend (solo construcción de URL).
 */
export async function GET(request: Request) {
  const token = resolveCalendarToken();

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Falta configurar CALENDAR_FEED_TOKEN (o API_SESSION_TOKEN como fallback) en variables de entorno del servidor."
      },
      { status: 500 }
    );
  }

  const requestUrl = new URL(request.url);
  const feedPath = `/api/calendar/${encodeURIComponent(token)}.ics`;
  const feedUrl = `${requestUrl.origin}${feedPath}`;

  return NextResponse.json(
    {
      ok: true,
      feedPath,
      feedUrl
    },
    { status: 200 }
  );
}
