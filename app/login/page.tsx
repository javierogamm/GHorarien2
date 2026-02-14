"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { validateUserCredentials } from "../../services/usersService";

const SESSION_KEY = "calendar_user";
const ROLE_SESSION_KEY = "calendar_role";

const normalizeUserRole = (role?: unknown) => {
  const normalized =
    (typeof role === "string"
      ? role
      : typeof role === "number" || typeof role === "boolean"
      ? String(role)
      : "")
      .trim()
      .toLowerCase();
  if (!normalized) return "User";
  if (normalized === "admin") return "Admin";
  if (normalized === "boss") return "Boss";
  if (normalized === "eventmaster") return "Eventmaster";
  return "User";
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionLog, setConnectionLog] = useState<
    { id: number; message: string; status: "info" | "success" | "error"; time: string }[]
  >([]);

  const createLogEntry = (
    message: string,
    status: "info" | "success" | "error" = "info"
  ) => ({
    id: Date.now() + Math.floor(Math.random() * 1000),
    message,
    status,
    time: new Date().toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  });

  useEffect(() => {
    const savedUser = window.localStorage.getItem(SESSION_KEY);
    if (savedUser) {
      router.push("/calendar");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    setConnectionLog([
      createLogEntry("Iniciando verificación de credenciales con Supabase.")
    ]);

    try {
      setConnectionLog((prev) => [
        ...prev,
        createLogEntry("Validando configuración de Supabase.")
      ]);
      const userRecord = await validateUserCredentials(username, password);
      setConnectionLog((prev) => [
        ...prev,
        createLogEntry("Respuesta recibida desde Supabase.", "success")
      ]);
      if (!userRecord) {
        setError("Credenciales inválidas. Inténtalo de nuevo.");
        setConnectionLog((prev) => [
          ...prev,
          createLogEntry(
            "Supabase respondió correctamente, pero no se encontraron credenciales válidas.",
            "error"
          )
        ]);
        return;
      }
      window.localStorage.setItem(SESSION_KEY, userRecord.user);
      window.localStorage.setItem(ROLE_SESSION_KEY, normalizeUserRole(userRecord.role));
      setConnectionLog((prev) => [
        ...prev,
        createLogEntry("Sesión iniciada y usuario autenticado.", "success")
      ]);
      router.push("/calendar");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al conectar.";
      setError("No se pudo conectar con Supabase.");
      setConnectionLog((prev) => [
        ...prev,
        createLogEntry(`Error de conexión: ${message}`, "error")
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-10 shadow-soft backdrop-blur">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
            Acceso privado
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Bienvenido al calendario
          </h1>
          <p className="text-sm text-slate-500">
            Ingresa con tu usuario y contraseña para continuar.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="user">
              Usuario
            </label>
            <input
              id="user"
              name="user"
              type="text"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="usuario"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="pass">
              Contraseña
            </label>
            <input
              id="pass"
              name="pass"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Validando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <span>Estado de conexión con Supabase</span>
            {loading ? (
              <span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] text-indigo-600">
                En curso
              </span>
            ) : null}
          </div>
          <div className="max-h-40 space-y-2 overflow-y-auto text-xs text-slate-600">
            {connectionLog.length ? (
              connectionLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 shadow-sm"
                >
                  <span className="min-w-[52px] text-[10px] font-semibold text-slate-400">
                    {entry.time}
                  </span>
                  <span
                    className={
                      entry.status === "error"
                        ? "text-rose-500"
                        : entry.status === "success"
                        ? "text-emerald-600"
                        : "text-slate-600"
                    }
                  >
                    {entry.message}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400">
                Sin actividad registrada todavía.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
