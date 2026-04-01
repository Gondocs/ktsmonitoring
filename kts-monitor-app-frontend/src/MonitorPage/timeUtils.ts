export type ChartRange = "1h" | "4h" | "12h" | "24h" | "48h" | "7d" | "14d";

const RANGE_MS: Record<ChartRange, number> = {
  "1h": 1 * 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "48h": 48 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "14d": 14 * 24 * 60 * 60 * 1000,
};

export const parseMonitorDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(raw);
  const normalized = hasTimezone
    ? raw
    : raw.includes("T")
      ? `${raw}Z`
      : `${raw.replace(" ", "T")}Z`;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  return date;
};

export const formatRelativeTimeHu = (value: string | null | undefined): string => {
  const date = parseMonitorDate(value);
  if (!date) return "Nincs adat";

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Épp most";
  if (diffMin < 60) return `${diffMin} perce`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} órája`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} napja`;
};

export const formatDateTimeHu = (value: string | null | undefined): string => {
  const date = parseMonitorDate(value);
  if (!date) return "Nincs adat";

  return date.toLocaleString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const getRangeStartDate = (range: ChartRange): Date => {
  return new Date(Date.now() - RANGE_MS[range]);
};
