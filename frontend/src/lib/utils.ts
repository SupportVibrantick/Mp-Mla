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
  if (/^https?:\/\//i.test(normalizedPath) || /^data:image\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const backendOrigin = getBackendOrigin(API_BASE_URL);
  const cleanPath = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;

  return `${backendOrigin}${cleanPath}`;
}

export function formatChartCurrency(val: number): string {
  if (!val || val === 0 || isNaN(val)) return "₹0";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 10000000) {
    const cr = abs / 10000000;
    const formatted = parseFloat(cr.toFixed(2));
    return `${sign}₹${formatted}Cr`;
  }
  if (abs >= 100000) {
    const l = abs / 100000;
    const formatted = parseFloat(l.toFixed(2));
    return `${sign}₹${formatted}L`;
  }
  if (abs >= 1000) {
    const k = abs / 1000;
    const formatted = parseFloat(k.toFixed(2));
    return `${sign}₹${formatted}k`;
  }
  return `${sign}₹${abs}`;
}

