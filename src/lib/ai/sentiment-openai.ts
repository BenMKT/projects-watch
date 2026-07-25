import type { SentimentLabel } from "@prisma/client";
import type { SentimentResult } from "./sentiment-types";
import { analyseSentimentMock } from "./sentiment-mock";
import { getOpenAiApiKey, OPENAI_CHAT_URL } from "./openai-config";

const SYSTEM_PROMPT = `You are a civic sentiment classifier for Citizen Development Watch (Uganda public works feedback).
Classify citizen/officer report text about infrastructure projects.
Return ONLY valid JSON:
{
  "label": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "score": number 0..1 where 1 is strongly positive / on-track and 0 is strongly negative / stalled,
  "keywords": string[] up to 6 salient terms from the text
}`;

function coerceLabel(raw: string): SentimentLabel {
  const u = raw.toUpperCase();
  if (u.includes("POS")) return "POSITIVE";
  if (u.includes("NEG")) return "NEGATIVE";
  return "NEUTRAL";
}

/**
 * OpenAI chat completions sentiment (gpt-4o-mini by default).
 * Uses SENTIMENT_API_KEY or OPENAI_API_KEY. Falls back to mock on failure.
 */
export async function analyseSentimentOpenAi(text: string): Promise<SentimentResult> {
  const apiKey = getOpenAiApiKey(process.env.SENTIMENT_API_KEY);
  if (!apiKey) {
    console.warn("[sentiment] SENTIMENT_PROVIDER=openai but no API key — mock fallback");
    return analyseSentimentMock(text);
  }

  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { label: "NEUTRAL", score: 0.5, keywords: [], provider: "openai" };
  }

  const url = process.env.SENTIMENT_API_URL?.trim() || OPENAI_CHAT_URL;
  const model =
    process.env.SENTIMENT_MODEL?.trim() ||
    process.env.VISION_MODEL?.trim() ||
    "gpt-4o-mini";
  const timeoutMs = Number(process.env.SENTIMENT_TIMEOUT_MS || 12000);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: trimmed.slice(0, 4000) },
        ],
        max_tokens: 200,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[sentiment] openai ${res.status}: ${body.slice(0, 200)} — mock fallback`);
      return analyseSentimentMock(text);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return analyseSentimentMock(text);
    }

    const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as {
      label?: string;
      score?: number;
      keywords?: unknown;
    };

    return {
      label: coerceLabel(String(parsed.label || "NEUTRAL")),
      score: Math.max(0, Math.min(1, Number(parsed.score ?? 0.5))),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map(String).slice(0, 6)
        : [],
      provider: "openai",
    };
  } catch (err) {
    console.warn("[sentiment] openai error — mock fallback", err);
    return analyseSentimentMock(text);
  } finally {
    clearTimeout(timer);
  }
}
