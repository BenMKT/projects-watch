import { getVoiceSttProvider, voiceSttRemoteConfigured } from "./providers";
import { getOpenAiApiKey, OPENAI_WHISPER_URL } from "./openai-config";

export type VoiceTranscriptResult = {
  transcript: string;
  provider: "browser" | "remote" | "mock";
  language?: string;
  durationSeconds?: number;
};

/**
 * Whisper-compatible STT.
 * Defaults to OpenAI transcriptions URL + OPENAI_API_KEY when VOICE_STT_* unset.
 */
export async function transcribeAudioRemote(
  file: Blob,
  filename = "voice.webm"
): Promise<VoiceTranscriptResult> {
  const apiKey = getOpenAiApiKey(process.env.VOICE_STT_API_KEY);
  const url = process.env.VOICE_STT_API_URL?.trim() || (apiKey ? OPENAI_WHISPER_URL : "");
  if (!url) {
    throw new Error("VOICE_STT_API_URL is not configured");
  }
  if (!apiKey && url.includes("openai.com")) {
    throw new Error("OPENAI_API_KEY or VOICE_STT_API_KEY is required for Whisper");
  }

  const language = process.env.VOICE_STT_LANG?.trim() || "en";
  const timeoutMs = Number(process.env.VOICE_STT_TIMEOUT_MS || 45000);

  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", process.env.VOICE_STT_MODEL?.trim() || "whisper-1");
  form.append("language", language);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`STT ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const transcript = extractTranscript(data);
    if (!transcript) {
      throw new Error("STT response missing transcript text");
    }

    return {
      transcript,
      provider: "remote",
      language,
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractTranscript(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") return data.trim() || null;
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    const first = data[0] as Record<string, unknown>;
    if (typeof first.text === "string") return first.text.trim() || null;
  }
  if (typeof data === "object") {
    const row = data as Record<string, unknown>;
    if (typeof row.text === "string") return row.text.trim() || null;
    if (typeof row.transcript === "string") return row.transcript.trim() || null;
  }
  return null;
}

export function voiceSttPublicConfig() {
  const provider = getVoiceSttProvider();
  const remoteReady = provider === "remote" && voiceSttRemoteConfigured();
  return {
    provider: remoteReady ? ("remote" as const) : ("browser" as const),
    requestedProvider: provider,
    remoteConfigured: voiceSttRemoteConfigured(),
    lang: process.env.VOICE_STT_LANG?.trim() || "en-GB",
    browserFallback: true,
  };
}
