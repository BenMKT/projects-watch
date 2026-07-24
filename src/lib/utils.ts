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
