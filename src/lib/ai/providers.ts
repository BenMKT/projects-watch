/**
 * AI / analytics provider switches (set in .env).
 *
 * SENTIMENT_PROVIDER = mock | remote | openai
 * CLUSTER_PROVIDER   = grid | supercluster   (always local — not an LLM)
 * VOICE_STT_PROVIDER = browser | remote
 * VISION_PROVIDER    = mock | remote
 *
 * Production stack (single OpenAI key):
 *   OPENAI_API_KEY=sk-...
 *   SENTIMENT_PROVIDER=openai
 *   VOICE_STT_PROVIDER=remote
 *   VISION_PROVIDER=remote
 *   CLUSTER_PROVIDER=supercluster
 */

import { getOpenAiApiKey } from "./openai-config";

export type SentimentProvider = "mock" | "remote" | "openai";
export type ClusterProvider = "grid" | "supercluster";
export type VoiceSttProvider = "browser" | "remote";
export type VisionProvider = "mock" | "remote";

export function getSentimentProvider(): SentimentProvider {
  const v = (process.env.SENTIMENT_PROVIDER || "mock").toLowerCase().trim();
  if (v === "openai" || v === "gpt") return "openai";
  if (v === "remote" || v === "http" || v === "hf") return "remote";
  return "mock";
}

export function getClusterProvider(): ClusterProvider {
  const v = (process.env.CLUSTER_PROVIDER || "grid").toLowerCase().trim();
  return v === "supercluster" ? "supercluster" : "grid";
}

export function getVoiceSttProvider(): VoiceSttProvider {
  const v = (process.env.VOICE_STT_PROVIDER || "browser").toLowerCase().trim();
  // "openai" alias → remote Whisper defaults
  return v === "remote" || v === "openai" || v === "whisper" ? "remote" : "browser";
}

export function getVisionProvider(): VisionProvider {
  const v = (process.env.VISION_PROVIDER || "mock").toLowerCase().trim();
  return v === "remote" || v === "openai" ? "remote" : "mock";
}

export function sentimentHttpConfigured(): boolean {
  return Boolean(process.env.SENTIMENT_API_URL?.trim());
}

export function sentimentOpenAiConfigured(): boolean {
  return Boolean(getOpenAiApiKey(process.env.SENTIMENT_API_KEY));
}

/** @deprecated use sentimentHttpConfigured / sentimentOpenAiConfigured */
export function sentimentRemoteConfigured(): boolean {
  return sentimentHttpConfigured() || sentimentOpenAiConfigured();
}

export function voiceSttRemoteConfigured(): boolean {
  // Explicit custom STT URL, or shared OpenAI key (defaults to Whisper endpoint)
  if (process.env.VOICE_STT_API_URL?.trim()) return true;
  return Boolean(getOpenAiApiKey(process.env.VOICE_STT_API_KEY));
}

export function visionRemoteConfigured(): boolean {
  return Boolean(getOpenAiApiKey(process.env.VISION_API_KEY));
}
