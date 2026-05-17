import { R2_PUBLIC_URL } from "./client";

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export function extractKeyFromUrl(url: string): string {
  const base = R2_PUBLIC_URL;
  if (url.startsWith(base + "/")) {
    return url.slice(base.length + 1);
  }
  // Fallback: extract everything after hostname
  const parts = url.split("/");
  return parts.slice(3).join("/"); // skip protocol + hostname
}
