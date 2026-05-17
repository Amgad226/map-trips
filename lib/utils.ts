import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProxyUrl(r2Url: string | null | undefined): string {
  if (!r2Url) return "";
  if (r2Url.startsWith("/api/media")) return r2Url;
  return `/api/media?url=${encodeURIComponent(r2Url)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}
