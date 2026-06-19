import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a count for compact display.
 *   999       -> "999"
 *   1_200     -> "1.2k"
 *   15_000    -> "15k"
 *   1_500_000 -> "1.5M"
 */
export function formatCount(n: number | null | undefined): string {
  const v = Number(n) || 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) {
    const k = v / 1000;
    return (k >= 10 ? Math.floor(k) : Math.round(k * 10) / 10) + "k";
  }
  const m = v / 1_000_000;
  return (m >= 10 ? Math.floor(m) : Math.round(m * 10) / 10) + "M";
}

/** Short haptic feedback on supported devices (no-op elsewhere). */
export function hapticTap(ms: number = 15) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  } catch {}
}

