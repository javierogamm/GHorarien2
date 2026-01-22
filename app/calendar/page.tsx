"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "../../components/Calendar";
import {
  type EventCategory,
  EVENT_CATEGORIES,
  EVENT_CATEGORY_META
} from "../../constants/eventCategories";
import {
  type CalendarEvent,
  createEventsForAttendees,
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<EventCategory>(EVENT_CATEGORIES[0]);
  const [attendees, setAttendees] = useState("");
  const [formStatus, setFormStatus] = useState({
    loading: false,
    error: "",
    success: ""
  });

  useEffect(() => {
    const savedUser = window.localStorage.getItem(SESSION_KEY);
    if (!savedUser) {
      router.push("/login");
      return;
    }
    setUsername(savedUser);
  }, [router]);

  const loadEvents = useCallback(async () => {
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
  }, [currentMonth, currentYear, username]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (
      selectedDate &&
      (selectedDate.getMonth() !== currentMonth ||
        selectedDate.getFullYear() !== currentYear)
    ) {
      setSelectedDate(null);
    }
  }, [currentMonth, currentYear, selectedDate]);

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

  const buildEventDateTime = (date: Date, time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      minute,
      0,
      0
    );
  };

  const parseAttendees = (value: string) =>
    Array.from(
      new Set(
        value
          .split(/[\n,]+/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    );

  const handleCreateEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = eventName.trim();
    const attendeeList = parseAttendees(attendees);

    if (!selectedDate) {
      setFormStatus({
        loading: false,
        error: "Selecciona un día del calendario.",
        success: ""
      });
      return;
    }

    if (!trimmedName) {
      setFormStatus({
        loading: false,
        error: "Indica el nombre del evento.",
        success: ""
      });
      return;
    }

    if (attendeeList.length === 0) {
      setFormStatus({
        loading: false,
        error: "Agrega al menos un asistente.",
        success: ""
      });
      return;
    }

    setFormStatus({ loading: true, error: "", success: "" });
    try {
      const meta = EVENT_CATEGORY_META[eventType];
      const startDate = buildEventDateTime(selectedDate, meta.startTime);
      const endDate = buildEventDateTime(selectedDate, meta.endTime);
      const fecha = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0,
        0,
        0,
        0
      ).toISOString();
      const duration = Math.round(
        (endDate.getTime() - startDate.getTime()) / 60000
      );

      await createEventsForAttendees({
        nombre: trimmedName,
        eventType,
        attendees: attendeeList,
        fecha,
        horaInicio: startDate.toISOString(),
        horaFin: endDate.toISOString(),
        duration,
        notas: ""
      });

      setEventName("");
      setAttendees("");
      setFormStatus({
        loading: false,
        error: "",
        success: "Evento creado correctamente."
      });
      await loadEvents();
    } catch (err) {
      setFormStatus({
        loading: false,
        error: "No se pudo crear el evento.",
        success: ""
      });
    }
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

        <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur">
          <h3 className="text-lg font-semibold text-slate-900">Crear evento</h3>
          <p className="mt-1 text-sm text-slate-500">
            Crea un evento nuevo y asigna asistentes. Cada asistente generará una
            fila en la tabla.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Fecha seleccionada:</span>
            {selectedDate ? (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600">
                {selectedDate.toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </span>
            ) : (
              <span className="text-sm text-slate-400">
                Selecciona un día en el calendario para asignar la fecha.
              </span>
            )}
          </div>
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleCreateEvent}>
            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Nombre del evento
                <input
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                  type="text"
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
                  placeholder="Ej: Taller de creatividad"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Tipo de evento
                <select
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                  value={eventType}
                  onChange={(event) =>
                    setEventType(event.target.value as EventCategory)
                  }
                >
                  {EVENT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {EVENT_CATEGORY_META[category].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              Asistentes (separados por coma o salto de línea)
              <textarea
                className="min-h-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                value={attendees}
                onChange={(event) => setAttendees(event.target.value)}
                placeholder="ej: ana, carlos, maria"
              />
            </label>
            {formStatus.error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                {formStatus.error}
              </p>
            ) : null}
            {formStatus.success ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-600">
                {formStatus.success}
              </p>
            ) : null}
            <div>
              <button
                type="submit"
                disabled={formStatus.loading}
                className="rounded-full border border-indigo-200 bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300"
              >
                {formStatus.loading ? "Creando..." : "Crear evento"}
              </button>
            </div>
          </form>
        </section>

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-white/70 bg-white/70 px-6 py-16 text-sm font-semibold text-slate-500 shadow-soft">
            Cargando eventos...
          </div>
        ) : (
          <Calendar
            currentMonth={currentMonth}
            currentYear={currentYear}
            events={events}
            selectedDate={selectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onMonthChange={setCurrentMonth}
            onYearChange={setCurrentYear}
            onDaySelect={setSelectedDate}
          />
        )}
      </div>
    </main>
  );
}
