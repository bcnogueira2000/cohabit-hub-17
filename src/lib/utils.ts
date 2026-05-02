import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Capitalize first letter of each word. */
export function capitalize(s: string): string {
  if (!s) return "";
  return s
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Get up to two-letter initials from a full name (or email local part). */
export function getInitials(name?: string | null): string {
  if (!name) return "??";
  const cleaned = name.includes("@") ? name.split("@")[0] : name;
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable color key (0-3) based on a string — used to rotate brand accents on avatars. */
export function colorKey(seed?: string | null): 0 | 1 | 2 | 3 {
  if (!seed) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % 4) as 0 | 1 | 2 | 3;
}

const DATE_LOCALE = "pt-PT";

export type DateFormat = "short" | "long" | "time" | "datetime" | "weekday";

/** Single source of truth for date formatting across the app. */
export function formatDate(input: string | number | Date, fmt: DateFormat = "short"): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  switch (fmt) {
    case "long":
      return d.toLocaleDateString(DATE_LOCALE, { weekday: "long", day: "numeric", month: "long" });
    case "weekday":
      return d.toLocaleDateString(DATE_LOCALE, { weekday: "short", day: "numeric", month: "short" });
    case "time":
      return d.toLocaleTimeString(DATE_LOCALE, { hour: "2-digit", minute: "2-digit" });
    case "datetime":
      return d.toLocaleString(DATE_LOCALE, { dateStyle: "medium", timeStyle: "short" });
    case "short":
    default:
      return d.toLocaleDateString(DATE_LOCALE, { day: "numeric", month: "short", year: "numeric" });
  }
}
