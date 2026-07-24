import type { EscalationLevel, RagStatus } from "@prisma/client";

export interface EscalationPlan {
  level: EscalationLevel;
  deadlineDays: number;
  recipients: string[];
  notifiedBodies: string[];
  requiresPublicStatement: boolean;
  description: string;
}

/**
 * Escalation Protocol:
 * Green → info only
 * Amber → project officer + ministry, 14-day deadline
 * Red → Line Minister + PS, 5-day deadline, IGG, public statement, parliamentary committee
 */
export function buildEscalationPlan(rag: RagStatus): EscalationPlan | null {
  switch (rag) {
    case "GREEN":
      return {
        level: "INFO",
        deadlineDays: 30,
        recipients: ["project.officer@works.go.ug"],
        notifiedBodies: ["Project Office"],
        requiresPublicStatement: false,
        description: "Informational only — project on track. Logged for transparency.",
      };
    case "AMBER":
      return {
        level: "WARNING",
        deadlineDays: 14,
        recipients: ["project.officer@works.go.ug", "district.desk@works.go.ug"],
        notifiedBodies: ["Project Officer", "Ministry Desk"],
        requiresPublicStatement: false,
        description: "Warning notice — slow progress. Response required within 14 days.",
      };
    case "RED":
      return {
        level: "CRITICAL",
        deadlineDays: 5,
        recipients: [
          "minister@works.go.ug",
          "ps@works.go.ug",
          "igg@igg.go.ug",
          "pac@parliament.go.ug",
        ],
        notifiedBodies: [
          "Line Minister",
          "Permanent Secretary",
          "Inspectorate of Government (IGG)",
          "Parliamentary Committee",
        ],
        requiresPublicStatement: true,
        description:
          "Critical escalation — stalled/abandoned. 5-day deadline; public statement required.",
      };
    default:
      return null;
  }
}

export function computeDeadline(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}
