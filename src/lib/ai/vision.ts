import { getVisionProvider, visionRemoteConfigured } from "./providers";
import { analyseMediaActivityMock } from "./vision-mock";
import { analyseMediaActivityRemote } from "./vision-remote";
import type { MediaActivityInput } from "./vision-types";
import type { ActivityAnalysis } from "./sentiment-types";

export type { MediaActivityInput } from "./vision-types";

/**
 * Pluggable photo/video activity analysis.
 * - VISION_PROVIDER=mock   → metadata heuristics (default)
 * - VISION_PROVIDER=remote → GPT-4o-mini (OpenAI-compatible); falls back to mock
 */
export async function analyseMediaActivity(
  metadata?: MediaActivityInput
): Promise<ActivityAnalysis> {
  if (getVisionProvider() === "remote" && visionRemoteConfigured()) {
    return analyseMediaActivityRemote(metadata);
  }
  if (getVisionProvider() === "remote" && !visionRemoteConfigured()) {
    console.warn("[vision] VISION_PROVIDER=remote but API key missing — using mock");
  }
  return analyseMediaActivityMock(metadata);
}

export function visionPublicConfig() {
  const provider = getVisionProvider();
  const remoteReady = provider === "remote" && visionRemoteConfigured();
  return {
    provider: remoteReady ? ("remote" as const) : ("mock" as const),
    requestedProvider: provider,
    remoteConfigured: visionRemoteConfigured(),
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
    model: process.env.VISION_MODEL?.trim() || "gpt-4o-mini",
  };
}
