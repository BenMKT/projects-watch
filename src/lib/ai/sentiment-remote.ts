import type { SentimentLabel } from "@prisma/client";
import type { SentimentResult } from "./sentiment-types";
import { analyseSentimentMock } from "./sentiment-mock";

function mapLabel(raw: string): SentimentLabel {
  const u = raw.toUpperCase().replace(/\s+/g, "_");
  if (
    u.includes("POS") ||
    u === "LABEL_1" ||
    u === "LABEL_2" ||
    u.includes("GOOD")
  ) {
    return "POSITIVE";
  }
  if (
    u.includes("NEG") ||
    u === "LABEL_0" ||
    u.includes("BAD")
  ) {
    return "NEGATIVE";
  }
  return "NEUTRAL";
}

/**
 * Parse Hugging Face text-classification or CDW custom JSON into SentimentResult.
 */
export function parseSentimentApiPayload(
  data: unknown,
  text: string
): SentimentResult | null {
  // CDW custom: { label, score, keywords? }
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "label" in data &&
    "score" in data
  ) {
    const row = data as { label: string; score: number; keywords?: string[] };
    return {
      label: mapLabel(String(row.label)),
      score: Math.max(0, Math.min(1, Number(row.score))),
      keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
      provider: "remote",
    };
  }

  // HF style: [[{ label, score }, ...]] or [{ label, score }, ...]
  let rows: Array<{ label?: string; score?: number }> | null = null;
  if (Array.isArray(data)) {
    if (Array.isArray(data[0])) {
      rows = data[0] as Array<{ label?: string; score?: number }>;
    } else {
      rows = data as Array<{ label?: string; score?: number }>;
    }
  }

  if (!rows?.length) return null;

  const ranked = [...rows].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const top = ranked[0];
  if (!top?.label) return null;

  const label = mapLabel(top.label);
  let score = Number(top.score ?? 0.5);

  // For binary models, expose polarity score (1 = positive)
  const pos = ranked.find((r) => mapLabel(String(r.label)) === "POSITIVE");
  const neg = ranked.find((r) => mapLabel(String(r.label)) === "NEGATIVE");
  if (pos?.score != null && neg?.score != null) {
    score = pos.score / (pos.score + neg.score || 1);
  } else if (label === "NEGATIVE") {
    score = 1 - score;
  }

  const keywords = text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4)
    .slice(0, 6);

  return {
    label,
    score: Math.max(0, Math.min(1, score)),
    keywords,
    provider: "remote",
  };
}

/**
 * Call SENTIMENT_API_URL (HF Inference or custom). Falls back to mock on failure.
 */
export async function analyseSentimentRemote(text: string): Promise<SentimentResult> {
  const url = process.env.SENTIMENT_API_URL?.trim();
  if (!url) {
    console.warn("[sentiment] SENTIMENT_PROVIDER=remote but SENTIMENT_API_URL is empty — using mock");
    return analyseSentimentMock(text);
  }

  const apiKey = process.env.SENTIMENT_API_KEY?.trim();
  const timeoutMs = Number(process.env.SENTIMENT_TIMEOUT_MS || 8000);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      // HF Inference + generic { text } / { inputs }
      body: JSON.stringify({
        inputs: text,
        text,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[sentiment] remote ${res.status}: ${body.slice(0, 200)} — fallback mock`);
      return analyseSentimentMock(text);
    }

    const data = await res.json();
    const parsed = parseSentimentApiPayload(data, text);
    if (!parsed) {
      console.warn("[sentiment] unrecognized remote payload — fallback mock");
      return analyseSentimentMock(text);
    }
    return parsed;
  } catch (err) {
    console.warn("[sentiment] remote error — fallback mock", err);
    return analyseSentimentMock(text);
  } finally {
    clearTimeout(timer);
  }
}
