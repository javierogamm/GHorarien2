import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const SESSION_COOKIE_NAME = "calendar_session_token";

const hasValidSession = async () => {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const expectedToken = process.env.API_SESSION_TOKEN;

  if (!expectedToken) {
    throw new Error("Falta API_SESSION_TOKEN en variables de entorno del servidor.");
  }

  if (!sessionCookie) {
    return false;
  }

  return sessionCookie === expectedToken;
};

export async function GET() {
  try {
    const isValid = await hasValidSession();

    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("documentos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
