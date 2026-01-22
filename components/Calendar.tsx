import { EVENT_CATEGORIES, EVENT_CATEGORY_META } from "../constants/eventCategories";
import type { CalendarEvent } from "../services/eventsService";
import { parseDateWithoutTime } from "../utils/calendarDates";
import { DayCell } from "./DayCell";
import type { CalendarEventDisplay } from "./calendarTypes";

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDaySelect: (date: Date) => void;
  onEventSelect: (event: CalendarEventDisplay) => void;
};

const buildCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekDay = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startWeekDay + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startWeekDay + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return null;
    }
    return new Date(year, month, dayNumber);
  });
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

const buildEventGroupKey = (event: CalendarEvent) => {
  const eventDate = parseDateWithoutTime(event.fecha);
  const dateKey = !eventDate
    ? ""
    : `${eventDate.getFullYear()}-${eventDate.getMonth() + 1}-${eventDate.getDate()}`;
  return [
    dateKey,
    event.nombre ?? "",
    event.eventType ?? "",
    event.horaInicio ?? "",
    event.horaFin ?? ""
  ].join("|");
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

  return Array.from(grouped.values()).sort((a, b) =>
    (a.nombre ?? "").localeCompare(b.nombre ?? "")
  );
};

export const Calendar = ({
  currentMonth,
  currentYear,
  events,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onMonthChange,
  onYearChange,
  onDaySelect,
  onEventSelect
}: CalendarProps) => {
  const days = buildCalendarDays(currentYear, currentMonth);
  const today = new Date();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
              Calendario mensual
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {monthNames[currentMonth]} {currentYear}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevMonth}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"
              type="button"
            >
              Mes anterior
            </button>
            <button
              onClick={onNextMonth}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"
              type="button"
            >
              Mes siguiente
            </button>
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
              <span
                key={category}
                className="flex items-center gap-2 text-xs text-slate-500"
              >
                <span
                  className={`h-2 w-2 rounded-full ${EVENT_CATEGORY_META[category].dotClass}`}
                />
                {EVENT_CATEGORY_META[category].label}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-7 gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {weekDays.map((day) => (
              <div key={day} className="px-3">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-7 gap-4">
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

              return (
                <DayCell
                  key={`${currentYear}-${currentMonth}-${index}`}
                  date={date}
                  isToday={Boolean(isToday)}
                  isSelected={Boolean(isSelected)}
                  events={getEventsForDay(events, date)}
                  onSelect={onDaySelect}
                  onEventSelect={onEventSelect}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
