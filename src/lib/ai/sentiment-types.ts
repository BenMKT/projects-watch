import type { SentimentLabel } from "@prisma/client";

export interface SentimentResult {
  label: SentimentLabel;
  score: number;
  keywords: string[];
  /** Which implementation produced this result */
  provider?: "mock" | "remote" | "openai";
}

export interface ActivityAnalysis {
  activityScore: number;
  signals: string[];
  /** Which vision implementation produced this result */
  provider?: "mock" | "remote";
  summary?: string;
}
