import type { ActivityAnalysis } from "./sentiment-types";
import type { MediaActivityInput } from "./vision-types";

/** Metadata heuristics — default / demo / remote fallback. */
export function analyseMediaActivityMock(metadata?: MediaActivityInput): ActivityAnalysis {
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

  return {
    activityScore: Math.min(1, score),
    signals,
    provider: "mock",
    summary: "Heuristic activity score from capture metadata (no pixel analysis).",
  };
}
