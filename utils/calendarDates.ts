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
