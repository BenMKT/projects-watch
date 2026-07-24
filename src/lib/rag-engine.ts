import type { CitizenReport, RagStatus, SentimentLabel } from "@prisma/client";

export interface RagInputReport {
  sentiment: SentimentLabel | null;
  sentimentScore: number | null;
  activityScore: number | null;
  weight: number;
  type: string;
}

export interface RagResult {
  provisionalStatus: RagStatus;
  confidence: number;
  reportCount: number;
  meetsMinimum: boolean;
  weightedScore: number;
  breakdown: {
    sentimentAvg: number;
    activityAvg: number;
    negativeRatio: number;
  };
  rationale: string;
}

const MIN_INDEPENDENT_REPORTS = 3;

/**
 * Weighted consensus algorithm for RAG Traffic Light status.
 * Requires minimum 3 independent citizen reports before provisional status.
 */
export function computeProvisionalRag(reports: RagInputReport[]): RagResult {
  const reportCount = reports.length;
  const meetsMinimum = reportCount >= MIN_INDEPENDENT_REPORTS;

  if (!meetsMinimum) {
    return {
      provisionalStatus: "PENDING",
      confidence: reportCount / MIN_INDEPENDENT_REPORTS,
      reportCount,
      meetsMinimum: false,
      weightedScore: 0.5,
      breakdown: { sentimentAvg: 0.5, activityAvg: 0.5, negativeRatio: 0 },
      rationale: `Awaiting ${MIN_INDEPENDENT_REPORTS - reportCount} more independent citizen report(s).`,
    };
  }

  let sentimentSum = 0;
  let activitySum = 0;
  let weightSum = 0;
  let negativeCount = 0;

  for (const r of reports) {
    const w = r.weight || 1;
    const sent =
      r.sentimentScore ??
      (r.sentiment === "POSITIVE" ? 0.8 : r.sentiment === "NEGATIVE" ? 0.2 : 0.5);
    const act = r.activityScore ?? 0.5;
    sentimentSum += sent * w;
    activitySum += act * w;
    weightSum += w;
    if (r.sentiment === "NEGATIVE" || (r.sentimentScore !== null && (r.sentimentScore ?? 1) < 0.35)) {
      negativeCount += 1;
    }
  }

  const sentimentAvg = sentimentSum / weightSum;
  const activityAvg = activitySum / weightSum;
  const negativeRatio = negativeCount / reportCount;

  // Combined score: high = healthy project; low = stalled
  const weightedScore = sentimentAvg * 0.45 + activityAvg * 0.4 + (1 - negativeRatio) * 0.15;

  let provisionalStatus: RagStatus = "GREEN";
  let rationale = "Citizen consensus and activity signals indicate progress on track.";

  if (weightedScore < 0.35 || (negativeRatio >= 0.6 && activityAvg < 0.4)) {
    provisionalStatus = "RED";
    rationale =
      "Weighted consensus indicates stalled or abandoned works — escalation recommended.";
  } else if (weightedScore < 0.55 || negativeRatio >= 0.4) {
    provisionalStatus = "AMBER";
    rationale = "Slow progress or mixed citizen feedback — warning notices advised.";
  }

  const confidence = Math.min(0.95, 0.5 + reportCount * 0.05 + (1 - Math.abs(0.5 - weightedScore)) * 0.2);

  return {
    provisionalStatus,
    confidence,
    reportCount,
    meetsMinimum: true,
    weightedScore,
    breakdown: { sentimentAvg, activityAvg, negativeRatio },
    rationale,
  };
}

export function mapReportsForRag(
  reports: Pick<CitizenReport, "sentiment" | "sentimentScore" | "activityScore" | "weight" | "type">[]
): RagInputReport[] {
  return reports.map((r) => ({
    sentiment: r.sentiment,
    sentimentScore: r.sentimentScore,
    activityScore: r.activityScore,
    weight: r.weight,
    type: r.type,
  }));
}
