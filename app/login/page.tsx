"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { validateUserCredentials } from "../../services/usersService";

const SESSION_KEY = "calendar_user";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    try {
      const userRecord = await validateUserCredentials(username, password);
      if (!userRecord) {
        setError("Credenciales inválidas. Inténtalo de nuevo.");
        return;
      }
      window.localStorage.setItem(SESSION_KEY, userRecord.user);
      router.push("/calendar");
    } catch (err) {
      setError("No se pudo conectar con Appwrite.");
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
      </div>
    </main>
  );
}
