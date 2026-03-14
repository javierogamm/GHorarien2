import { NextResponse } from "next/server";

const TOKEN_ENV_NAME = "CALENDAR_FEED_TOKEN";

/**
 * Devuelve la URL pública completa del feed ICS para consumo del frontend (solo construcción de URL).
 */
export async function GET(request: Request) {
  const token = process.env[TOKEN_ENV_NAME]?.trim();

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falta CALENDAR_FEED_TOKEN en variables de entorno del servidor."
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
