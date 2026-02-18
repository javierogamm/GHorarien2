export const parseDateWithoutTime = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  const match = trimmed.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if ([day, month, year].some((part) => Number.isNaN(part))) return null;

  return new Date(year, month - 1, day);
};

export const getMinutesFromDateTimeValue = (value?: string | null): number => {
  if (!value) return Number.POSITIVE_INFINITY;
  const trimmed = value.trim();
  if (!trimmed) return Number.POSITIVE_INFINITY;

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getHours() * 60 + parsed.getMinutes();
  }

  const match = trimmed.match(/(?:T|\s)?(\d{1,2}):(\d{2})/);
  if (!match) return Number.POSITIVE_INFINITY;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.POSITIVE_INFINITY;
  }

  return hours * 60 + minutes;
};
