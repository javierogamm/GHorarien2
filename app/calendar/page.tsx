"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { Calendar } from "../../components/Calendar";
import {
  CalendarModuleIcon,
  HourglassModuleIcon,
  PersonModuleIcon,
  TableModuleIcon
} from "../../components/icons/ModuleIcons";
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
import {
  createHorasDeclaradas,
  deleteHorasDeclaradas,
  fetchHorasDeclaradasForUser,
  type HorasDeclaradasRecord,
  toHorasDeclaradasNumber,
  updateHorasDeclaradas
} from "../../services/horasDeclaradasService";
import {
  fetchUsers,
  parseHorasObtenidas,
  type UserRecord,
  updateUserHorasObtenidas
} from "../../services/usersService";
import { parseDateWithoutTime } from "../../utils/calendarDates";
import type { CalendarEventDisplay } from "../../components/calendarTypes";

const SESSION_KEY = "calendar_user";
const ROLE_SESSION_KEY = "calendar_role";
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];
const HOURS_PER_EVENT = 3;
const MAX_DECLARABLE_HOURS = 7;
const MAX_REASON_LENGTH = 200;
const DECLARE_RANGE_START_MINUTES = 7 * 60 + 30;
const DECLARE_RANGE_END_MINUTES = 16 * 60 + 30;
const DECLARE_START_STEP_MINUTES = 30;
const DECLARE_END_STEP_MINUTES = DECLARE_START_STEP_MINUTES;
const DECLARE_MIN_DURATION_MINUTES = 60;
const DECLARE_MAX_DURATION_MINUTES = MAX_DECLARABLE_HOURS * 60;
const DECLARE_MIN_DURATION_HOURS = DECLARE_MIN_DURATION_MINUTES / 60;
const DECLARE_START_MAX_MINUTES = DECLARE_RANGE_END_MINUTES - DECLARE_MIN_DURATION_MINUTES;

const minutesToTimeString = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
};

const clampMinutes = (minutes: number, min: number, max: number) =>
  Math.min(max, Math.max(min, minutes));

const roundToDeclareStep = (minutes: number) => {
  const stepsFromStart = Math.round(
    (minutes - DECLARE_RANGE_START_MINUTES) / DECLARE_START_STEP_MINUTES
  );
  return DECLARE_RANGE_START_MINUTES + stepsFromStart * DECLARE_START_STEP_MINUTES;
};

const clampDeclareStartMinutes = (minutes: number) =>
  clampMinutes(
    roundToDeclareStep(minutes),
    DECLARE_RANGE_START_MINUTES,
    DECLARE_START_MAX_MINUTES
  );

const getDeclareMaxDurationHours = (startMinutes: number) => {
  const maxCandidate = Math.min(
    DECLARE_RANGE_END_MINUTES,
    startMinutes + DECLARE_MAX_DURATION_MINUTES
  );
  const availableHours = Math.floor((maxCandidate - startMinutes) / 60);
  return Math.max(DECLARE_MIN_DURATION_HOURS, availableHours);
};

const getDeclareEndBounds = (startMinutes: number) => {
  const maxDurationHours = getDeclareMaxDurationHours(startMinutes);
  const minEndMinutes = startMinutes + DECLARE_MIN_DURATION_MINUTES;
  const maxEndMinutes = startMinutes + maxDurationHours * 60;
  return {
    minEndMinutes,
    maxEndMinutes,
    maxDurationHours
  };
};

const sanitizeDeclareEndMinutes = (
  startMinutes: number,
  endMinutes: number,
  preferredDurationHours?: number
) => {
  const { minEndMinutes, maxEndMinutes, maxDurationHours } = getDeclareEndBounds(startMinutes);
  const requestedDurationHours =
    preferredDurationHours ?? Math.round((endMinutes - startMinutes) / 60);
  const normalizedDurationHours = Math.round(requestedDurationHours);
  const clampedDurationHours = clampMinutes(
    normalizedDurationHours,
    DECLARE_MIN_DURATION_HOURS,
    maxDurationHours
  );
  const alignedEndMinutes = startMinutes + clampedDurationHours * 60;
  return clampMinutes(alignedEndMinutes, minEndMinutes, maxEndMinutes);
};

const deriveDeclareEndMinutes = (startMinutes: number, preferredDurationHours?: number) => {
  const { maxDurationHours } = getDeclareEndBounds(startMinutes);
  const targetDurationHours = preferredDurationHours ?? maxDurationHours;
  return sanitizeDeclareEndMinutes(
    startMinutes,
    startMinutes + targetDurationHours * 60,
    targetDurationHours
  );
};

const formatDeclareRange = (startMinutes: number, endMinutes: number) =>
  `${minutesToTimeString(startMinutes)}-${minutesToTimeString(endMinutes)}`;

const parseDeclareRangeMinutes = (
  range: string | undefined,
  fallbackHours: number | undefined
) => {
  const normalizedFallbackHours = Math.max(
    DECLARE_MIN_DURATION_HOURS,
    Math.round(fallbackHours ?? DECLARE_MIN_DURATION_HOURS)
  );
  const fallbackStartMinutes = DECLARE_RANGE_START_MINUTES;

  if (!range) {
    return {
      startMinutes: fallbackStartMinutes,
      endMinutes: deriveDeclareEndMinutes(fallbackStartMinutes, normalizedFallbackHours)
    };
  }

  const match = range.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (!match) {
    return {
      startMinutes: fallbackStartMinutes,
      endMinutes: deriveDeclareEndMinutes(fallbackStartMinutes, normalizedFallbackHours)
    };
  }

  const [, startHours, startMinutesPart, endHours, endMinutesPart] = match;
  const parsedStartMinutes = clampDeclareStartMinutes(
    Number(startHours) * 60 + Number(startMinutesPart)
  );
  const parsedEndMinutesRaw = Number(endHours) * 60 + Number(endMinutesPart);
  const parsedDurationHours = Math.round((parsedEndMinutesRaw - parsedStartMinutes) / 60);
  const preferredDurationHours =
    parsedDurationHours > 0 ? parsedDurationHours : normalizedFallbackHours;

  return {
    startMinutes: parsedStartMinutes,
    endMinutes: sanitizeDeclareEndMinutes(
      parsedStartMinutes,
      parsedEndMinutesRaw,
      preferredDurationHours
    )
  };
};

const formatDateTime = (date: Date) => {
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

const formatDateKey = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const isSameMonthAndYear = (date: Date, month: number, year: number) =>
  date.getFullYear() === year && date.getMonth() === month;

const MINI_WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const buildMiniCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const startWeekDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekDay + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startWeekDay + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return null;
    }
    return new Date(year, month, dayNumber);
  });
};

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
const CSV_DELIMITER = ";";
const normalizeCsvValue = (value: string) =>
  value.replace(/[\r\n]+/g, " ").replace(/;/g, ",").trim();
const toCsvContent = (headers: string[], rows: string[][]) => {
  const headerRow = headers.map(normalizeCsvValue).join(CSV_DELIMITER);
  const rowLines = rows.map((row) =>
    row.map((item) => normalizeCsvValue(item)).join(CSV_DELIMITER)
  );
  return ["sep=;", headerRow, ...rowLines].join("\n");
};
const downloadCsvFile = (filename: string, headers: string[], rows: string[][]) => {
  const csvContent = toCsvContent(headers, rows);
  const csvBlob = new Blob([`\ufeff${csvContent}`], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(csvBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  const [eventNotes, setEventNotes] = useState("");
  const [eventEstablishment, setEventEstablishment] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [bulkEventName, setBulkEventName] = useState("");
  const [bulkEventType, setBulkEventType] = useState<EventCategory>(EVENT_CATEGORIES[0]);
  const [bulkEventStartTime, setBulkEventStartTime] = useState(
    EVENT_CATEGORY_META[EVENT_CATEGORIES[0]].startTime
  );
  const [bulkEventNotes, setBulkEventNotes] = useState("");
  const [bulkEventEstablishment, setBulkEventEstablishment] = useState("");
  const [bulkAttendees, setBulkAttendees] = useState<string[]>([]);
  const [isBulkCreateModalOpen, setIsBulkCreateModalOpen] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(today.getMonth());
  const [bulkYear, setBulkYear] = useState(today.getFullYear());
  const [bulkSelectedDateKeys, setBulkSelectedDateKeys] = useState<string[]>([]);
  const [bulkFormStatus, setBulkFormStatus] = useState({
    loading: false,
    error: "",
    success: ""
  });
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
  const [calendarView, setCalendarView] = useState<"monthly" | "weekly">(
    "weekly"
  );
  const [workweekOnly, setWorkweekOnly] = useState(true);
  const [myEventsOnly, setMyEventsOnly] = useState(false);
  const [controlTableEnabled, setControlTableEnabled] = useState(false);
  const [hoursCalculationEnabled, setHoursCalculationEnabled] = useState(false);
  const [viewUserOverride, setViewUserOverride] = useState<string | null>(null);
  const [hoursRefreshToken, setHoursRefreshToken] = useState(0);
  const [hoursSummary, setHoursSummary] = useState({
    obtained: 0,
    declared: 0,
    remaining: 0
  });
  const [hoursStatus, setHoursStatus] = useState({
    loading: false,
    error: "",
    lastUpdated: ""
  });
  const [declaredHoursRecords, setDeclaredHoursRecords] = useState<HorasDeclaradasRecord[]>(
    []
  );
  const [declaredHoursStatus, setDeclaredHoursStatus] = useState({
    loading: false,
    error: ""
  });
  const [editingDeclaredRecord, setEditingDeclaredRecord] =
    useState<HorasDeclaradasRecord | null>(null);
  const [isDeclareHoursModalOpen, setIsDeclareHoursModalOpen] = useState(false);
  const [declareStartMinutes, setDeclareStartMinutes] = useState(
    DECLARE_RANGE_START_MINUTES
  );
  const [declareEndMinutes, setDeclareEndMinutes] = useState(() =>
    deriveDeclareEndMinutes(DECLARE_RANGE_START_MINUTES)
  );
  const [declareHoursReason, setDeclareHoursReason] = useState("");
  const [declareMonth, setDeclareMonth] = useState(today.getMonth());
  const [declareYear, setDeclareYear] = useState(today.getFullYear());
  const [declareSelectedDateKey, setDeclareSelectedDateKey] = useState(
    formatDateKey(today)
  );
  const [declareStatus, setDeclareStatus] = useState({
    loading: false,
    error: "",
    success: ""
  });
  const [weekAnchorDate, setWeekAnchorDate] = useState(today);
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);
  const [establishmentSearch, setEstablishmentSearch] = useState("");
  const [newEstablishmentName, setNewEstablishmentName] = useState("");
  const [isEstablishmentModalOpen, setIsEstablishmentModalOpen] = useState(false);
  const [isAddingEstablishment, setIsAddingEstablishment] = useState(false);
  const [establishmentTarget, setEstablishmentTarget] = useState<
    "create" | "edit" | "bulk" | null
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
    attendees: string[];
    notas: string;
    establecimiento: string;
  };
  type MyEventGroup = {
    event: CalendarEvent;
    attendees: string[];
  };

  const [editForm, setEditForm] = useState<EditFormState>({
    nombre: "",
    eventType: EVENT_CATEGORIES[0],
    fecha: "",
    horaInicio: "",
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
        setBulkEventEstablishment((prev) => (prev ? prev : names[0] ?? ""));
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
  }, [eventType]);

  useEffect(() => {
    const meta = EVENT_CATEGORY_META[bulkEventType];
    setBulkEventStartTime(meta.startTime);
  }, [bulkEventType]);

  useEffect(() => {
    if (!selectedEvent) {
      setEditForm({
        nombre: "",
        eventType: EVENT_CATEGORIES[0],
        fecha: "",
        horaInicio: "",
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
    if (calendarView === "weekly") {
      setWeekAnchorDate((prev) => {
        const next = new Date(prev);
        next.setDate(prev.getDate() - 7);
        return next;
      });
      return;
    }
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarView === "weekly") {
      setWeekAnchorDate((prev) => {
        const next = new Date(prev);
        next.setDate(prev.getDate() + 7);
        return next;
      });
      return;
    }
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleViewModeChange = (view: "monthly" | "weekly") => {
    setCalendarView(view);
    if (view === "weekly") {
      setWeekAnchorDate(selectedDate ?? today);
    }
  };

  const handleMyEventsToggle = () => {
    setMyEventsOnly((prev) => {
      const next = !prev;
      if (next) {
        setViewUserOverride(null);
        setControlTableEnabled(false);
        setHoursCalculationEnabled(false);
      }
      return next;
    });
  };

  const handleControlTableToggle = () => {
    setControlTableEnabled((prev) => {
      const next = !prev;
      if (next) {
        setViewUserOverride(null);
        setMyEventsOnly(false);
        setHoursCalculationEnabled(false);
      }
      return next;
    });
  };

  const triggerHoursRecalculation = useCallback(() => {
    setHoursStatus({
      loading: true,
      error: "",
      lastUpdated: ""
    });
    setHoursRefreshToken((prev) => prev + 1);
  }, []);

  const clearDeclareMessages = useCallback(() => {
    setDeclareStatus((prev) =>
      prev.error || prev.success ? { ...prev, error: "", success: "" } : prev
    );
  }, []);

  const openDeclareHoursModal = () => {
    const baseDate = new Date(today);
    const baseStartMinutes = DECLARE_RANGE_START_MINUTES;
    setEditingDeclaredRecord(null);
    setDeclareStartMinutes(baseStartMinutes);
    setDeclareEndMinutes(deriveDeclareEndMinutes(baseStartMinutes));
    setDeclareHoursReason("");
    setDeclareMonth(baseDate.getMonth());
    setDeclareYear(baseDate.getFullYear());
    setDeclareSelectedDateKey(formatDateKey(baseDate));
    setDeclareStatus({
      loading: false,
      error: "",
      success: ""
    });
    setIsDeclareHoursModalOpen(true);
  };

  const openDeclareHoursModalForEdit = (record: HorasDeclaradasRecord) => {
    const parsedRecordDate = parseDateWithoutTime(record.fechaHorasDeclaradas);
    const baseDate =
      parsedRecordDate && !Number.isNaN(parsedRecordDate.getTime())
        ? parsedRecordDate
        : new Date(today);
    const recordHours = toHorasDeclaradasNumber(record.horasDeclaradas);
    const { startMinutes, endMinutes } = parseDeclareRangeMinutes(
      record.horasDeclaradasRango,
      recordHours
    );

    setEditingDeclaredRecord(record);
    setDeclareStartMinutes(startMinutes);
    setDeclareEndMinutes(endMinutes);
    setDeclareHoursReason(record.motivo ?? "");
    setDeclareMonth(baseDate.getMonth());
    setDeclareYear(baseDate.getFullYear());
    setDeclareSelectedDateKey(formatDateKey(baseDate));
    setDeclareStatus({
      loading: false,
      error: "",
      success: ""
    });
    setIsDeclareHoursModalOpen(true);
  };

  const closeDeclareHoursModal = () => {
    setIsDeclareHoursModalOpen(false);
    setEditingDeclaredRecord(null);
    setDeclareStatus((prev) =>
      prev.loading ? { ...prev, loading: false } : prev
    );
  };

  const handleDeclareReasonChange = (value: string) => {
    setDeclareHoursReason(value.slice(0, MAX_REASON_LENGTH));
    clearDeclareMessages();
  };

  const handleDeclareDateSelect = (date: Date) => {
    setDeclareSelectedDateKey(formatDateKey(date));
    clearDeclareMessages();
  };

  const handleDeclareStartChange = (minutes: number) => {
    const nextStartMinutes = clampDeclareStartMinutes(minutes);
    const preferredDurationHours = Math.max(
      DECLARE_MIN_DURATION_HOURS,
      Math.round((declareEndMinutes - declareStartMinutes) / 60)
    );
    const nextEndMinutes = deriveDeclareEndMinutes(nextStartMinutes, preferredDurationHours);
    setDeclareStartMinutes(nextStartMinutes);
    setDeclareEndMinutes(nextEndMinutes);
    clearDeclareMessages();
  };

  const handleDeclareEndChange = (minutes: number) => {
    const nextEndMinutes = sanitizeDeclareEndMinutes(declareStartMinutes, minutes);
    setDeclareEndMinutes(nextEndMinutes);
    clearDeclareMessages();
  };

  const handleDeclareHoursSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetUser) {
      setDeclareStatus({
        loading: false,
        error: "Necesitas iniciar sesión para declarar horas.",
        success: ""
      });
      return;
    }
    if (!canManageTargetUser) {
      setDeclareStatus({
        loading: false,
        error: "No tienes permisos para declarar horas de este usuario.",
        success: ""
      });
      return;
    }
    if (!declareSelectedDate) {
      setDeclareStatus({
        loading: false,
        error: "Selecciona un día en el calendario.",
        success: ""
      });
      return;
    }
    if (!Number.isFinite(declareStartMinutes) || !Number.isFinite(declareEndMinutes)) {
      setDeclareStatus({
        loading: false,
        error: "Selecciona un rango horario válido.",
        success: ""
      });
      return;
    }

    const sanitizedDeclareStartMinutes = clampDeclareStartMinutes(declareStartMinutes);
    const preferredDurationHours = Math.max(
      DECLARE_MIN_DURATION_HOURS,
      Math.round((declareEndMinutes - declareStartMinutes) / 60)
    );
    const sanitizedDeclareEndMinutes = deriveDeclareEndMinutes(
      sanitizedDeclareStartMinutes,
      preferredDurationHours
    );
    const declaredDurationMinutes = sanitizedDeclareEndMinutes - sanitizedDeclareStartMinutes;

    if (declaredDurationMinutes < DECLARE_MIN_DURATION_MINUTES) {
      setDeclareStatus({
        loading: false,
        error: "Selecciona al menos 1 hora dentro del rango permitido.",
        success: ""
      });
      return;
    }

    if (declaredDurationMinutes > DECLARE_MAX_DURATION_MINUTES) {
      setDeclareStatus({
        loading: false,
        error: "El rango no puede superar las 7 horas.",
        success: ""
      });
      return;
    }

    setDeclareStartMinutes(sanitizedDeclareStartMinutes);
    setDeclareEndMinutes(sanitizedDeclareEndMinutes);
    const sanitizedDeclareHoursValue = declaredDurationMinutes / 60;
    const horasDeclaradasRango = formatDeclareRange(
      sanitizedDeclareStartMinutes,
      sanitizedDeclareEndMinutes
    );

    setDeclareStatus({
      loading: true,
      error: "",
      success: ""
    });

    try {
      const declarationDate = new Date(
        declareSelectedDate.getFullYear(),
        declareSelectedDate.getMonth(),
        declareSelectedDate.getDate(),
        0,
        0,
        0,
        0
      );
      const declarationPayload = {
        horasDeclaradas: sanitizedDeclareHoursValue,
        horasDeclaradasRango,
        motivo: declareHoursReason.trim(),
        fechaHorasDeclaradas: formatDateTime(declarationDate)
      };

      if (editingDeclaredRecord) {
        await updateHorasDeclaradas(editingDeclaredRecord.$id, declarationPayload);
      } else {
        await createHorasDeclaradas({
          user: targetUser,
          ...declarationPayload
        });
      }

      setDeclareStatus({
        loading: false,
        error: "",
        success: editingDeclaredRecord
          ? "Horas declaradas actualizadas correctamente."
          : "Horas declaradas correctamente."
      });
      closeDeclareHoursModal();
      triggerHoursRecalculation();
    } catch (error) {
      setDeclareStatus({
        loading: false,
        error: getErrorMessage(error, "No se pudieron declarar las horas."),
        success: ""
      });
    }
  };

  const handleDeclaredHoursDelete = async (record: HorasDeclaradasRecord) => {
    if (!targetUser || !canManageTargetUser) return;
    const confirmDelete = window.confirm(
      "¿Seguro que quieres eliminar esta declaración de horas?"
    );
    if (!confirmDelete) return;

    setDeclaredHoursStatus({
      loading: true,
      error: ""
    });

    try {
      await deleteHorasDeclaradas(record.$id);
      setDeclaredHoursStatus({
        loading: false,
        error: ""
      });
      triggerHoursRecalculation();
    } catch (error) {
      setDeclaredHoursStatus({
        loading: false,
        error: getErrorMessage(error, "No se pudo eliminar la declaración.")
      });
    }
  };

  const handleHoursCalculationOpen = () => {
    setMyEventsOnly(false);
    setControlTableEnabled(false);
    setHoursCalculationEnabled(true);
    triggerHoursRecalculation();
  };

  const handleHoursCalculationBackToMyEvents = () => {
    setHoursCalculationEnabled(false);
    setMyEventsOnly(true);
  };

  const handleMyEventsBackToCalendar = () => {
    setMyEventsOnly(false);
    setViewUserOverride(null);
  };

  const handleHoursCalculationBackToCalendar = () => {
    setHoursCalculationEnabled(false);
    setMyEventsOnly(false);
    setViewUserOverride(null);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    router.push("/login");
  };

  const getErrorMessage = useCallback(
    (error: unknown, fallback: string) =>
      error instanceof Error && error.message ? error.message : fallback,
    []
  );

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

  const formatHoursValue = (value: number) =>
    value.toLocaleString("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

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

  const formatShortDate = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit"
    });
  };

  const formatDeclaredDay = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const getCategoryLabel = (category?: EventCategory) =>
    category ? EVENT_CATEGORY_META[category]?.label ?? category : "Evento";

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

  const bulkCalendarDays = useMemo(
    () => buildMiniCalendarDays(bulkYear, bulkMonth),
    [bulkMonth, bulkYear]
  );
  const bulkYearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, index) => bulkYear - 3 + index),
    [bulkYear]
  );
  const bulkSelectedDateSet = useMemo(
    () => new Set(bulkSelectedDateKeys),
    [bulkSelectedDateKeys]
  );
  const bulkSelectedDates = useMemo(() => {
    const parsedDates = bulkSelectedDateKeys
      .map((key) => parseDateInput(key))
      .filter((date): date is Date => Boolean(date));
    parsedDates.sort((left, right) => left.getTime() - right.getTime());
    return parsedDates;
  }, [bulkSelectedDateKeys]);

  const declareCalendarDays = useMemo(
    () => buildMiniCalendarDays(declareYear, declareMonth),
    [declareMonth, declareYear]
  );
  const declareYearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, index) => declareYear - 3 + index),
    [declareYear]
  );
  const declareSelectedDate = useMemo(
    () => parseDateInput(declareSelectedDateKey),
    [declareSelectedDateKey]
  );
  const declareFullRange = DECLARE_RANGE_END_MINUTES - DECLARE_RANGE_START_MINUTES;
  const declareStartPercent =
    declareFullRange > 0
      ? clampMinutes(
          ((declareStartMinutes - DECLARE_RANGE_START_MINUTES) / declareFullRange) * 100,
          0,
          100
        )
      : 0;
  const declareEndPercent =
    declareFullRange > 0
      ? clampMinutes(
          ((declareEndMinutes - DECLARE_RANGE_START_MINUTES) / declareFullRange) * 100,
          0,
          100
        )
      : 100;
  const declareSliderStyle = {
    background: `linear-gradient(90deg, rgb(226 232 240) 0%, rgb(226 232 240) ${declareStartPercent}%, rgb(99 102 241) ${declareStartPercent}%, rgb(99 102 241) ${declareEndPercent}%, rgb(226 232 240) ${declareEndPercent}%, rgb(226 232 240) 100%)`
  };
  const { minEndMinutes: declareMinEndMinutes, maxEndMinutes: declareMaxEndMinutes } =
    getDeclareEndBounds(declareStartMinutes);
  const declareDurationMinutes = declareEndMinutes - declareStartMinutes;
  const declareHoursValue = declareDurationMinutes / 60;
  const declareRangeLabel = formatDeclareRange(declareStartMinutes, declareEndMinutes);
  const declareWindowLabel = `${minutesToTimeString(DECLARE_RANGE_START_MINUTES)}-${minutesToTimeString(
    DECLARE_RANGE_END_MINUTES
  )}`;
  const declareLatestStartLabel = minutesToTimeString(DECLARE_START_MAX_MINUTES);
  const declareMinEndLabel = minutesToTimeString(declareMinEndMinutes);
  const declareMaxEndLabel = minutesToTimeString(declareMaxEndMinutes);

  const hoursChartMax = Math.max(hoursSummary.obtained + 10, 10);
  const hoursChartBars = [
    {
      key: "obtained",
      label: "Horas obtenidas",
      value: hoursSummary.obtained,
      tone: "bg-emerald-500",
      surface: "bg-emerald-50 text-emerald-700"
    },
    {
      key: "declared",
      label: "Horas declaradas",
      value: hoursSummary.declared,
      tone: "bg-sky-500",
      surface: "bg-sky-50 text-sky-700"
    }
  ] as const;
  const hoursChartScaleSteps = [0, 0.25, 0.5, 0.75, 1] as const;
  const declaredHoursRows = declaredHoursRecords.map((record) => {
    const hoursValue = toHorasDeclaradasNumber(record.horasDeclaradas);
    return {
      id: record.$id,
      hoursLabel: formatHoursValue(hoursValue),
      rangeLabel: record.horasDeclaradasRango ?? "",
      dayLabel: formatDeclaredDay(record.fechaHorasDeclaradas),
      reasonLabel: record.motivo?.trim() || "—",
      lastUpdatedLabel: formatDisplayDate(record.$updatedAt),
      record
    };
  });

  const handleBulkDateToggle = (date: Date) => {
    const key = formatDateKey(date);
    setBulkSelectedDateKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((value) => value !== key);
      }
      return [...prev, key].sort((left, right) => left.localeCompare(right));
    });
    setBulkFormStatus((prev) =>
      prev.error ? { ...prev, error: "", success: "" } : prev
    );
  };

  const handleExportMyEvents = () => {
    if (myEvents.length === 0) return;
    const userSlug = (targetUser || "usuario").trim().toLowerCase().replace(/\s+/g, "-");
    const headers = [
      "Fecha",
      "Hora inicio",
      "Evento",
      "Tipo",
      "Establecimiento",
      "Notas",
      "Asistentes"
    ];
    const rows = myEvents.map((group) => [
      formatDisplayDate(group.event.fecha),
      formatDisplayTime(group.event.horaInicio),
      group.event.nombre?.trim() || "Evento",
      getCategoryLabel(group.event.eventType),
      group.event.establecimiento?.trim() || "Sin ubicación",
      group.event.notas?.trim() || "Sin notas",
      group.attendees.length > 0 ? group.attendees.join(", ") : "Sin asistentes"
    ]);
    downloadCsvFile(
      `mis-eventos-${userSlug}-${formatDateTime(new Date())}.csv`,
      headers,
      rows
    );
  };

  const handleExportControlTable = () => {
    if (allEvents.length === 0) return;
    const headers = [
      "Usuario",
      "Fecha",
      "Hora inicio",
      "Evento",
      "Tipo",
      "Establecimiento",
      "Notas"
    ];
    const rows = [...allEvents]
      .sort((left, right) => {
        const userCompare = (left.user ?? "").localeCompare(right.user ?? "");
        if (userCompare !== 0) return userCompare;
        const dateCompare = (left.fecha ?? "").localeCompare(right.fecha ?? "");
        if (dateCompare !== 0) return dateCompare;
        return (left.nombre ?? "").localeCompare(right.nombre ?? "");
      })
      .map((event) => [
        event.user?.trim() || "Sin usuario",
        formatDisplayDate(event.fecha),
        formatDisplayTime(event.horaInicio),
        event.nombre?.trim() || "Evento",
        getCategoryLabel(event.eventType),
        event.establecimiento?.trim() || "Sin ubicación",
        event.notas?.trim() || "Sin notas"
      ]);
    downloadCsvFile(
      `tabla-control-${formatDateTime(new Date())}.csv`,
      headers,
      rows
    );
  };

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.user.localeCompare(b.user)),
    [users]
  );
  const userLookup = useMemo(() => {
    const map = new Map<string, UserRecord>();
    sortedUsers.forEach((user) => {
      map.set(user.user, user);
    });
    return map;
  }, [sortedUsers]);
  const availableCreateUsers = useMemo(
    () => sortedUsers.filter((user) => !attendees.includes(user.user)),
    [attendees, sortedUsers]
  );
  const availableBulkUsers = useMemo(
    () => sortedUsers.filter((user) => !bulkAttendees.includes(user.user)),
    [bulkAttendees, sortedUsers]
  );
  const availableEditUsers = useMemo(
    () => sortedUsers.filter((user) => !editForm.attendees.includes(user.user)),
    [editForm.attendees, sortedUsers]
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
  const canCreateEvents = userRole !== "User";
  const canEditDetails = userRole !== "User";
  const showControlTable = userRole === "Admin" || userRole === "Boss";
  const canManageUsers = showControlTable;
  const targetUser = viewUserOverride ?? username ?? "";
  const targetUserHasRecord = targetUser ? validUsernames.has(targetUser) : false;
  const targetUserRecord = targetUserHasRecord ? userLookup.get(targetUser) ?? null : null;
  const canManageTargetUser = Boolean(targetUser) && (targetUser === username || canManageUsers);
  const isViewingAnotherUser = Boolean(targetUser) && Boolean(username) && targetUser !== username;
  const targetUserLabel = targetUser || "Sin usuario";
  const canAccessUserData = useCallback(
    (user: string) => {
      if (!user || !validUsernames.has(user)) return false;
      if (user === username) return true;
      return canManageUsers;
    },
    [canManageUsers, username, validUsernames]
  );
  const resolveViewOverride = useCallback(
    (user: string) => (user === username ? null : user),
    [username]
  );
  const handleControlTableUserMyEvents = useCallback(
    (event: MouseEvent<HTMLButtonElement>, user: string) => {
      event.preventDefault();
      event.stopPropagation();
      if (!canAccessUserData(user)) return;
      setViewUserOverride(resolveViewOverride(user));
      setControlTableEnabled(false);
      setHoursCalculationEnabled(false);
      setMyEventsOnly(true);
    },
    [canAccessUserData, resolveViewOverride]
  );
  const handleControlTableUserHours = useCallback(
    (event: MouseEvent<HTMLButtonElement>, user: string) => {
      event.preventDefault();
      event.stopPropagation();
      if (!canAccessUserData(user)) return;
      setViewUserOverride(resolveViewOverride(user));
      setControlTableEnabled(false);
      setMyEventsOnly(false);
      setHoursCalculationEnabled(true);
      triggerHoursRecalculation();
    },
    [canAccessUserData, resolveViewOverride, triggerHoursRecalculation]
  );

  const handleAddAttendee = (value: string, target: "create" | "edit" | "bulk") => {
    if (!validUsernames.has(value)) return;
    if (target === "create") {
      setAttendees((prev) => (prev.includes(value) ? prev : [...prev, value]));
      return;
    }
    if (target === "bulk") {
      setBulkAttendees((prev) => (prev.includes(value) ? prev : [...prev, value]));
      return;
    }
    setEditForm((prev) => ({
      ...prev,
      attendees: prev.attendees.includes(value)
        ? prev.attendees
        : [...prev.attendees, value]
    }));
  };

  const handleRemoveAttendee = (value: string, target: "create" | "edit" | "bulk") => {
    if (target === "create") {
      setAttendees((prev) => prev.filter((item) => item !== value));
      return;
    }
    if (target === "bulk") {
      setBulkAttendees((prev) => prev.filter((item) => item !== value));
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
  const invalidBulkAttendees = useMemo(
    () => bulkAttendees.filter((attendee) => !validUsernames.has(attendee)),
    [bulkAttendees, validUsernames]
  );
  const invalidEditAttendees = useMemo(
    () => editForm.attendees.filter((attendee) => !validUsernames.has(attendee)),
    [editForm.attendees, validUsernames]
  );

  const openEstablishmentModal = (target: "create" | "edit" | "bulk") => {
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
    } else if (establishmentTarget === "bulk") {
      setBulkEventEstablishment(name);
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
    if (userRole === "User") {
      setFormStatus({
        loading: false,
        error: "No tienes permisos para crear eventos.",
        success: ""
      });
      return;
    }
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
      if (Number.isNaN(startDate.getTime())) {
        setFormStatus({
          loading: false,
          error: "Las horas indicadas no son válidas.",
          success: ""
        });
        return;
      }
      const duration = 0;

      await createEventsForAttendees({
        nombre: trimmedName,
        eventType,
        attendees: attendeeList,
        fecha: formatDateTime(startDate),
        horaInicio: formatDateTime(startDate),
        horaFin: formatDateTime(startDate),
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

  const handleBulkCreateEvents = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (userRole === "User") {
      setBulkFormStatus({
        loading: false,
        error: "No tienes permisos para crear eventos.",
        success: ""
      });
      return;
    }
    const trimmedName = bulkEventName.trim();
    const attendeeList = bulkAttendees;
    const dateList = bulkSelectedDates;

    if (!trimmedName) {
      setBulkFormStatus({
        loading: false,
        error: "Indica el nombre del evento.",
        success: ""
      });
      return;
    }

    if (dateList.length === 0) {
      setBulkFormStatus({
        loading: false,
        error: "Selecciona al menos un día en el calendario.",
        success: ""
      });
      return;
    }

    if (usersLoading) {
      setBulkFormStatus({
        loading: false,
        error: "Estamos cargando los usuarios disponibles.",
        success: ""
      });
      return;
    }

    if (usersError || validUsernames.size === 0) {
      setBulkFormStatus({
        loading: false,
        error: "No hay usuarios disponibles para asignar asistentes.",
        success: ""
      });
      return;
    }

    if (attendeeList.length === 0) {
      setBulkFormStatus({
        loading: false,
        error: "Agrega al menos un asistente.",
        success: ""
      });
      return;
    }

    if (invalidBulkAttendees.length > 0) {
      setBulkFormStatus({
        loading: false,
        error: "Hay asistentes que no existen en la tabla de usuarios.",
        success: ""
      });
      return;
    }

    if (!bulkEventStartTime) {
      setBulkFormStatus({
        loading: false,
        error: "Indica la hora de inicio.",
        success: ""
      });
      return;
    }

    if (!bulkEventEstablishment) {
      setBulkFormStatus({
        loading: false,
        error: "Selecciona un establecimiento.",
        success: ""
      });
      return;
    }

    const hasInvalidDates = dateList.some((date) =>
      Number.isNaN(buildEventDateTime(date, bulkEventStartTime).getTime())
    );
    if (hasInvalidDates) {
      setBulkFormStatus({
        loading: false,
        error: "Las horas indicadas no son válidas.",
        success: ""
      });
      return;
    }

    setBulkFormStatus({ loading: true, error: "", success: "" });
    try {
      const duration = 0;
      await Promise.all(
        dateList.map((date) => {
          const startDate = buildEventDateTime(date, bulkEventStartTime);
          const isoDate = formatDateTime(startDate);
          return createEventsForAttendees({
            nombre: trimmedName,
            eventType: bulkEventType,
            attendees: attendeeList,
            fecha: isoDate,
            horaInicio: isoDate,
            horaFin: isoDate,
            duration,
            notas: bulkEventNotes.trim(),
            establecimiento: bulkEventEstablishment
          });
        })
      );

      const totalEvents = dateList.length * attendeeList.length;
      setBulkEventName("");
      setBulkAttendees([]);
      setBulkEventNotes("");
      setBulkSelectedDateKeys([]);
      setBulkFormStatus({
        loading: false,
        error: "",
        success: `${totalEvents} eventos creados correctamente.`
      });
      setIsBulkCreateModalOpen(false);
      await loadAllEvents();
    } catch (err) {
      setBulkFormStatus({
        loading: false,
        error: "No se pudieron crear los eventos.",
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
    if (userRole === "User") {
      return;
    }
    setSelectedDate(date);
    setFormStatus({ loading: false, error: "", success: "" });
    const meta = EVENT_CATEGORY_META[eventType];
    setEventStartTime(meta.startTime);
    setAttendees([]);
    setIsCreateModalOpen(true);
    setIsDayDetailModalOpen(false);
  };

  const handleOpenCreateModal = () => {
    if (userRole === "User") return;
    const baseDate = selectedDate ?? today;
    setCurrentMonth(baseDate.getMonth());
    setCurrentYear(baseDate.getFullYear());
    handleAddEvent(baseDate);
  };

  const handleOpenBulkCreateModal = () => {
    if (userRole === "User") return;
    const baseDate = selectedDate ?? today;
    setBulkMonth(baseDate.getMonth());
    setBulkYear(baseDate.getFullYear());
    setBulkSelectedDateKeys([]);
    setBulkFormStatus({ loading: false, error: "", success: "" });
    setIsBulkCreateModalOpen(true);
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

  const closeBulkCreateModal = () => {
    setIsBulkCreateModalOpen(false);
    setBulkFormStatus({ loading: false, error: "", success: "" });
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

    const canEditDetails = userRole !== "User";
    const trimmedName = editForm.nombre.trim();
    const attendeeList = editForm.attendees;
    const selectedDateValue = canEditDetails
      ? parseDateInput(editForm.fecha)
      : parseDateWithoutTime(selectedEvent.fecha);
    const startTimeValue = canEditDetails
      ? editForm.horaInicio
      : formatTimeInput(selectedEvent.horaInicio);
    const selectedEventName = selectedEvent.nombre ?? "";
    const selectedEventNotes = selectedEvent.notas?.trim() ?? "";
    const selectedEventEstablishment = selectedEvent.establecimiento ?? "";

    if (canEditDetails && !trimmedName) {
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

    if (!startTimeValue) {
      setEditStatus({
        loading: false,
        error: "Indica la hora de inicio.",
        success: ""
      });
      return;
    }
    const establishmentValue = canEditDetails
      ? editForm.establecimiento
      : selectedEventEstablishment;
    if (!establishmentValue) {
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

    const startDate = buildEventDateTime(selectedDateValue, startTimeValue);
    if (Number.isNaN(startDate.getTime())) {
      setEditStatus({
        loading: false,
        error: "Las horas indicadas no son válidas.",
        success: ""
      });
      return;
    }

    setEditStatus({ loading: true, error: "", success: "" });
    try {
      const payload = {
        nombre: canEditDetails ? trimmedName : selectedEventName,
        eventType: canEditDetails ? editForm.eventType : selectedEvent.eventType,
        fecha: formatDateTime(startDate),
        horaInicio: formatDateTime(startDate),
        horaFin: formatDateTime(startDate),
        duration: 0,
        notas: canEditDetails ? editForm.notas.trim() : selectedEventNotes,
        establecimiento: establishmentValue
      };

      const groupedEvents = allEvents.filter(
        (eventItem) =>
          eventItem.nombre === selectedEvent.nombre &&
          eventItem.eventType === selectedEvent.eventType &&
          eventItem.fecha === selectedEvent.fecha &&
          eventItem.horaInicio === selectedEvent.horaInicio
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

  const currentUserRecord = targetUserRecord;

  const calendarEvents = useMemo(
    () =>
      allEvents.filter((eventItem) => {
        const eventDate = parseDateWithoutTime(eventItem.fecha);
        if (!eventDate) return false;
        return isSameMonthAndYear(eventDate, currentMonth, currentYear);
      }),
    [allEvents, currentMonth, currentYear]
  );

  const myEvents = useMemo(() => {
    const grouped = new Map<string, MyEventGroup>();

    allEvents.forEach((eventItem) => {
      if (!eventItem.fecha) return;
      const eventDate = parseDateWithoutTime(eventItem.fecha);
      if (!eventDate) return;
      const key = [
        `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`,
        eventItem.nombre ?? "",
        eventItem.eventType ?? "",
        eventItem.horaInicio ?? ""
      ].join("|");
      const existing = grouped.get(key);
      if (existing) {
        if (eventItem.user && !existing.attendees.includes(eventItem.user)) {
          existing.attendees.push(eventItem.user);
        }
        return;
      }
      grouped.set(key, {
        event: eventItem,
        attendees: eventItem.user ? [eventItem.user] : []
      });
    });

    return Array.from(grouped.values())
      .filter((group) => Boolean(targetUser) && group.attendees.includes(targetUser))
      .sort((a, b) => {
        const leftDate = new Date(
          a.event.horaInicio ?? a.event.fecha ?? ""
        ).getTime();
        const rightDate = new Date(
          b.event.horaInicio ?? b.event.fecha ?? ""
        ).getTime();
        if (leftDate !== rightDate) return leftDate - rightDate;
        return (a.event.nombre ?? "").localeCompare(b.event.nombre ?? "");
      });
  }, [allEvents, targetUser]);

  const obtainedHours = useMemo(() => myEvents.length * HOURS_PER_EVENT, [myEvents]);

  const myEventsByYear = useMemo(() => {
    const yearMap = new Map<number, Map<number, MyEventGroup[]>>();

    myEvents.forEach((group) => {
      const eventDate = parseDateWithoutTime(group.event.fecha);
      if (!eventDate) return;
      const year = eventDate.getFullYear();
      const month = eventDate.getMonth();
      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }
      const monthMap = yearMap.get(year);
      if (!monthMap) return;
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)?.push(group);
    });

    return Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, monthsMap]) => ({
        year,
        months: Array.from(monthsMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([month, events]) => ({
            month,
            events
          }))
      }));
  }, [myEvents]);

  useEffect(() => {
    if (!hoursCalculationEnabled || !targetUser) return;
    if (usersLoading || allEventsLoading) return;
    if (!currentUserRecord) {
      setDeclaredHoursRecords([]);
      setDeclaredHoursStatus({
        loading: false,
        error: ""
      });
      setHoursStatus({
        loading: false,
        error: `No se encontró el usuario ${targetUserLabel} para calcular las horas.`,
        lastUpdated: ""
      });
      return;
    }

    let cancelled = false;

    const calculateHours = async () => {
      setHoursStatus({
        loading: true,
        error: "",
        lastUpdated: ""
      });
      setDeclaredHoursStatus({
        loading: true,
        error: ""
      });
      try {
        const declarations = await fetchHorasDeclaradasForUser(targetUser);
        if (cancelled) return;
        const sortedDeclarations = [...declarations].sort((a, b) => {
          const updatedAtDiff =
            new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime();
          if (updatedAtDiff !== 0) return updatedAtDiff;
          return (
            new Date(b.fechaHorasDeclaradas ?? 0).getTime() -
            new Date(a.fechaHorasDeclaradas ?? 0).getTime()
          );
        });
        const declaredHours = sortedDeclarations.reduce(
          (total, document) => total + toHorasDeclaradasNumber(document.horasDeclaradas),
          0
        );
        const remainingHours = obtainedHours - declaredHours;

        const storedObtainedHours = parseHorasObtenidas(currentUserRecord.horasObtenidas);

        if (canManageTargetUser && storedObtainedHours !== obtainedHours) {
          await updateUserHorasObtenidas(currentUserRecord.$id, obtainedHours);
          if (cancelled) return;
          setUsers((prev) =>
            prev.map((userItem) =>
              userItem.$id === currentUserRecord.$id
                ? { ...userItem, horasObtenidas: obtainedHours }
                : userItem
            )
          );
        }

        setHoursSummary({
          obtained: obtainedHours,
          declared: declaredHours,
          remaining: remainingHours
        });
        setDeclaredHoursRecords(sortedDeclarations);
        setDeclaredHoursStatus({
          loading: false,
          error: ""
        });
        setHoursStatus({
          loading: false,
          error: "",
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        if (cancelled) return;
        setDeclaredHoursStatus({
          loading: false,
          error: getErrorMessage(error, "No se pudieron cargar las horas declaradas.")
        });
        setHoursStatus({
          loading: false,
          error: getErrorMessage(error, "No se pudieron calcular las horas."),
          lastUpdated: ""
        });
      }
    };

    calculateHours();

    return () => {
      cancelled = true;
    };
  }, [
    allEventsLoading,
    canManageTargetUser,
    currentUserRecord,
    getErrorMessage,
    hoursCalculationEnabled,
    hoursRefreshToken,
    obtainedHours,
    targetUser,
    targetUserLabel,
    usersLoading
  ]);

  const controlTableByUser = useMemo(() => {
    const userMap = new Map<
      string,
      Map<number | null, Map<number | null, CalendarEvent[]>>
    >();

    allEvents.forEach((event) => {
      const userLabel = event.user?.trim() || "Sin usuario";
      const parsedDate = parseDateWithoutTime(event.fecha);
      const year = parsedDate ? parsedDate.getFullYear() : null;
      const month = parsedDate ? parsedDate.getMonth() : null;
      if (!userMap.has(userLabel)) {
        userMap.set(userLabel, new Map());
      }
      const yearMap = userMap.get(userLabel);
      if (!yearMap) return;
      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }
      const monthMap = yearMap.get(year);
      if (!monthMap) return;
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)?.push(event);
    });

    const sortNullableNumber = (left: number | null, right: number | null) => {
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return left - right;
    };

    return Array.from(userMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([user, yearsMap]) => ({
        user,
        years: Array.from(yearsMap.entries())
          .sort((a, b) => sortNullableNumber(a[0], b[0]))
          .map(([year, monthsMap]) => ({
            year,
            months: Array.from(monthsMap.entries())
              .sort((a, b) => sortNullableNumber(a[0], b[0]))
              .map(([month, events]) => ({
                month,
                events
              }))
          }))
      }));
  }, [allEvents]);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex justify-end">
          <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-2 shadow-soft backdrop-blur">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Sesión activa
              </p>
              <div className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-800">
                <span>{username ? `Hola, ${username}` : "Cargando..."}</span>
                {userRole ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {userRole}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
            >
              Cerrar sesión
            </button>
          </div>
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
        ) : hoursCalculationEnabled ? (
          <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-semibold text-slate-900">
                  <HourglassModuleIcon title="" className="h-8 w-8" />
                  <span>Cálculo de horas</span>
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recuento automático: cada evento asistido suma {HOURS_PER_EVENT}{" "}
                  horas y se guarda en el perfil del usuario seleccionado.
                </p>
                {targetUser ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-500">
                    Usuario: {targetUserLabel}
                  </p>
                ) : null}
                {isViewingAnotherUser ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Estás consultando el detalle de otro usuario.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={triggerHoursRecalculation}
                  disabled={hoursStatus.loading}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${
                    hoursStatus.loading
                      ? "cursor-not-allowed border-slate-200 bg-slate-300"
                      : "border-amber-200 bg-amber-500 hover:-translate-y-0.5 hover:bg-amber-600"
                  }`}
                >
                  <HourglassModuleIcon title="" className="h-4 w-4" />
                  {hoursStatus.loading ? "Recalculando..." : "Recalcular"}
                </button>
                <button
                  type="button"
                  onClick={openDeclareHoursModal}
                  className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-600"
                >
                  <HourglassModuleIcon title="" className="h-4 w-4" />
                  Declarar horas
                </button>
                <button
                  type="button"
                  onClick={handleHoursCalculationBackToMyEvents}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <PersonModuleIcon title="" className="h-4 w-4" />
                  Volver a mis eventos
                </button>
                <button
                  type="button"
                  onClick={handleHoursCalculationBackToCalendar}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <CalendarModuleIcon title="" className="h-4 w-4" />
                  Volver al calendario
                </button>
              </div>
            </div>

            {hoursStatus.error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {hoursStatus.error}
              </div>
            ) : null}

            {hoursStatus.loading ? (
              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-600">
                Recalculando horas y actualizando el usuario seleccionado...
              </div>
            ) : hoursStatus.lastUpdated ? (
              <p className="mt-4 text-xs text-slate-400">
                Última actualización:{" "}
                {new Date(hoursStatus.lastUpdated).toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <article className="flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Horas obtenidas
                </p>
                <p className="text-3xl font-semibold text-emerald-700">
                  {formatHoursValue(hoursSummary.obtained)}
                </p>
                <p className="text-xs text-emerald-600/80">
                  {myEvents.length} eventos × {HOURS_PER_EVENT} horas
                </p>
              </article>
              <article className="flex flex-col gap-2 rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                  Horas declaradas
                </p>
                <p className="text-3xl font-semibold text-sky-700">
                  {formatHoursValue(hoursSummary.declared)}
                </p>
                <p className="text-xs text-sky-600/80">
                  Suma de los registros en horasDeclaradas
                </p>
              </article>
              <article className="flex flex-col gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  Horas restantes
                </p>
                <p
                  className={`text-3xl font-semibold ${
                    hoursSummary.remaining < 0 ? "text-rose-600" : "text-indigo-700"
                  }`}
                >
                  {formatHoursValue(hoursSummary.remaining)}
                </p>
                <p className="text-xs text-indigo-600/80">
                  Horas obtenidas − horas declaradas
                </p>
              </article>
            </div>

            <div className="mt-8 rounded-[32px] border border-slate-200/80 bg-white/80 p-6 shadow-inner">
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Comparativa de horas
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Visualiza las horas obtenidas frente a las horas declaradas.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="relative h-[360px] rounded-[28px] border border-slate-100 bg-gradient-to-b from-white via-white to-slate-50/80 px-6 pb-8 pt-6">
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 pb-8 pt-6">
                    {hoursChartScaleSteps.map((step) => {
                      const scaleValue = hoursChartMax * step;
                      return (
                        <div
                          key={`hours-scale-${step}`}
                          className="flex items-center gap-3"
                        >
                          <div className="h-px flex-1 border-t border-dashed border-slate-200/80" />
                          <span className="w-16 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {formatHoursValue(scaleValue)}h
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative flex h-full items-end justify-center gap-12 pb-2">
                    {hoursChartBars.map((bar) => {
                      const ratio =
                        hoursChartMax === 0 ? 0 : Math.min(1, bar.value / hoursChartMax);
                      const barHeight = bar.value <= 0 ? 0 : Math.max(12, ratio * 100);

                      return (
                        <div key={bar.key} className="flex w-40 flex-col items-center gap-4">
                          <div className="relative flex h-[260px] w-28 items-end">
                            <div className="absolute inset-0 rounded-[32px] border border-slate-200/80 bg-slate-100/80 shadow-inner" />
                            {bar.value > 0 ? (
                              <div
                                className={`relative w-full rounded-[28px] ${bar.tone} shadow-[0_22px_35px_-22px_rgba(15,23,42,0.65)] transition-all duration-500`}
                                style={{ height: `${barHeight}%` }}
                              >
                                <div
                                  className="absolute left-1/2 -translate-x-1/2"
                                  style={{ bottom: "calc(100% + 0.75rem)" }}
                                >
                                  <span
                                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${bar.surface}`}
                                  >
                                    {formatHoursValue(bar.value)} h
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="relative h-3 w-full rounded-full bg-slate-300/80" />
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-1 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                              {bar.label}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              {formatHoursValue(bar.value)} h
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">
                      Horas declaradas
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Día, horas declaradas y estado de cada registro.
                    </p>
                  </div>
                  {declaredHoursStatus.loading ? (
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actualizando...
                    </div>
                  ) : null}
                </div>

                {declaredHoursStatus.error ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {declaredHoursStatus.error}
                  </div>
                ) : null}

                {declaredHoursRows.length === 0 && !declaredHoursStatus.loading ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                    Aún no has declarado horas.
                  </div>
                ) : declaredHoursRows.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Día</th>
                            <th className="px-4 py-3 text-left font-semibold">Nº de horas</th>
                            <th className="px-4 py-3 text-left font-semibold">Motivo</th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Fecha del último cambio
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {declaredHoursRows.map((row) => (
                            <tr key={row.id} className="align-top">
                              <td className="px-4 py-4 font-semibold text-slate-700">
                                {row.dayLabel}
                              </td>
                              <td className="px-4 py-4 text-slate-700">
                                <div className="flex flex-col">
                                  <span className="font-semibold">{row.hoursLabel} h</span>
                                  {row.rangeLabel ? (
                                    <span className="text-xs text-slate-400">
                                      {row.rangeLabel}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-600">{row.reasonLabel}</td>
                              <td className="px-4 py-4 text-slate-500">
                                {row.lastUpdatedLabel}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openDeclareHoursModalForEdit(row.record)}
                                    disabled={declaredHoursStatus.loading}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                      declaredHoursStatus.loading
                                        ? "cursor-not-allowed border-slate-200 text-slate-400"
                                        : "border-indigo-200 text-indigo-600 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50"
                                    }`}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeclaredHoursDelete(row.record)}
                                    disabled={declaredHoursStatus.loading}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                      declaredHoursStatus.loading
                                        ? "cursor-not-allowed border-slate-200 text-slate-400"
                                        : "border-rose-200 text-rose-600 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50"
                                    }`}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : myEventsOnly ? (
          <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-semibold text-slate-900">
                  <PersonModuleIcon title="" className="h-8 w-8" />
                  <span>Mis eventos</span>
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Resumen organizado por año y mes de los eventos en los que
                  está inscrito el usuario seleccionado.
                </p>
                {targetUser ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-500">
                    Usuario: {targetUserLabel}
                  </p>
                ) : null}
                {isViewingAnotherUser ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Estás consultando el detalle de otro usuario.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMyEvents}
                  disabled={myEvents.length === 0}
                  className={`flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition ${
                    myEvents.length === 0
                      ? "cursor-not-allowed opacity-60"
                      : "hover:border-emerald-200 hover:text-emerald-600"
                  }`}
                >
                  <TableModuleIcon title="" className="h-4 w-4" />
                  Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={handleHoursCalculationOpen}
                  className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-600"
                >
                  <HourglassModuleIcon title="" className="h-4 w-4" />
                  Cálculo de horas
                </button>
                <button
                  type="button"
                  onClick={handleMyEventsBackToCalendar}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <CalendarModuleIcon title="" className="h-4 w-4" />
                  Volver al calendario
                </button>
              </div>
            </div>

            {myEvents.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
                {targetUser
                  ? `No hay eventos asignados para ${targetUserLabel}.`
                  : "No tienes eventos asignados."}
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                {myEventsByYear.map((yearGroup) => (
                  <details
                    key={yearGroup.year}
                    className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm"
                    open={yearGroup.year === currentYear ? true : undefined}
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                      <span className="flex items-center justify-between">
                        <span>{yearGroup.year}</span>
                        <span className="text-xs text-slate-400">
                          {yearGroup.months.reduce(
                            (total, monthGroup) =>
                              total + monthGroup.events.length,
                            0
                          )}{" "}
                          eventos
                        </span>
                      </span>
                    </summary>
                    <div className="mt-4 flex flex-col gap-3">
                      {yearGroup.months.map((monthGroup) => (
                        <details
                          key={`${yearGroup.year}-${monthGroup.month}`}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                          open={
                            yearGroup.year === currentYear &&
                            monthGroup.month === currentMonth
                              ? true
                              : undefined
                          }
                        >
                          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-600">
                            <span className="flex items-center justify-between">
                              <span>{MONTH_NAMES[monthGroup.month]}</span>
                              <span className="text-xs text-slate-400">
                                {monthGroup.events.length} eventos
                              </span>
                            </span>
                          </summary>
                          <div className="mt-3 flex flex-col gap-3">
                            {monthGroup.events.map((group) => {
                              const meta = EVENT_CATEGORY_META[
                                group.event.eventType
                              ] ?? {
                                label: "Evento",
                                dotClass: "bg-slate-300",
                                cardClass: "bg-slate-100 text-slate-600 border-slate-200"
                              };
                              return (
                                <details
                                  key={group.event.$id}
                                  className={`rounded-2xl border px-4 py-3 ${meta.cardClass}`}
                                >
                                  <summary className="cursor-pointer list-none text-sm font-semibold">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`}
                                        aria-hidden="true"
                                      />
                                      <span className="text-slate-900">
                                        {group.event.nombre || "Evento"}
                                      </span>
                                      <span className="text-slate-500">·</span>
                                      <span className="text-slate-600">
                                        {meta.label}
                                      </span>
                                      <span className="text-slate-500">·</span>
                                      <span className="text-slate-600">
                                        {formatShortDate(group.event.fecha)}
                                      </span>
                                      <span className="text-slate-500">·</span>
                                      <span className="text-slate-600">
                                        {formatDisplayTime(group.event.horaInicio)}
                                      </span>
                                    </div>
                                  </summary>
                                  <div className="mt-3 grid gap-2 text-xs text-slate-600">
                                    <div className="flex flex-wrap gap-2">
                                      <span className="font-semibold text-slate-500">
                                        Fecha:
                                      </span>
                                      <span>
                                        {formatDisplayDate(group.event.fecha)}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <span className="font-semibold text-slate-500">
                                        Inicio:
                                      </span>
                                      <span>
                                        {formatDisplayTime(group.event.horaInicio)}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <span className="font-semibold text-slate-500">
                                        Establecimiento:
                                      </span>
                                      <span>
                                        {group.event.establecimiento?.trim() ||
                                          "Sin ubicación"}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <span className="font-semibold text-slate-500">
                                        Notas:
                                      </span>
                                      <span>
                                        {group.event.notas?.trim() || "Sin notas"}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <span className="font-semibold text-slate-500">
                                        Asistentes:
                                      </span>
                                      <span>
                                        {group.attendees.length > 0
                                          ? group.attendees.join(", ")
                                          : "Sin asistentes"}
                                      </span>
                                    </div>
                                  </div>
                                </details>
                              );
                            })}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        ) : controlTableEnabled ? (
          <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-semibold text-slate-900">
                  <TableModuleIcon title="" className="h-8 w-8" />
                  <span>Tabla de control</span>
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Resumen agrupado por usuario, año y mes de todos los eventos
                  registrados.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportControlTable}
                  disabled={allEvents.length === 0}
                  className={`flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition ${
                    allEvents.length === 0
                      ? "cursor-not-allowed opacity-60"
                      : "hover:border-emerald-200 hover:text-emerald-600"
                  }`}
                >
                  <TableModuleIcon title="" className="h-4 w-4" />
                  Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setControlTableEnabled(false);
                    setViewUserOverride(null);
                  }}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <CalendarModuleIcon title="" className="h-4 w-4" />
                  Volver al calendario
                </button>
              </div>
            </div>

            {allEventsError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {allEventsError}
              </div>
            ) : null}

            {controlTableByUser.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
                No hay eventos registrados.
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                {controlTableByUser.map((userGroup) => {
                  const userCanNavigate = canAccessUserData(userGroup.user);
                  const actionButtonBaseClass =
                    "flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition";
                  const actionButtonClass = userCanNavigate
                    ? `${actionButtonBaseClass} border-white/60 bg-white/80 text-slate-600 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600`
                    : `${actionButtonBaseClass} cursor-not-allowed border-slate-200/80 bg-white/70 text-slate-300 opacity-70`;

                  return (
                    <details
                      key={userGroup.user}
                      className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm"
                    >
                      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                        <span className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(event) =>
                                  handleControlTableUserMyEvents(event, userGroup.user)
                                }
                                className={actionButtonClass}
                                disabled={!userCanNavigate}
                                title={
                                  userCanNavigate
                                    ? "Abrir Mis eventos"
                                    : "No disponible para este usuario"
                                }
                                aria-label="Abrir Mis eventos"
                              >
                                <PersonModuleIcon title="" className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) =>
                                  handleControlTableUserHours(event, userGroup.user)
                                }
                                className={actionButtonClass}
                                disabled={!userCanNavigate}
                                title={
                                  userCanNavigate
                                    ? "Abrir Cálculo de horas"
                                    : "No disponible para este usuario"
                                }
                                aria-label="Abrir Cálculo de horas"
                              >
                                <HourglassModuleIcon title="" className="h-4 w-4" />
                              </button>
                            </span>
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${getUserColor(userGroup.user).dotClass}`}
                              aria-hidden="true"
                            />
                            <span>{userGroup.user}</span>
                          </span>
                          <span className="text-xs text-slate-400">
                            {userGroup.years.reduce(
                              (total, yearGroup) =>
                                total +
                                yearGroup.months.reduce(
                                  (monthTotal, monthGroup) =>
                                    monthTotal + monthGroup.events.length,
                                  0
                                ),
                              0
                            )}{" "}
                            eventos
                          </span>
                        </span>
                      </summary>
                      <div className="mt-4 flex flex-col gap-3">
                        {userGroup.years.map((yearGroup) => (
                          <details
                            key={`${userGroup.user}-${yearGroup.year ?? "sin-anio"}`}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-600">
                              <span className="flex items-center justify-between">
                                <span>{yearGroup.year ?? "Sin año"}</span>
                                <span className="text-xs text-slate-400">
                                  {yearGroup.months.reduce(
                                    (monthTotal, monthGroup) =>
                                      monthTotal + monthGroup.events.length,
                                    0
                                  )}{" "}
                                  eventos
                                </span>
                              </span>
                            </summary>
                            <div className="mt-3 flex flex-col gap-3">
                              {yearGroup.months.map((monthGroup) => (
                                <details
                                  key={`${userGroup.user}-${yearGroup.year ?? "sin-anio"}-${
                                    monthGroup.month ?? "sin-mes"
                                  }`}
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                >
                                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-600">
                                    <span className="flex items-center justify-between">
                                      <span>
                                        {monthGroup.month === null
                                          ? "Sin mes"
                                          : MONTH_NAMES[monthGroup.month]}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {monthGroup.events.length} eventos
                                      </span>
                                    </span>
                                  </summary>
                                  <div className="mt-3 flex flex-col gap-3">
                                    {monthGroup.events.map((event) => {
                                      const meta = EVENT_CATEGORY_META[
                                        event.eventType
                                      ] ?? {
                                        label: "Evento",
                                        dotClass: "bg-slate-300",
                                        cardClass:
                                          "bg-slate-100 text-slate-600 border-slate-200"
                                      };
                                      return (
                                        <details
                                          key={event.$id}
                                          className={`rounded-2xl border px-4 py-3 ${meta.cardClass}`}
                                        >
                                          <summary className="cursor-pointer list-none text-sm font-semibold">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span
                                                className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`}
                                                aria-hidden="true"
                                              />
                                              <span className="text-slate-900">
                                                {event.nombre || "Evento"}
                                              </span>
                                              <span className="text-slate-500">·</span>
                                              <span className="text-slate-600">
                                                {meta.label}
                                              </span>
                                              <span className="text-slate-500">·</span>
                                              <span className="text-slate-600">
                                                {formatShortDate(event.fecha)}
                                              </span>
                                              <span className="text-slate-500">·</span>
                                              <span className="text-slate-600">
                                                {formatDisplayTime(event.horaInicio)}
                                              </span>
                                            </div>
                                          </summary>
                                          <div className="mt-3 grid gap-2 text-xs text-slate-600">
                                            <div className="flex flex-wrap gap-2">
                                              <span className="font-semibold text-slate-500">
                                                Fecha:
                                              </span>
                                              <span>{formatDisplayDate(event.fecha)}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              <span className="font-semibold text-slate-500">
                                                Inicio:
                                              </span>
                                              <span>
                                                {formatDisplayTime(event.horaInicio)}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              <span className="font-semibold text-slate-500">
                                                Establecimiento:
                                              </span>
                                              <span>
                                                {event.establecimiento?.trim() ||
                                                  "Sin ubicación"}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              <span className="font-semibold text-slate-500">
                                                Notas:
                                              </span>
                                              <span>
                                                {event.notas?.trim() || "Sin notas"}
                                              </span>
                                            </div>
                                          </div>
                                        </details>
                                      );
                                    })}
                                  </div>
                                </details>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <Calendar
            currentMonth={currentMonth}
            currentYear={currentYear}
            events={calendarEvents}
            selectedDate={selectedDate}
            activeCategory={activeCategory}
            viewMode={calendarView}
            onViewModeChange={handleViewModeChange}
            workweekOnly={workweekOnly}
            onWorkweekToggle={() => setWorkweekOnly((prev) => !prev)}
            myEventsOnly={myEventsOnly}
            onMyEventsToggle={handleMyEventsToggle}
            weekAnchorDate={weekAnchorDate}
            controlTableEnabled={controlTableEnabled}
            onControlTableToggle={handleControlTableToggle}
            showControlTableToggle={showControlTable}
            allowAddEvent={canCreateEvents}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onMonthChange={setCurrentMonth}
            onYearChange={setCurrentYear}
            onDaySelect={handleDaySelect}
            onAddEvent={handleAddEvent}
            onOpenCreateModal={handleOpenCreateModal}
            onOpenBulkCreateModal={handleOpenBulkCreateModal}
            onEventSelect={handleEventSelect}
            onCategoryToggle={handleCategoryToggle}
          />
        )}

        {showControlTable &&
        !myEventsOnly &&
        !controlTableEnabled &&
        !hoursCalculationEnabled ? (
          <div className="flex items-center justify-end text-xs text-slate-400">
            Usa el botón &quot;Tabla de control&quot; para ver el resumen agrupado.
          </div>
        ) : null}
      </div>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-10 backdrop-blur-sm transition ${
          isDeclareHoursModalOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDeclareHoursModal}
      >
        <div
          className={`max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-soft transition ${
            isDeclareHoursModalOpen ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                {editingDeclaredRecord ? "Editar horas declaradas" : "Declarar horas"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {editingDeclaredRecord
                  ? "Actualiza el rango horario y el motivo de la declaración."
                  : `Selecciona inicio (cada 30 min) y fin en horas enteras desde el inicio dentro de la ventana diaria, con un máximo de ${MAX_DECLARABLE_HOURS} h.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {declareSelectedDate ? (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {declareSelectedDate.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  })}
                </span>
              ) : null}
              <button
                type="button"
                onClick={closeDeclareHoursModal}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>

          <form className="mt-6 flex flex-col gap-6" onSubmit={handleDeclareHoursSubmit}>
            <section className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                    Horas declaradas
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-indigo-700">
                    {formatHoursValue(declareHoursValue)} h
                  </p>
                  <p className="mt-1 text-xs font-semibold text-indigo-500">
                    Rango: {declareRangeLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-white/80 px-4 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Ventana diaria
                  </p>
                  <p className="text-lg font-semibold text-slate-700">
                    {declareWindowLabel}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Inicio {minutesToTimeString(declareStartMinutes)}</span>
                  <span>Fin {minutesToTimeString(declareEndMinutes)}</span>
                </div>
                <div className="relative mt-2">
                  <div
                    style={declareSliderStyle}
                    className="h-3 w-full rounded-full border border-indigo-100 bg-slate-200/80"
                  />
                  <input
                    type="range"
                    min={DECLARE_RANGE_START_MINUTES}
                    max={DECLARE_START_MAX_MINUTES}
                    step={DECLARE_START_STEP_MINUTES}
                    value={declareStartMinutes}
                    onChange={(event) => handleDeclareStartChange(Number(event.target.value))}
                    aria-label="Hora de inicio"
                    className="pointer-events-none absolute inset-0 h-3 w-full cursor-pointer appearance-none bg-transparent accent-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/80 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition hover:[&::-webkit-slider-thumb]:scale-105 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white/80 [&::-moz-range-thumb]:bg-indigo-500 [&::-moz-range-thumb]:shadow-lg"
                  />
                  <input
                    type="range"
                    min={DECLARE_RANGE_START_MINUTES}
                    max={DECLARE_RANGE_END_MINUTES}
                    step={DECLARE_END_STEP_MINUTES}
                    value={declareEndMinutes}
                    onChange={(event) => handleDeclareEndChange(Number(event.target.value))}
                    aria-label="Hora de fin"
                    className="pointer-events-none absolute inset-0 h-3 w-full cursor-pointer appearance-none bg-transparent accent-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/80 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition hover:[&::-webkit-slider-thumb]:scale-105 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white/80 [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:shadow-lg"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <span>{minutesToTimeString(DECLARE_RANGE_START_MINUTES)}</span>
                  <span>Último inicio {declareLatestStartLabel}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <span>Fin mínimo {declareMinEndLabel}</span>
                  <span>Fin máximo {declareMaxEndLabel}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <span>Inicio cada 30 min</span>
                  <span>Fin en horas enteras desde inicio</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <span>Ventana {declareWindowLabel}</span>
                  <span>Máximo {MAX_DECLARABLE_HOURS} h</span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/80 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Motivo
                </p>
                <span
                  className={`text-xs font-semibold ${
                    declareHoursReason.length >= MAX_REASON_LENGTH
                      ? "text-rose-500"
                      : "text-slate-400"
                  }`}
                >
                  {declareHoursReason.length}/{MAX_REASON_LENGTH}
                </span>
              </div>
              <textarea
                value={declareHoursReason}
                onChange={(event) => handleDeclareReasonChange(event.target.value)}
                maxLength={MAX_REASON_LENGTH}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                placeholder="Describe brevemente el motivo de la declaración."
              />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha de la declaración
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Selecciona un único día para guardar `fechaHorasDeclaradas`.
                  </p>
                </div>
                {declareSelectedDate ? (
                  <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fuchsia-600">
                    {declareSelectedDate.toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mes
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                    value={declareMonth}
                    onChange={(event) => {
                      setDeclareMonth(Number(event.target.value));
                      clearDeclareMessages();
                    }}
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={`declare-month-${name}`} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Año
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                    value={declareYear}
                    onChange={(event) => {
                      setDeclareYear(Number(event.target.value));
                      clearDeclareMessages();
                    }}
                  >
                    {declareYearOptions.map((year) => (
                      <option key={`declare-year-${year}`} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {MINI_WEEK_DAYS.map((label) => (
                  <span key={`declare-weekday-${label}`}>{label}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {declareCalendarDays.map((date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`declare-empty-${index}`}
                        className="h-9 rounded-xl border border-transparent bg-transparent"
                        aria-hidden="true"
                      />
                    );
                  }
                  const dateKey = formatDateKey(date);
                  const isSelected = dateKey === declareSelectedDateKey;
                  const isToday =
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

                  return (
                    <button
                      key={`declare-date-${dateKey}`}
                      type="button"
                      onClick={() => handleDeclareDateSelect(date)}
                      className={`flex h-9 items-center justify-center rounded-xl border text-sm font-semibold transition ${
                        isSelected
                          ? "border-fuchsia-400 bg-fuchsia-500 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
                      } ${isToday && !isSelected ? "ring-1 ring-indigo-200" : ""}`}
                      aria-pressed={isSelected}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </section>

            {declareStatus.error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                {declareStatus.error}
              </p>
            ) : null}
            {declareStatus.success ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
                {declareStatus.success}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Se guardará un registro en{" "}
                <span className="font-semibold text-slate-500">
                  horasDeclaradas
                </span>{" "}
                con el usuario seleccionado ({targetUserLabel}).
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={closeDeclareHoursModal}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={declareStatus.loading}
                  className="rounded-full border border-indigo-200 bg-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300"
                >
                  {declareStatus.loading
                    ? "Guardando..."
                    : editingDeclaredRecord
                      ? "Guardar cambios"
                      : "Guardar declaración"}
                </button>
              </div>
            </div>
          </form>
        </div>
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
                    ) : availableCreateUsers.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No hay usuarios disponibles.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {availableCreateUsers.map((user) => {
                          const color = getUserColor(user.user);
                          return (
                            <button
                              key={user.$id}
                              type="button"
                              onClick={() => handleAddAttendee(user.user, "create")}
                              className="flex items-center justify-between gap-3"
                              aria-label={`Añadir ${user.user}`}
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
                              <span className="text-xs text-slate-400">
                                Clic para añadir
                              </span>
                            </button>
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
                        Haz clic en un usuario para añadirlo.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {attendees.map((attendee) => {
                          const color = getUserColor(attendee);
                          const role = userLookup.get(attendee)?.role;
                          return (
                            <button
                              key={attendee}
                              type="button"
                              onClick={() =>
                                handleRemoveAttendee(attendee, "create")
                              }
                              className="flex items-center justify-between gap-3"
                              aria-label={`Quitar ${attendee}`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${color.dotClass}`}
                                  aria-hidden="true"
                                />
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${color.badgeClass}`}
                                >
                                  {attendee}
                                </span>
                                {role ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    {role}
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-xs text-rose-500">
                                Clic para quitar
                              </span>
                            </button>
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
          isBulkCreateModalOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeBulkCreateModal}
      >
        <div
          className={`max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/70 bg-white/95 p-6 shadow-soft transition ${
            isBulkCreateModalOpen ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Crear varios eventos
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Define los datos comunes y selecciona varios días en el calendario.
              </p>
            </div>
            <button
              type="button"
              onClick={closeBulkCreateModal}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              Cerrar
            </button>
          </div>

          <form className="mt-6 flex flex-col gap-6" onSubmit={handleBulkCreateEvents}>
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                    Nombre del evento
                    <input
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                      type="text"
                      value={bulkEventName}
                      onChange={(event) => setBulkEventName(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                    Tipo de evento
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                      value={bulkEventType}
                      onChange={(event) =>
                        setBulkEventType(event.target.value as EventCategory)
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
                <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                    Hora inicio
                    <input
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                      type="time"
                      value={bulkEventStartTime}
                      onChange={(event) => setBulkEventStartTime(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                    Establecimiento
                    <button
                      type="button"
                      onClick={() => openEstablishmentModal("bulk")}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300"
                    >
                      <span className="truncate">
                        {bulkEventEstablishment || "Selecciona un establecimiento"}
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
                </div>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                  Notas
                  <textarea
                    className="min-h-[90px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                    value={bulkEventNotes}
                    onChange={(event) => setBulkEventNotes(event.target.value)}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-700">Calendario</span>
                  <span className="text-xs font-semibold text-slate-400">
                    {bulkSelectedDates.length} días seleccionados
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mes
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                      value={bulkMonth}
                      onChange={(event) => {
                        setBulkMonth(Number(event.target.value));
                        setBulkFormStatus((prev) =>
                          prev.error ? { ...prev, error: "", success: "" } : prev
                        );
                      }}
                    >
                      {MONTH_NAMES.map((name, index) => (
                        <option key={name} value={index}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Año
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
                      value={bulkYear}
                      onChange={(event) => {
                        setBulkYear(Number(event.target.value));
                        setBulkFormStatus((prev) =>
                          prev.error ? { ...prev, error: "", success: "" } : prev
                        );
                      }}
                    >
                      {bulkYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {MINI_WEEK_DAYS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {bulkCalendarDays.map((date, index) => {
                    if (!date) {
                      return (
                        <div
                          key={`bulk-empty-${index}`}
                          className="h-9 rounded-xl border border-transparent bg-transparent"
                          aria-hidden="true"
                        />
                      );
                    }
                    const dateKey = formatDateKey(date);
                    const isSelected = bulkSelectedDateSet.has(dateKey);
                    const isToday =
                      date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear();

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => handleBulkDateToggle(date)}
                        className={`flex h-9 items-center justify-center rounded-xl border text-sm font-semibold transition ${
                          isSelected
                            ? "border-fuchsia-400 bg-fuchsia-500 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
                        } ${isToday && !isSelected ? "ring-1 ring-indigo-200" : ""}`}
                        aria-pressed={isSelected}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {bulkSelectedDates.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Selecciona uno o varios días para crear los eventos.
                    </p>
                  ) : (
                    bulkSelectedDates.map((date) => {
                      const key = formatDateKey(date);
                      return (
                        <button
                          key={`bulk-chip-${key}`}
                          type="button"
                          onClick={() => handleBulkDateToggle(date)}
                          className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-600 transition hover:border-fuchsia-300 hover:bg-fuchsia-100"
                        >
                          {date.toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-sm font-medium text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Asistentes</span>
                <span className="text-xs font-semibold text-slate-400">
                  {bulkAttendees.length} seleccionados
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
                    ) : availableBulkUsers.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No hay usuarios disponibles.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {availableBulkUsers.map((user) => {
                          const color = getUserColor(user.user);
                          return (
                            <button
                              key={`bulk-${user.$id}`}
                              type="button"
                              onClick={() => handleAddAttendee(user.user, "bulk")}
                              className="flex items-center justify-between gap-3"
                              aria-label={`Añadir ${user.user}`}
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
                              <span className="text-xs text-slate-400">
                                Clic para añadir
                              </span>
                            </button>
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
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm">
                    {bulkAttendees.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Añade asistentes para este evento.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {bulkAttendees.map((attendee) => {
                          const color = getUserColor(attendee);
                          const role = userLookup.get(attendee)?.role;
                          return (
                            <button
                              key={`bulk-selected-${attendee}`}
                              type="button"
                              onClick={() => handleRemoveAttendee(attendee, "bulk")}
                              className="flex items-center justify-between gap-3"
                              aria-label={`Quitar ${attendee}`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${color.dotClass}`}
                                  aria-hidden="true"
                                />
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${color.badgeClass}`}
                                >
                                  {attendee}
                                </span>
                                {role ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    {role}
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-xs text-rose-500">Clic para quitar</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {invalidBulkAttendees.length > 0 ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  Hay asistentes que no existen en la tabla de usuarios.
                </p>
              ) : null}
            </div>

            {bulkFormStatus.error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                {bulkFormStatus.error}
              </p>
            ) : null}
            {bulkFormStatus.success ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-600">
                {bulkFormStatus.success}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeBulkCreateModal}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={bulkFormStatus.loading}
                className="rounded-full border border-fuchsia-200 bg-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-fuchsia-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300"
              >
                {bulkFormStatus.loading ? "Creando eventos..." : "Crear varios eventos"}
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
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  type="text"
                  value={editForm.nombre}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, nombre: event.target.value }))
                  }
                  disabled={!canEditDetails}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                  Tipo de evento
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    value={editForm.eventType}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        eventType: event.target.value as EventCategory
                      }))
                    }
                    disabled={!canEditDetails}
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
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    type="date"
                    value={editForm.fecha}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, fecha: event.target.value }))
                    }
                    disabled={!canEditDetails}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Hora inicio
                <input
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  type="time"
                  value={editForm.horaInicio}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      horaInicio: event.target.value
                    }))
                  }
                  disabled={!canEditDetails}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Establecimiento
                <button
                  type="button"
                  onClick={() => openEstablishmentModal("edit")}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  disabled={!canEditDetails}
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
                      ) : availableEditUsers.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          No hay usuarios disponibles.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {availableEditUsers.map((user) => {
                            const color = getUserColor(user.user);
                            return (
                              <button
                                key={user.$id}
                                type="button"
                                onClick={() => handleAddAttendee(user.user, "edit")}
                                className="flex items-center justify-between gap-3"
                                aria-label={`Añadir ${user.user}`}
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
                                <span className="text-xs text-slate-400">
                                  Clic para añadir
                                </span>
                              </button>
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
                          Haz clic en un usuario para añadirlo.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {editForm.attendees.map((attendee) => {
                            const color = getUserColor(attendee);
                            const role = userLookup.get(attendee)?.role;
                            return (
                              <button
                                key={attendee}
                                type="button"
                                onClick={() =>
                                  handleRemoveAttendee(attendee, "edit")
                                }
                                className="flex items-center justify-between gap-3"
                                aria-label={`Quitar ${attendee}`}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${color.dotClass}`}
                                    aria-hidden="true"
                                  />
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${color.badgeClass}`}
                                  >
                                    {attendee}
                                  </span>
                                  {role ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                      {role}
                                    </span>
                                  ) : null}
                                </div>
                                <span className="text-xs text-rose-500">
                                  Clic para quitar
                                </span>
                              </button>
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
                  className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  value={editForm.notas}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, notas: event.target.value }))
                  }
                  disabled={!canEditDetails}
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
