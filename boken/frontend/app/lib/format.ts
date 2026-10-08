import type { ReadingStatus, WebtoonStatus } from "./types";

export const WEBTOON_STATUS: { value: WebtoonStatus; label: string }[] = [
  { value: "in progress", label: "Ongoing" },
  { value: "finish", label: "Completed" },
  { value: "pause", label: "On hiatus" },
  { value: "cancel", label: "Cancelled" },
];

export const READING_STATUS: { value: ReadingStatus; label: string }[] = [
  { value: "to read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "finish", label: "Finished" },
];

export const LANGUAGES = [
  { value: "eng", label: "English" },
  { value: "fra", label: "French" },
  { value: "spa", label: "Spanish" },
  { value: "jpn", label: "Japanese" },
  { value: "kor", label: "Korean" },
];

export function webtoonStatusLabel(status?: string) {
  return WEBTOON_STATUS.find((s) => s.value === status)?.label ?? status ?? "Unknown";
}

export function readingStatusLabel(status?: string) {
  return READING_STATUS.find((s) => s.value === status)?.label ?? status ?? "";
}

export function chapterNumber(n?: number | null) {
  return String(Math.max(0, n ?? 0)).padStart(3, "0");
}

export function formatDate(value?: string | Date) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(value?: string | Date) {
  if (!value) return "";
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(-Math.round(seconds / size), unit);
  }
  return "just now";
}
