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
  fetchAllEvents
} from "../../services/eventsService";
import { parseDateWithoutTime } from "../../utils/calendarDates";
import type { CalendarEventDisplay } from "../../components/calendarTypes";

const SESSION_KEY = "calendar_user";

const formatDateTime = (date: Date) => {
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

const isSameMonthAndYear = (date: Date, month: number, year: number) =>
  date.getFullYear() === year && date.getMonth() === month;

export default function CalendarPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [username, setUsername] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [allEventsLoading, setAllEventsLoading] = useState(false);
  const [allEventsError, setAllEventsError] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<EventCategory>(EVENT_CATEGORIES[0]);
  const [attendees, setAttendees] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventDisplay | null>(
    null
  );
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

  const loadAllEvents = useCallback(async () => {
    setAllEventsLoading(true);
    setAllEventsError("");
    try {
      const data = await fetchAllEvents();
      const sorted = [...data].sort((a, b) =>
        (a.fecha ?? "").localeCompare(b.fecha ?? "")
      );
      setAllEvents(sorted);
    } catch (err) {
      setAllEventsError("No se pudo cargar la tabla completa.");
    } finally {
      setAllEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!username) return;
    loadAllEvents();
  }, [loadAllEvents, username]);

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

  const formatDisplayDate = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
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
      );
      const duration = Math.round(
        (endDate.getTime() - startDate.getTime()) / 60000
      );

      await createEventsForAttendees({
        nombre: trimmedName,
        eventType,
        attendees: attendeeList,
        fecha: formatDateTime(fecha),
        horaInicio: formatDateTime(startDate),
        horaFin: formatDateTime(endDate),
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
      setIsCreateModalOpen(false);
      await loadAllEvents();
    } catch (err) {
      setFormStatus({
        loading: false,
        error: "No se pudo crear el evento.",
        success: ""
      });
    }
  };

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
    setFormStatus({ loading: false, error: "", success: "" });
    setIsCreateModalOpen(true);
  };

  const handleEventSelect = (event: CalendarEventDisplay) => {
    setSelectedEvent(event);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setFormStatus({ loading: false, error: "", success: "" });
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
  };

  const calendarEvents = useMemo(
    () =>
      allEvents.filter((eventItem) => {
        const eventDate = parseDateWithoutTime(eventItem.fecha);
        if (!eventDate) return false;
        return isSameMonthAndYear(eventDate, currentMonth, currentYear);
      }),
    [allEvents, currentMonth, currentYear]
  );

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

        {allEventsError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {allEventsError}
          </div>
        ) : null}

        {allEventsLoading ? (
          <div className="flex items-center justify-center rounded-3xl border border-white/70 bg-white/70 px-6 py-16 text-sm font-semibold text-slate-500 shadow-soft">
            Cargando eventos...
          </div>
        ) : (
          <Calendar
            currentMonth={currentMonth}
            currentYear={currentYear}
            events={calendarEvents}
            selectedDate={selectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onMonthChange={setCurrentMonth}
            onYearChange={setCurrentYear}
            onDaySelect={handleDaySelect}
            onEventSelect={handleEventSelect}
          />
        )}

        <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Tabla completa (Appwrite)
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Listado de todos los registros existentes en la colección
                <span className="font-semibold text-slate-700"> tabla</span>.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {allEvents.length} registros
            </span>
          </div>

          {allEventsError ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {allEventsError}
            </p>
          ) : null}

          {allEventsLoading ? (
            <div className="mt-6 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-12 text-sm font-semibold text-slate-500">
              Cargando tabla...
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Evento</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Inicio</th>
                    <th className="px-4 py-3">Fin</th>
                    <th className="px-4 py-3">Duración</th>
                    <th className="px-4 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-sm text-slate-400"
                      >
                        No hay registros en la tabla todavía.
                      </td>
                    </tr>
                  ) : (
                    allEvents.map((event) => (
                      <tr key={event.$id} className="bg-white/40">
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {event.nombre || "Sin nombre"}
                        </td>
                        <td className="px-4 py-3">
                          {EVENT_CATEGORY_META[event.eventType]?.label ??
                            event.eventType}
                        </td>
                        <td className="px-4 py-3">{event.user}</td>
                        <td className="px-4 py-3">
                          {formatDisplayDate(event.fecha)}
                        </td>
                        <td className="px-4 py-3">
                          {formatDisplayDate(event.horaInicio)}
                        </td>
                        <td className="px-4 py-3">
                          {formatDisplayDate(event.horaFin)}
                        </td>
                        <td className="px-4 py-3">
                          {event.duration ? `${event.duration} min` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {event.notas?.trim() || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10 backdrop-blur-sm transition ${
          isCreateModalOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCreateModal}
      >
        <div
          className={`w-full max-w-2xl rounded-3xl border border-white/70 bg-white/90 p-6 shadow-soft transition ${
            isCreateModalOpen ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Crear evento</h3>
              <p className="mt-1 text-sm text-slate-500">
                Completa los datos del evento y añade asistentes.
              </p>
            </div>
            <button
              type="button"
              onClick={closeCreateModal}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Fecha:</span>
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
                Selecciona un día en el calendario.
              </span>
            )}
          </div>
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleCreateEvent}>
            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Nombre
                <input
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                  type="text"
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
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
              Asistentes
              <textarea
                className="min-h-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                value={attendees}
                onChange={(event) => setAttendees(event.target.value)}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={formStatus.loading}
                className="rounded-full border border-indigo-200 bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300"
              >
                {formStatus.loading ? "Creando..." : "Crear evento"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10 backdrop-blur-sm transition ${
          selectedEvent ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeEventModal}
      >
        <div
          className={`w-full max-w-lg rounded-3xl border border-white/70 bg-white/90 p-6 shadow-soft transition ${
            selectedEvent ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {selectedEvent?.nombre || "Detalle del evento"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {selectedEvent
                  ? EVENT_CATEGORY_META[selectedEvent.eventType]?.label ??
                    selectedEvent.eventType
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={closeEventModal}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              Cerrar
            </button>
          </div>
          {selectedEvent ? (
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Asistentes
                </p>
                {selectedEvent.attendees.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {selectedEvent.attendees.map((attendee) => (
                      <li key={attendee}>{attendee}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    No hay asistentes registrados.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                  {selectedEvent.attendeeCount} asistentes
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
