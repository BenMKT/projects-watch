import type { SentimentLabel } from "@prisma/client";

export interface SentimentResult {
  label: SentimentLabel;
  score: number;
  keywords: string[];
}

const POSITIVE_WORDS = [
  "progress", "complete", "good", "excellent", "working", "active", "finished",
  "quality", "on track", "improved", "satisfied", "happy", "delivered", "success",
];

const NEGATIVE_WORDS = [
  "stalled", "abandoned", "delay", "poor", "broken", "missing", "corrupt",
  "incomplete", "slow", "stopped", "failed", "unsafe", "absent", "theft", "waste",
];

/**
 * Mock AI sentiment analysis — replace with real NLP service later.
 * Analyses written/voice transcript text for development feedback tone.
 */
export function analyseSentiment(text: string): SentimentResult {
  const lower = (text || "").toLowerCase();
  let pos = 0;
  let neg = 0;
  const keywords: string[] = [];

  for (const w of POSITIVE_WORDS) {
    if (lower.includes(w)) {
      pos += 1;
      keywords.push(w);
    }
  }
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) {
      neg += 1;
      keywords.push(w);
    }
  }

  const total = pos + neg;
  if (total === 0) {
    return { label: "NEUTRAL", score: 0.5, keywords: [] };
  }

  const score = pos / total;
  let label: SentimentLabel = "NEUTRAL";
  if (score >= 0.6) label = "POSITIVE";
  else if (score <= 0.4) label = "NEGATIVE";

  return { label, score, keywords };
}

export interface ActivityAnalysis {
  activityScore: number;
  signals: string[];
}

/**
 * Mock photo/video activity analysis using metadata heuristics.
 * Ready for CV model integration (construction activity detection).
 */
export function analyseMediaActivity(metadata?: {
  hasExif?: boolean;
  fileSize?: number;
  durationSeconds?: number;
  recentCapture?: boolean;
  constructionKeywords?: string[];
}): ActivityAnalysis {
  const signals: string[] = [];
  let score = 0.4;

  if (metadata?.hasExif) {
    score += 0.15;
    signals.push("exif_present");
  }
  if (metadata?.recentCapture) {
    score += 0.2;
    signals.push("recent_capture");
  }
  if ((metadata?.fileSize || 0) > 500_000) {
    score += 0.1;
    signals.push("substantial_media");
  }
  if ((metadata?.durationSeconds || 0) > 10) {
    score += 0.1;
    signals.push("video_evidence");
  }
  if ((metadata?.constructionKeywords?.length || 0) > 0) {
    score += 0.15;
    signals.push("construction_signals");
  }

  return { activityScore: Math.min(1, score), signals };
}
