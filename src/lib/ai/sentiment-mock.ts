import type { SentimentLabel } from "@prisma/client";
import type { SentimentResult } from "./sentiment-types";

const POSITIVE_WORDS = [
  "progress", "complete", "good", "excellent", "working", "active", "finished",
  "quality", "on track", "improved", "satisfied", "happy", "delivered", "success",
];

const NEGATIVE_WORDS = [
  "stalled", "abandoned", "delay", "poor", "broken", "missing", "corrupt",
  "incomplete", "slow", "stopped", "failed", "unsafe", "absent", "theft", "waste",
];

/** Lexicon mock — default for demo / offline / API fallback. */
export function analyseSentimentMock(text: string): SentimentResult {
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
    return { label: "NEUTRAL", score: 0.5, keywords: [], provider: "mock" };
  }

  const score = pos / total;
  let label: SentimentLabel = "NEUTRAL";
  if (score >= 0.6) label = "POSITIVE";
  else if (score <= 0.4) label = "NEGATIVE";

  return { label, score, keywords, provider: "mock" };
}
