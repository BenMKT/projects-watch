/**
 * Shared OpenAI credentials for sentiment / vision / Whisper STT.
 * Prefer service-specific keys when set; else OPENAI_API_KEY.
 */
export function getOpenAiApiKey(
  ...specific: Array<string | undefined>
): string | undefined {
  for (const k of specific) {
    const t = k?.trim();
    if (t) return t;
  }
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

export const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
export const OPENAI_WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";
