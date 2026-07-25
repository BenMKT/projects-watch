import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "UGX") {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export const RAG_COLORS = {
  GREEN: { bg: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-500", hex: "#10b981", label: "On Track" },
  AMBER: { bg: "bg-amber-500", text: "text-amber-700", border: "border-amber-500", hex: "#f59e0b", label: "Slow Progress" },
  RED: { bg: "bg-rose-600", text: "text-rose-700", border: "border-rose-600", hex: "#e11d48", label: "Stalled / Abandoned" },
  PENDING: { bg: "bg-slate-400", text: "text-slate-600", border: "border-slate-400", hex: "#94a3b8", label: "Under Review" },
} as const;

export const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin (Ministry)",
  DISTRICT_ADMIN: "District Admin",
  FIELD_OFFICER: "Field Officer / Volunteer",
  CITIZEN: "Citizen",
  CONTRACTOR: "Contractor",
  PARLIAMENTARY: "Parliamentary / Audit",
} as const;

/** Extract YouTube embed URL, or null if not a YouTube link. */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.slice(1).split("/")[0] || null;
    } else if (u.hostname.includes("youtube.com")) {
      id = u.searchParams.get("v");
      if (!id && u.pathname.startsWith("/embed/")) {
        id = u.pathname.split("/")[2] || null;
      } else if (!id && u.pathname.startsWith("/shorts/")) {
        id = u.pathname.split("/")[2] || null;
      } else if (!id && u.pathname.startsWith("/live/")) {
        id = u.pathname.split("/")[2] || null;
      }
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

/** Extract Vimeo embed URL, or null if not a Vimeo link. */
export function vimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    // player.vimeo.com/video/123 or vimeo.com/123
    const parts = u.pathname.split("/").filter(Boolean);
    let id: string | null = null;
    if (u.hostname.includes("player.vimeo.com") && parts[0] === "video") {
      id = parts[1] || null;
    } else {
      id = parts.find((p) => /^\d+$/.test(p)) || null;
    }
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

const DIRECT_VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v|mkv)(\?.*)?$/i;

export type VideoPlayback =
  | { kind: "iframe"; src: string; provider: "youtube" | "vimeo" }
  | { kind: "video"; src: string; provider: "file" }
  | { kind: "link"; src: string; provider: "external" };

/** Resolve how a briefing URL should be played in the UI. */
export function resolveVideoPlayback(url: string): VideoPlayback {
  const trimmed = (url || "").trim();
  if (!trimmed) {
    return { kind: "link", src: trimmed, provider: "external" };
  }

  const yt = youtubeEmbedUrl(trimmed);
  if (yt) return { kind: "iframe", src: yt, provider: "youtube" };

  const vimeo = vimeoEmbedUrl(trimmed);
  if (vimeo) return { kind: "iframe", src: vimeo, provider: "vimeo" };

  try {
    const u = new URL(trimmed);
    const path = u.pathname.toLowerCase();
    if (
      DIRECT_VIDEO_EXT.test(path) ||
      u.hostname.includes("blob.vercel-storage.com") ||
      u.searchParams.has("download") ||
      // common CDN / blob content-type hints in path
      path.includes("/chamber-briefings/")
    ) {
      return { kind: "video", src: trimmed, provider: "file" };
    }
  } catch {
    // fall through
  }

  // Heuristic: treat as playable file if extension matches anywhere in URL
  if (DIRECT_VIDEO_EXT.test(trimmed)) {
    return { kind: "video", src: trimmed, provider: "file" };
  }

  // Unknown watch-page / portal — open externally rather than a broken <video>
  return { kind: "link", src: trimmed, provider: "external" };
}
