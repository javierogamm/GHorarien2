"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Calendar } from "../../components/Calendar";
import {
  type CalendarEvent,
  fetchEventsForUserAndRange
} from "../../services/eventsService";

const SESSION_KEY = "calendar_user";

const getMonthRangeISO = (year: number, month: number) => {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
};

export default function CalendarPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [username, setUsername] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedUser = window.localStorage.getItem(SESSION_KEY);
    if (!savedUser) {
      router.push("/login");
      return;
    }
    setUsername(savedUser);
  }, [router]);

  useEffect(() => {
    const loadEvents = async () => {
      if (!username) return;
      setLoading(true);
      setError("");
      try {
        const { startISO, endISO } = getMonthRangeISO(currentYear, currentMonth);
        const data = await fetchEventsForUserAndRange(username, startISO, endISO);
        setEvents(data);
      } catch (err) {
        setError("No se pudieron cargar los eventos.");
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [username, currentMonth, currentYear]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    router.push("/login");
  };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Sesión activa
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {username ? `Hola, ${username}` : "Cargando..."}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-500"
          >
            Cerrar sesión
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-white/70 bg-white/70 px-6 py-16 text-sm font-semibold text-slate-500 shadow-soft">
            Cargando eventos...
          </div>
        ) : (
          <Calendar
            currentMonth={currentMonth}
            currentYear={currentYear}
            events={events}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onYearChange={setCurrentYear}
          />
        )}
      </div>
    </main>
  );
}
