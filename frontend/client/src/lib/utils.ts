import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_BASE_URL } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function normalizeProtocolSlashes(value: string): string {
  return value.replace(/^(https?):\/(?!\/)/i, "$1://");
}

function getBackendOrigin(apiBaseUrl: string): string {
  const normalizedApiBaseUrl = normalizeProtocolSlashes(apiBaseUrl.trim());

  try {
    const url = new URL(normalizedApiBaseUrl);
    return url.origin;
  } catch {
    return normalizedApiBaseUrl.replace(/\/api\/?$/i, "").replace(/\/+$/g, "");
  }
}

/**
 * Get the full URL for an image from the backend
 * @param path The relative path of the image (e.g. /uploads/settings/image.jpg)
 * @returns The full URL or empty string if path is empty
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "";

  const normalizedPath = normalizeProtocolSlashes(path.trim());
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

  const backendOrigin = getBackendOrigin(API_BASE_URL);
  const cleanPath = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;

  return `${backendOrigin}${cleanPath}`;
}
