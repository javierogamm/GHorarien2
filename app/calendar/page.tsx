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
  createEstablishment,
  createEventsForAttendees,
  deleteEvent,
  fetchAllEvents,
  fetchEstablishments,
  updateEvent
} from "../../services/eventsService";
import { fetchUsers, type UserRecord } from "../../services/usersService";
import { parseDateWithoutTime } from "../../utils/calendarDates";
import type { CalendarEventDisplay } from "../../components/calendarTypes";

const SESSION_KEY = "calendar_user";
const ROLE_SESSION_KEY = "calendar_role";

const formatDateTime = (date: Date) => {
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

const isSameMonthAndYear = (date: Date, month: number, year: number) =>
  date.getFullYear() === year && date.getMonth() === month;

const USER_COLOR_PALETTE = [
  {
    badgeClass: "bg-rose-100 text-rose-700 ring-rose-200",
    dotClass: "bg-rose-400"
  },
  {
    badgeClass: "bg-amber-100 text-amber-700 ring-amber-200",
    dotClass: "bg-amber-400"
  },
  {
    badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dotClass: "bg-emerald-400"
  },
  {
    badgeClass: "bg-sky-100 text-sky-700 ring-sky-200",
    dotClass: "bg-sky-400"
  },
  {
    badgeClass: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    dotClass: "bg-indigo-400"
  },
  {
    badgeClass: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
    dotClass: "bg-fuchsia-400"
  }
];

const DEFAULT_USER_COLOR = {
  badgeClass: "bg-slate-100 text-slate-600 ring-slate-200",
  dotClass: "bg-slate-300"
};

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
  const [eventStartTime, setEventStartTime] = useState(
    EVENT_CATEGORY_META[EVENT_CATEGORIES[0]].startTime
  );
  const [eventEndTime, setEventEndTime] = useState(
    EVENT_CATEGORY_META[EVENT_CATEGORIES[0]].endTime
  );
  const [eventNotes, setEventNotes] = useState("");
  const [eventEstablishment, setEventEstablishment] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  const [dayDetailEvents, setDayDetailEvents] = useState<CalendarEventDisplay[]>(
    []
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventDisplay | null>(
    null
  );
  const [establishments, setEstablishments] = useState<string[]>([]);
  const [establishmentsError, setEstablishmentsError] = useState("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);
  const [establishmentSearch, setEstablishmentSearch] = useState("");
  const [newEstablishmentName, setNewEstablishmentName] = useState("");
  const [isEstablishmentModalOpen, setIsEstablishmentModalOpen] = useState(false);
  const [isAddingEstablishment, setIsAddingEstablishment] = useState(false);
  const [establishmentTarget, setEstablishmentTarget] = useState<
    "create" | "edit" | null
  >(null);
  const [establishmentStatus, setEstablishmentStatus] = useState({
    loading: false,
    error: ""
  });
  type EditFormState = {
    nombre: string;
    eventType: EventCategory;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    attendees: string[];
    notas: string;
    establecimiento: string;
  };

  const [editForm, setEditForm] = useState<EditFormState>({
    nombre: "",
    eventType: EVENT_CATEGORIES[0],
    fecha: "",
    horaInicio: "",
    horaFin: "",
    attendees: [],
    notas: "",
    establecimiento: ""
  });
  const [editStatus, setEditStatus] = useState({
    loading: false,
    error: "",
    success: ""
  });
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
    const savedRole = window.localStorage.getItem(ROLE_SESSION_KEY);
    setUserRole(savedRole);
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
    if (!username) return;
    const loadEstablishments = async () => {
      setEstablishmentsError("");
      try {
        const data = await fetchEstablishments();
        const names = data
          .map((item) => item.nombre?.trim())
          .filter((name): name is string => Boolean(name));
        names.sort((a, b) => a.localeCompare(b));
        setEstablishments(names);
        setEventEstablishment((prev) => (prev ? prev : names[0] ?? ""));
      } catch (err) {
        setEstablishmentsError(
          "No se pudo cargar la lista de establecimientos."
        );
      }
    };
    loadEstablishments();
  }, [username]);

  useEffect(() => {
    if (!username) return;
    const loadUsers = async () => {
      setUsersLoading(true);
      setUsersError("");
      try {
        const data = await fetchUsers();
        const sorted = [...data].sort((a, b) => a.user.localeCompare(b.user));
        setUsers(sorted);
        if (!userRole) {
          const matchedRole = sorted.find((entry) => entry.user === username)?.role;
          if (matchedRole) {
            setUserRole(matchedRole);
            window.localStorage.setItem(ROLE_SESSION_KEY, matchedRole);
          }
        }
      } catch (err) {
        setUsersError("No se pudo cargar la lista de usuarios.");
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, [username, userRole]);

  useEffect(() => {
    const meta = EVENT_CATEGORY_META[eventType];
    setEventStartTime(meta.startTime);
    setEventEndTime(meta.endTime);
  }, [eventType]);

  useEffect(() => {
    if (!selectedEvent) {
      setEditForm({
        nombre: "",
        eventType: EVENT_CATEGORIES[0],
        fecha: "",
        horaInicio: "",
        horaFin: "",
        attendees: [],
        notas: "",
        establecimiento: ""
      });
      setEditStatus({ loading: false, error: "", success: "" });
      return;
    }

    setEditForm({
      nombre: selectedEvent.nombre ?? "",
      eventType: selectedEvent.eventType,
      fecha: formatDateInput(selectedEvent.fecha),
      horaInicio: formatTimeInput(selectedEvent.horaInicio),
      horaFin: formatTimeInput(selectedEvent.horaFin),
      attendees: selectedEvent.attendees,
      notas: selectedEvent.notas ?? "",
      establecimiento: selectedEvent.establecimiento ?? ""
    });
    setEditStatus({ loading: false, error: "", success: "" });
  }, [selectedEvent]);

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

  const formatDisplayTime = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDateInput = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const pad = (item: number) => String(item).padStart(2, "0");
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
      parsed.getDate()
    )}`;
  };

  const formatTimeInput = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const pad = (item: number) => String(item).padStart(2, "0");
    return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  };

  const parseDateInput = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
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

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.user.localeCompare(b.user)),
    [users]
  );
  const validUsernames = useMemo(
    () => new Set(sortedUsers.map((user) => user.user)),
    [sortedUsers]
  );
  const userColorMap = useMemo(() => {
    const map = new Map<string, (typeof USER_COLOR_PALETTE)[number]>();
    sortedUsers.forEach((user, index) => {
      map.set(user.user, USER_COLOR_PALETTE[index % USER_COLOR_PALETTE.length]);
    });
    return map;
  }, [sortedUsers]);
  const getUserColor = (value: string) => userColorMap.get(value) ?? DEFAULT_USER_COLOR;

  const handleAddAttendee = (value: string, target: "create" | "edit") => {
    if (!validUsernames.has(value)) return;
    if (target === "create") {
      setAttendees((prev) => (prev.includes(value) ? prev : [...prev, value]));
      return;
    }
    setEditForm((prev) => ({
      ...prev,
      attendees: prev.attendees.includes(value)
        ? prev.attendees
        : [...prev.attendees, value]
    }));
  };

  const handleRemoveAttendee = (value: string, target: "create" | "edit") => {
    if (target === "create") {
      setAttendees((prev) => prev.filter((item) => item !== value));
      return;
    }
    setEditForm((prev) => ({
      ...prev,
      attendees: prev.attendees.filter((item) => item !== value)
    }));
  };

  const filteredEstablishments = useMemo(() => {
    const term = establishmentSearch.trim().toLowerCase();
    if (!term) return establishments;
    return establishments.filter((name) =>
      name.toLowerCase().includes(term)
    );
  }, [establishmentSearch, establishments]);

  const invalidCreateAttendees = useMemo(
    () => attendees.filter((attendee) => !validUsernames.has(attendee)),
    [attendees, validUsernames]
  );
  const invalidEditAttendees = useMemo(
    () => editForm.attendees.filter((attendee) => !validUsernames.has(attendee)),
    [editForm.attendees, validUsernames]
  );

  const openEstablishmentModal = (target: "create" | "edit") => {
    setEstablishmentTarget(target);
    setIsEstablishmentModalOpen(true);
    setEstablishmentSearch("");
    setNewEstablishmentName("");
    setIsAddingEstablishment(false);
    setEstablishmentStatus({ loading: false, error: "" });
  };

  const closeEstablishmentModal = () => {
    setIsEstablishmentModalOpen(false);
    setEstablishmentTarget(null);
    setEstablishmentSearch("");
    setNewEstablishmentName("");
    setIsAddingEstablishment(false);
    setEstablishmentStatus({ loading: false, error: "" });
  };

  const handleSelectEstablishment = (name: string) => {
    if (establishmentTarget === "edit") {
      setEditForm((prev) => ({ ...prev, establecimiento: name }));
    } else {
      setEventEstablishment(name);
    }
    closeEstablishmentModal();
  };

  const handleCreateEstablishment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const trimmedName = newEstablishmentName.trim();

    if (!trimmedName) {
      setEstablishmentStatus({
        loading: false,
        error: "Indica el nombre del establecimiento."
      });
      return;
    }

    setEstablishmentStatus({ loading: true, error: "" });
    try {
      await createEstablishment(trimmedName);
      setEstablishments((prev) => {
        const next = Array.from(new Set([...prev, trimmedName]));
        next.sort((a, b) => a.localeCompare(b));
        return next;
      });
      setEstablishmentStatus({ loading: false, error: "" });
      handleSelectEstablishment(trimmedName);
    } catch (error) {
      setEstablishmentStatus({
        loading: false,
        error: "No se pudo añadir el establecimiento."
      });
    }
  };

  const handleCreateEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = eventName.trim();
    const attendeeList = attendees;

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

    if (usersLoading) {
      setFormStatus({
        loading: false,
        error: "Estamos cargando los usuarios disponibles.",
        success: ""
      });
      return;
    }

    if (usersError || validUsernames.size === 0) {
      setFormStatus({
        loading: false,
        error: "No hay usuarios disponibles para asignar asistentes.",
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

    if (invalidCreateAttendees.length > 0) {
      setFormStatus({
        loading: false,
        error: "Hay asistentes que no existen en la tabla de usuarios.",
        success: ""
      });
      return;
    }

    if (!eventStartTime) {
      setFormStatus({
        loading: false,
        error: "Indica la hora de inicio.",
        success: ""
      });
      return;
    }

    if (!eventEndTime) {
      setFormStatus({
        loading: false,
        error: "Indica la hora de fin.",
        success: ""
      });
      return;
    }

    if (!eventEstablishment) {
      setFormStatus({
        loading: false,
        error: "Selecciona un establecimiento.",
        success: ""
      });
      return;
    }

    setFormStatus({ loading: true, error: "", success: "" });
    try {
      const startDate = buildEventDateTime(selectedDate, eventStartTime);
      const endDate = buildEventDateTime(selectedDate, eventEndTime);
      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        setFormStatus({
          loading: false,
          error: "Las horas indicadas no son válidas.",
          success: ""
        });
        return;
      }

      if (endDate.getTime() <= startDate.getTime()) {
        setFormStatus({
          loading: false,
          error: "La hora de fin debe ser posterior a la hora de inicio.",
          success: ""
        });
        return;
      }
      const duration = Math.round(
        (endDate.getTime() - startDate.getTime()) / 60000
      );

      await createEventsForAttendees({
        nombre: trimmedName,
        eventType,
        attendees: attendeeList,
        fecha: formatDateTime(startDate),
        horaInicio: formatDateTime(startDate),
        horaFin: formatDateTime(endDate),
        duration,
        notas: eventNotes.trim(),
        establecimiento: eventEstablishment
      });

      setEventName("");
      setAttendees([]);
      setEventNotes("");
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

  const handleDaySelect = (date: Date, events: CalendarEventDisplay[]) => {
    setSelectedDate(date);
    setDayDetailEvents(events);
    setIsDayDetailModalOpen(true);
  };

  const handleAddEvent = (date: Date) => {
    setSelectedDate(date);
    setFormStatus({ loading: false, error: "", success: "" });
    const meta = EVENT_CATEGORY_META[eventType];
    setEventStartTime(meta.startTime);
    setEventEndTime(meta.endTime);
    setAttendees([]);
    setIsCreateModalOpen(true);
    setIsDayDetailModalOpen(false);
  };

  const handleEventSelect = (event: CalendarEventDisplay) => {
    setSelectedEvent(event);
  };

  const handleDayDetailEventSelect = (event: CalendarEventDisplay) => {
    setSelectedEvent(event);
    setIsDayDetailModalOpen(false);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setFormStatus({ loading: false, error: "", success: "" });
  };

  const closeDayDetailModal = () => {
    setIsDayDetailModalOpen(false);
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
  };

  const handleUpdateEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEvent) return;

    const trimmedName = editForm.nombre.trim();
    const attendeeList = editForm.attendees;
    const selectedDateValue = parseDateInput(editForm.fecha);

    if (!trimmedName) {
      setEditStatus({
        loading: false,
        error: "Indica el nombre del evento.",
        success: ""
      });
      return;
    }

    if (!selectedDateValue) {
      setEditStatus({
        loading: false,
        error: "Selecciona una fecha válida.",
        success: ""
      });
      return;
    }

    if (!editForm.horaInicio) {
      setEditStatus({
        loading: false,
        error: "Indica la hora de inicio.",
        success: ""
      });
      return;
    }

    if (!editForm.horaFin) {
      setEditStatus({
        loading: false,
        error: "Indica la hora de fin.",
        success: ""
      });
      return;
    }

    if (!editForm.establecimiento) {
      setEditStatus({
        loading: false,
        error: "Selecciona un establecimiento.",
        success: ""
      });
      return;
    }

    if (usersLoading) {
      setEditStatus({
        loading: false,
        error: "Estamos cargando los usuarios disponibles.",
        success: ""
      });
      return;
    }

    if (usersError || validUsernames.size === 0) {
      setEditStatus({
        loading: false,
        error: "No hay usuarios disponibles para asignar asistentes.",
        success: ""
      });
      return;
    }

    if (attendeeList.length === 0) {
      setEditStatus({
        loading: false,
        error: "Agrega al menos un asistente.",
        success: ""
      });
      return;
    }

    if (invalidEditAttendees.length > 0) {
      setEditStatus({
        loading: false,
        error: "Hay asistentes que no existen en la tabla de usuarios.",
        success: ""
      });
      return;
    }

    const startDate = buildEventDateTime(selectedDateValue, editForm.horaInicio);
    const endDate = buildEventDateTime(selectedDateValue, editForm.horaFin);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setEditStatus({
        loading: false,
        error: "Las horas indicadas no son válidas.",
        success: ""
      });
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setEditStatus({
        loading: false,
        error: "La hora de fin debe ser posterior a la hora de inicio.",
        success: ""
      });
      return;
    }

    setEditStatus({ loading: true, error: "", success: "" });
    try {
      const duration = Math.round(
        (endDate.getTime() - startDate.getTime()) / 60000
      );
      const payload = {
        nombre: trimmedName,
        eventType: editForm.eventType,
        fecha: formatDateTime(startDate),
        horaInicio: formatDateTime(startDate),
        horaFin: formatDateTime(endDate),
        duration,
        notas: editForm.notas.trim(),
        establecimiento: editForm.establecimiento
      };

      const groupedEvents = allEvents.filter(
        (eventItem) =>
          eventItem.nombre === selectedEvent.nombre &&
          eventItem.eventType === selectedEvent.eventType &&
          eventItem.fecha === selectedEvent.fecha &&
          eventItem.horaInicio === selectedEvent.horaInicio &&
          eventItem.horaFin === selectedEvent.horaFin
      );
      const existingUsers = new Set(groupedEvents.map((item) => item.user));
      const desiredUsers = new Set(attendeeList);

      await Promise.all(
        groupedEvents.map((eventItem) => {
          if (desiredUsers.has(eventItem.user)) {
            return updateEvent(eventItem.$id, {
              ...payload,
              user: eventItem.user
            });
          }
          return deleteEvent(eventItem.$id);
        })
      );

      const newAttendees = attendeeList.filter(
        (attendee) => !existingUsers.has(attendee)
      );
      if (newAttendees.length > 0) {
        await createEventsForAttendees({
          ...payload,
          attendees: newAttendees
        });
      }

      setEditStatus({
        loading: false,
        error: "",
        success: "Evento actualizado correctamente."
      });
      setSelectedEvent(null);
      await loadAllEvents();
    } catch (err) {
      setEditStatus({
        loading: false,
        error: "No se pudo actualizar el evento.",
        success: ""
      });
    }
  };

  const handleCategoryToggle = (category: EventCategory) => {
    setActiveCategory((prev) => (prev === category ? null : category));
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
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-slate-900">
                {username ? `Hola, ${username}` : "Cargando..."}
              </h2>
              {userRole ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {userRole}
                </span>
              ) : null}
            </div>
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
            activeCategory={activeCategory}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onMonthChange={setCurrentMonth}
            onYearChange={setCurrentYear}
            onDaySelect={handleDaySelect}
            onAddEvent={handleAddEvent}
            onEventSelect={handleEventSelect}
            onCategoryToggle={handleCategoryToggle}
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
                    <th className="px-4 py-3">Establecimiento</th>
                    <th className="px-4 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
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
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                EVENT_CATEGORY_META[event.eventType]?.dotClass ??
                                "bg-slate-300"
                              }`}
                            />
                            {EVENT_CATEGORY_META[event.eventType]?.label ??
                              event.eventType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${getUserColor(event.user).dotClass}`}
                              aria-hidden="true"
                            />
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${getUserColor(event.user).badgeClass}`}
                            >
                              {event.user}
                            </span>
                          </span>
                        </td>
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
                          {event.establecimiento?.trim() || "—"}
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
          isDayDetailModalOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeDayDetailModal}
      >
        <div
          className={`max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white/90 p-6 shadow-soft transition ${
            isDayDetailModalOpen
              ? "translate-y-0 scale-100"
              : "translate-y-4 scale-95"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Eventos del día
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Detalle de los eventos programados.
              </p>
            </div>
            <button
              type="button"
              onClick={closeDayDetailModal}
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
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {dayDetailEvents.length} eventos
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {dayDetailEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
                No hay eventos para este día.
              </div>
            ) : (
              dayDetailEvents.map((event) => {
                const meta =
                  EVENT_CATEGORY_META[event.eventType] ?? EVENT_CATEGORY_META.Comida;
                return (
                  <button
                    key={event.groupKey}
                    type="button"
                    onClick={() => handleDayDetailEventSelect(event)}
                    className={`relative flex w-full flex-col gap-2 rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass}`}
                  >
                    <span
                      className={`absolute inset-y-0 left-0 w-1.5 rounded-l-2xl ${meta.dotClass}`}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-center gap-2 pl-2 text-sm font-semibold text-slate-800">
                      <span className="truncate">
                        {event.nombre || "Evento"}
                      </span>
                      <span className="text-slate-500">-</span>
                      <span className="text-slate-600">{meta.label}</span>
                      <span className="text-slate-500">-</span>
                      <span className="text-slate-600">
                        {event.establecimiento?.trim() || "Sin ubicación"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 pl-2 text-xs font-medium text-slate-600">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Asistentes ({event.attendeeCount}):</span>
                        {event.attendees.length > 0 ? (
                          event.attendees.map((attendee) => {
                            const color = getUserColor(attendee);
                            return (
                              <span
                                key={attendee}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${color.badgeClass}`}
                              >
                                {attendee}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-400">Sin asistentes</span>
                        )}
                      </div>
                      <span>Inicio: {formatDisplayTime(event.horaInicio)}</span>
                      <span>Fin: {formatDisplayTime(event.horaFin)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10 backdrop-blur-sm transition ${
          isCreateModalOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCreateModal}
      >
        <div
          className={`max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white/90 p-6 shadow-soft transition ${
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
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Hora inicio
                <input
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                  type="time"
                  value={eventStartTime}
                  onChange={(event) => setEventStartTime(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Hora fin
                <input
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                  type="time"
                  value={eventEndTime}
                  onChange={(event) => setEventEndTime(event.target.value)}
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              Establecimiento
              <button
                type="button"
                onClick={() => openEstablishmentModal("create")}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300"
              >
                <span className="truncate">
                  {eventEstablishment || "Selecciona un establecimiento"}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-4.35-4.35m1.1-4.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                    />
                  </svg>
                </span>
              </button>
              {establishmentsError ? (
                <span className="text-xs text-rose-500">{establishmentsError}</span>
              ) : null}
            </label>
            <div className="flex flex-col gap-3 text-sm font-medium text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Asistentes</span>
                <span className="text-xs font-semibold text-slate-400">
                  {attendees.length} seleccionados
                </span>
              </div>
              {usersError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {usersError}
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Usuarios disponibles
                  </span>
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm">
                    {usersLoading ? (
                      <p className="text-xs text-slate-400">Cargando usuarios...</p>
                    ) : sortedUsers.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No hay usuarios registrados.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {sortedUsers.map((user) => {
                          const color = getUserColor(user.user);
                          const isSelected = attendees.includes(user.user);
                          return (
                            <div
                              key={user.$id}
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${color.dotClass}`}
                                  aria-hidden="true"
                                />
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${color.badgeClass}`}
                                >
                                  {user.user}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                  {user.role}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddAttendee(user.user, "create")}
                                disabled={isSelected}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-500 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                                aria-label={`Añadir ${user.user}`}
                              >
                                +
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Seleccionados
                  </span>
                  <div className="min-h-[120px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm">
                    {attendees.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Añade asistentes con el botón +.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {attendees.map((attendee) => {
                          const color = getUserColor(attendee);
                          return (
                            <span
                              key={attendee}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${color.badgeClass}`}
                            >
                              {attendee}
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveAttendee(attendee, "create")
                                }
                                className="rounded-full px-1 text-xs font-bold text-slate-500 transition hover:text-slate-700"
                                aria-label={`Quitar ${attendee}`}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {invalidCreateAttendees.length > 0 ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  Hay asistentes que no existen en la tabla de usuarios.
                </p>
              ) : null}
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              Notas
              <textarea
                className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                value={eventNotes}
                onChange={(event) => setEventNotes(event.target.value)}
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
          className={`max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/70 bg-white/90 p-6 shadow-soft transition ${
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
            <form className="mt-4 flex flex-col gap-4" onSubmit={handleUpdateEvent}>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Nombre
                <input
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                  type="text"
                  value={editForm.nombre}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, nombre: event.target.value }))
                  }
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                  Tipo de evento
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                    value={editForm.eventType}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        eventType: event.target.value as EventCategory
                      }))
                    }
                  >
                    {EVENT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {EVENT_CATEGORY_META[category].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                  Fecha
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                    type="date"
                    value={editForm.fecha}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, fecha: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                  Hora inicio
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                    type="time"
                    value={editForm.horaInicio}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        horaInicio: event.target.value
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                  Hora fin
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                    type="time"
                    value={editForm.horaFin}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, horaFin: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Establecimiento
                <button
                  type="button"
                  onClick={() => openEstablishmentModal("edit")}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300"
                >
                  <span className="truncate">
                    {editForm.establecimiento || "Selecciona un establecimiento"}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m21 21-4.35-4.35m1.1-4.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                      />
                    </svg>
                  </span>
                </button>
              </label>
              <div className="flex flex-col gap-3 text-sm font-medium text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Asistentes</span>
                  <span className="text-xs font-semibold text-slate-400">
                    {editForm.attendees.length} seleccionados
                  </span>
                </div>
                {usersError ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                    {usersError}
                  </p>
                ) : null}
                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Usuarios disponibles
                    </span>
                    <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm">
                      {usersLoading ? (
                        <p className="text-xs text-slate-400">Cargando usuarios...</p>
                      ) : sortedUsers.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          No hay usuarios registrados.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {sortedUsers.map((user) => {
                            const color = getUserColor(user.user);
                            const isSelected = editForm.attendees.includes(user.user);
                            return (
                              <div
                                key={user.$id}
                                className="flex items-center justify-between gap-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${color.dotClass}`}
                                    aria-hidden="true"
                                  />
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${color.badgeClass}`}
                                  >
                                    {user.user}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    {user.role}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddAttendee(user.user, "edit")}
                                  disabled={isSelected}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-500 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                                  aria-label={`Añadir ${user.user}`}
                                >
                                  +
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Seleccionados
                    </span>
                    <div className="min-h-[120px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm">
                      {editForm.attendees.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          Añade asistentes con el botón +.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {editForm.attendees.map((attendee) => {
                            const color = getUserColor(attendee);
                            return (
                              <span
                                key={attendee}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${color.badgeClass}`}
                              >
                                {attendee}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveAttendee(attendee, "edit")
                                  }
                                  className="rounded-full px-1 text-xs font-bold text-slate-500 transition hover:text-slate-700"
                                  aria-label={`Quitar ${attendee}`}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {invalidEditAttendees.length > 0 ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                    Hay asistentes que no existen en la tabla de usuarios.
                  </p>
                ) : null}
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Notas
                <textarea
                  className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                  value={editForm.notas}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, notas: event.target.value }))
                  }
                />
              </label>
              {editStatus.error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                  {editStatus.error}
                </p>
              ) : null}
              {editStatus.success ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-600">
                  {editStatus.success}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeEventModal}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editStatus.loading}
                  className="rounded-full border border-indigo-200 bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300"
                >
                  {editStatus.loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4 py-10 backdrop-blur-sm transition ${
          isEstablishmentModalOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeEstablishmentModal}
      >
        <div
          className={`max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/70 bg-white/95 p-6 shadow-soft transition ${
            isEstablishmentModalOpen ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Buscar establecimiento
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona un establecimiento de la tabla o crea uno nuevo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingEstablishment(true);
                  setNewEstablishmentName("");
                  setEstablishmentStatus({ loading: false, error: "" });
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                aria-label="Añadir establecimiento"
              >
                +
              </button>
              <button
                type="button"
                onClick={closeEstablishmentModal}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              Buscar
              <input
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                type="text"
                placeholder="Escribe el nombre del establecimiento"
                value={establishmentSearch}
                onChange={(event) => setEstablishmentSearch(event.target.value)}
              />
            </label>
          </div>

          {isAddingEstablishment ? (
            <form
              className="mt-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"
              onSubmit={handleCreateEstablishment}
            >
              <label className="flex flex-col gap-2 text-sm font-medium text-indigo-700">
                Nuevo establecimiento
                <input
                  className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                  type="text"
                  value={newEstablishmentName}
                  onChange={(event) => setNewEstablishmentName(event.target.value)}
                />
              </label>
              {establishmentStatus.error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                  {establishmentStatus.error}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingEstablishment(false)}
                  className="rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:border-indigo-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={establishmentStatus.loading}
                  className="rounded-full border border-indigo-200 bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {establishmentStatus.loading ? "Añadiendo..." : "Añadir"}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-4 space-y-2">
            {filteredEstablishments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                No se encontraron establecimientos.
              </div>
            ) : (
              filteredEstablishments.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectEstablishment(name)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"
                >
                  <span className="truncate">{name}</span>
                  <span className="text-xs text-slate-400">Seleccionar</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
