import { getSentimentProvider } from "./providers";
import { analyseSentimentMock } from "./sentiment-mock";
import { analyseSentimentRemote } from "./sentiment-remote";
import { analyseSentimentOpenAi } from "./sentiment-openai";
import { analyseMediaActivity as analyseMediaActivityVision } from "./vision";
import type { MediaActivityInput } from "./vision-types";
import type { ActivityAnalysis, SentimentResult } from "./sentiment-types";

export type { ActivityAnalysis, SentimentResult } from "./sentiment-types";
export type { MediaActivityInput } from "./vision-types";

/**
 * Pluggable sentiment analysis (env switch).
 * - mock   → lexicon (default, demo-safe)
 * - remote → HF / custom SENTIMENT_API_URL
 * - openai → GPT-4o-mini via OPENAI_API_KEY (production pattern)
 * Falls back to mock if remote/openai fails.
 */
export async function analyseSentiment(text: string): Promise<SentimentResult> {
  const provider = getSentimentProvider();
  if (provider === "openai") {
    return analyseSentimentOpenAi(text);
  }
  if (provider === "remote") {
    return analyseSentimentRemote(text);
  }
  return analyseSentimentMock(text);
}

/**
 * Sync lexicon path for tests / offline helpers.
 * Prefer `analyseSentiment` in API routes so remote providers work.
 */
export function analyseSentimentLocal(text: string): SentimentResult {
  return analyseSentimentMock(text);
}

/** Re-export vision activity analysis (mock | GPT-4o-mini remote). */
export async function analyseMediaActivity(
  metadata?: MediaActivityInput
): Promise<ActivityAnalysis> {
  return analyseMediaActivityVision(metadata);
}
