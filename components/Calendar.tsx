import { EVENT_CATEGORIES, EVENT_CATEGORY_META } from "../constants/eventCategories";
import type { CalendarEvent } from "../services/eventsService";
import { parseDateWithoutTime } from "../utils/calendarDates";
import { buildEventGroupKey } from "../utils/eventGrouping";
import { DayCell } from "./DayCell";
import type { CalendarEventDisplay } from "./calendarTypes";
import {
  CalendarModuleIcon,
  PersonModuleIcon,
  TableModuleIcon
} from "./icons/ModuleIcons";

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const weekDaysFull = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo"
];

const monthNames = [
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

type CalendarProps = {
  currentMonth: number;
  currentYear: number;
  events: CalendarEvent[];
  selectedDate: Date | null;
  activeCategory: CalendarEventDisplay["eventType"] | null;
  viewMode: "monthly" | "weekly";
  onViewModeChange: (view: "monthly" | "weekly") => void;
  workweekOnly: boolean;
  onWorkweekToggle: () => void;
  myEventsOnly: boolean;
  onMyEventsToggle: () => void;
  weekAnchorDate: Date;
  controlTableEnabled: boolean;
  onControlTableToggle: () => void;
  showControlTableToggle: boolean;
  allowAddEvent: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDaySelect: (date: Date, events: CalendarEventDisplay[]) => void;
  onAddEvent: (date: Date) => void;
  onOpenCreateModal: () => void;
  onOpenBulkCreateModal: () => void;
  onEventSelect: (event: CalendarEventDisplay) => void;
  onCategoryToggle: (category: CalendarEventDisplay["eventType"]) => void;
};

const buildCalendarDays = (
  year: number,
  month: number,
  includeWeekends: boolean
) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekDay = (firstDay.getDay() + 6) % 7;
  const weekdayColumns = includeWeekends ? 7 : 5;
  const initialBlanks =
    includeWeekends || startWeekDay < 5 ? startWeekDay : 0;

  if (includeWeekends) {
    const totalCells = Math.ceil((startWeekDay + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - startWeekDay + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return null;
      }
      return new Date(year, month, dayNumber);
    });
  }

  const days: Array<Date | null> = Array.from({ length: initialBlanks }, () => null);
  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = new Date(year, month, dayNumber);
    const weekDayIndex = (date.getDay() + 6) % 7;
    if (weekDayIndex < 5) {
      days.push(date);
    }
  }

  const totalCells = Math.ceil(days.length / weekdayColumns) * weekdayColumns;
  while (days.length < totalCells) {
    days.push(null);
  }
  return days;
};

const getDateParts = (date: Date) => ({
  year: date.getFullYear(),
  month: date.getMonth(),
  day: date.getDate()
});

const isSameDay = (left: Date, right: Date) => {
  const leftParts = getDateParts(left);
  const rightParts = getDateParts(right);
  return (
    leftParts.year === rightParts.year &&
    leftParts.month === rightParts.month &&
    leftParts.day === rightParts.day
  );
};

const getMinutesFromTime = (time?: string | null) => {
  if (!time) return Number.POSITIVE_INFINITY;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.POSITIVE_INFINITY;
  }
  return hours * 60 + minutes;
};

const formatEventTime = (time?: string | null) => {
  if (!time) return "—";
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const [, hours, minutes] = match;
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};

const getWeekStart = (date: Date) => {
  const dayIndex = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - dayIndex);
  start.setHours(0, 0, 0, 0);
  return start;
};

const buildWeekDates = (date: Date, includeWeekends: boolean) => {
  const start = getWeekStart(date);
  const totalDays = includeWeekends ? 7 : 5;
  return Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const getEventsForDay = (
  events: CalendarEvent[],
  date: Date | null
): CalendarEventDisplay[] => {
  if (!date) return [];
  const grouped = new Map<string, CalendarEventDisplay>();

  events.forEach((event) => {
    if (!event.fecha) return;
    const eventDate = parseDateWithoutTime(event.fecha);
    if (!eventDate) return;
    if (!isSameDay(eventDate, date)) return;
    const groupKey = buildEventGroupKey(event);
    const existing = grouped.get(groupKey);
    if (existing) {
      existing.attendeeCount += 1;
      if (event.user && !existing.attendees.includes(event.user)) {
        existing.attendees.push(event.user);
      }
      return;
    }

    grouped.set(groupKey, {
      ...event,
      attendeeCount: 1,
      attendees: event.user ? [event.user] : [],
      groupKey
    });
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const timeDiff =
      getMinutesFromTime(a.horaInicio) - getMinutesFromTime(b.horaInicio);
    if (timeDiff !== 0) return timeDiff;
    return (a.nombre ?? "").localeCompare(b.nombre ?? "");
  });
};

export const Calendar = ({
  currentMonth,
  currentYear,
  events,
  selectedDate,
  activeCategory,
  viewMode,
  onViewModeChange,
  workweekOnly,
  onWorkweekToggle,
  myEventsOnly,
  onMyEventsToggle,
  weekAnchorDate,
  controlTableEnabled,
  onControlTableToggle,
  showControlTableToggle,
  allowAddEvent,
  onPrevMonth,
  onNextMonth,
  onMonthChange,
  onYearChange,
  onDaySelect,
  onAddEvent,
  onOpenCreateModal,
  onOpenBulkCreateModal,
  onEventSelect,
  onCategoryToggle
}: CalendarProps) => {
  const today = new Date();
  const includeWeekends = !workweekOnly;
  const days = buildCalendarDays(currentYear, currentMonth, includeWeekends);
  const weekReferenceDate = viewMode === "weekly" ? weekAnchorDate : today;
  const weekDates = buildWeekDates(weekReferenceDate, includeWeekends);
  const weekLabels = includeWeekends ? weekDays : weekDays.slice(0, 5);
  const monthLabel =
    viewMode === "weekly"
      ? monthNames[weekReferenceDate.getMonth()]
      : monthNames[currentMonth];
  const yearLabel =
    viewMode === "weekly" ? weekReferenceDate.getFullYear() : currentYear;
  const gridColumnsClass = includeWeekends ? "grid-cols-7" : "grid-cols-5";
  const minWidthClass = includeWeekends ? "min-w-[900px]" : "min-w-[720px]";
  const weeklyColumnsClass = includeWeekends ? "grid-cols-7" : "grid-cols-5";
  const weeklyMinWidthClass = includeWeekends ? "min-w-[1150px]" : "min-w-[900px]";

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onMyEventsToggle}
            aria-pressed={myEventsOnly}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              myEventsOnly
                ? "border-indigo-200 bg-indigo-500 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:text-indigo-500"
            }`}
          >
            <PersonModuleIcon title="" className="h-4 w-4" />
            Mis eventos
          </button>
          {showControlTableToggle ? (
            <button
              type="button"
              onClick={onControlTableToggle}
              aria-pressed={controlTableEnabled}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                controlTableEnabled
                  ? "border-indigo-200 bg-indigo-500 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:text-indigo-500"
              }`}
            >
              <TableModuleIcon title="" className="h-4 w-4" />
              Tabla de control
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
                <CalendarModuleIcon title="" className="h-5 w-5" />
                Calendario {viewMode === "weekly" ? "semanal" : "mensual"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                  <button
                    type="button"
                    onClick={() => onViewModeChange("monthly")}
                    aria-pressed={viewMode === "monthly"}
                    className={`rounded-full px-3 py-1 transition ${
                      viewMode === "monthly"
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-indigo-500"
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewModeChange("weekly")}
                    aria-pressed={viewMode === "weekly"}
                    className={`rounded-full px-3 py-1 transition ${
                      viewMode === "weekly"
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-indigo-500"
                    }`}
                  >
                    Semanal
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onWorkweekToggle}
                  aria-pressed={workweekOnly}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    workweekOnly
                      ? "border-indigo-200 bg-indigo-500 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:text-indigo-500"
                  }`}
                >
                  {workweekOnly ? "Laboral" : "Natural"}
                </button>
                {allowAddEvent ? (
                  <div className="flex flex-wrap items-center gap-2 md:ml-2">
                    <button
                      type="button"
                      onClick={onOpenCreateModal}
                      className="rounded-full border border-emerald-200 bg-emerald-500 px-4 py-1 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-600"
                    >
                      Crear evento
                    </button>
                    <button
                      type="button"
                      onClick={onOpenBulkCreateModal}
                      className="rounded-full border border-fuchsia-200 bg-fuchsia-500 px-4 py-1 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-fuchsia-600"
                    >
                      Crear varios eventos
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">
              {monthLabel} {yearLabel}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-slate-500" htmlFor="month-select">
            Mes
          </label>
          <select
            id="month-select"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none"
            value={currentMonth}
            onChange={(event) => onMonthChange(Number(event.target.value))}
            disabled={viewMode === "weekly"}
          >
            {monthNames.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <label className="text-sm font-medium text-slate-500" htmlFor="year-select">
            Año
          </label>
          <select
            id="year-select"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none"
            value={currentYear}
            onChange={(event) => onYearChange(Number(event.target.value))}
            disabled={viewMode === "weekly"}
          >
            {Array.from({ length: 7 }, (_, index) => currentYear - 3 + index).map(
              (year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              )
            )}
          </select>
          <div className="flex flex-wrap items-center gap-3">
            {EVENT_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => onCategoryToggle(category)}
                aria-pressed={activeCategory === category}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  EVENT_CATEGORY_META[category].cardClass
                } ${
                  activeCategory === category
                    ? "ring-2 ring-slate-200"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${EVENT_CATEGORY_META[category].dotClass}`}
                />
                {EVENT_CATEGORY_META[category].label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
          <button
            onClick={onPrevMonth}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
            type="button"
          >
            {viewMode === "weekly" ? "Semana anterior" : "Mes anterior"}
          </button>
          <button
            onClick={onNextMonth}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
            type="button"
          >
            {viewMode === "weekly" ? "Semana siguiente" : "Mes siguiente"}
          </button>
        </div>
      </header>

      {viewMode === "weekly" ? (
        <div className="overflow-x-auto pb-2">
          <div className={`${weeklyMinWidthClass} grid ${weeklyColumnsClass} gap-5`}>
            {weekDates.map((date) => {
              const isToday =
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
              const isSelected =
                selectedDate &&
                date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getFullYear() === selectedDate.getFullYear();
              const dayEvents = getEventsForDay(events, date);

              return (
                <div
                  key={date.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => onDaySelect(date, dayEvents)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onDaySelect(date, dayEvents);
                    }
                  }}
                  className={`flex min-h-[260px] flex-col gap-4 rounded-3xl border bg-white/70 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                    isToday
                      ? "border-indigo-400/70 bg-indigo-50/60"
                      : "border-slate-200/70"
                  } ${isSelected ? "ring-2 ring-indigo-400/70" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        {weekDaysFull[(date.getDay() + 6) % 7]}
                      </p>
                      <p className="text-2xl font-semibold text-slate-900">
                        {date.getDate()} {monthNames[date.getMonth()]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isToday ? (
                        <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Hoy
                        </span>
                      ) : null}
                      {allowAddEvent ? (
                        <button
                          type="button"
                          aria-label="Crear evento"
                          onClick={(event) => {
                            event.stopPropagation();
                            onAddEvent(date);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                        >
                          +
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    {dayEvents.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
                        No hay eventos para este día.
                      </div>
                    ) : (
                      dayEvents.map((event) => {
                        const meta = EVENT_CATEGORY_META[event.eventType] ?? {
                          label: "Evento",
                          dotClass: "bg-slate-300",
                          cardClass: "bg-slate-100 text-slate-600 border-slate-200"
                        };
                        const isFiltered = Boolean(activeCategory);
                        const isHighlighted =
                          isFiltered && event.eventType === activeCategory;

                        return (
                          <button
                            key={event.groupKey}
                            type="button"
                            onClick={(eventClick) => {
                              eventClick.stopPropagation();
                              onEventSelect(event);
                            }}
                            className={`relative flex w-full flex-col gap-1.5 rounded-2xl border px-4 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass} ${
                              isFiltered && !isHighlighted ? "opacity-40" : ""
                            } ${isHighlighted ? "ring-2 ring-white/70" : ""}`}
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
                            <div className="flex flex-wrap items-center gap-3 pl-2 text-xs font-medium text-slate-600">
                              <span>{formatEventTime(event.horaInicio)}</span>
                              <span>({event.attendeeCount})</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className={minWidthClass}>
            <div
              className={`grid ${gridColumnsClass} gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500`}
            >
              {weekLabels.map((day) => (
                <div key={day} className="px-3">
                  {day}
                </div>
              ))}
            </div>

            <div className={`mt-4 grid ${gridColumnsClass} gap-4`}>
              {days.map((date, index) => {
                const isToday =
                  date &&
                  date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear();
                const isSelected =
                  date &&
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();
                const dayEvents = getEventsForDay(events, date);

                return (
                  <DayCell
                    key={`${currentYear}-${currentMonth}-${index}`}
                    date={date}
                    isToday={Boolean(isToday)}
                    isSelected={Boolean(isSelected)}
                    events={dayEvents}
                    highlightCategory={activeCategory}
                    allowAddEvent={allowAddEvent}
                    onSelect={onDaySelect}
                    onAddEvent={onAddEvent}
                    onEventSelect={onEventSelect}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
