import type { ActivityAnalysis } from "./sentiment-types";
import type { MediaActivityInput } from "./vision-types";
import { analyseMediaActivityMock } from "./vision-mock";
import { getOpenAiApiKey, OPENAI_CHAT_URL } from "./openai-config";

const SYSTEM_PROMPT = `You are a civic infrastructure evidence analyst for Citizen Development Watch (Uganda).
Given a site photo, assess construction / public-works activity.
Return ONLY valid JSON with this shape:
{
  "activityScore": number between 0 and 1 (1 = clear active construction/progress, 0 = abandoned/stalled/no works),
  "signals": string[] from this vocabulary when applicable:
    construction_active, stalled_site, materials_present, workers_visible, machinery_visible,
    incomplete_structure, unsafe_conditions, debris_or_waste, road_works, water_infrastructure, unclear,
  "summary": short sentence (max 160 chars)
}`;

function pickImageRef(metadata?: MediaActivityInput): string | null {
  if (metadata?.imageUrl?.startsWith("http")) return metadata.imageUrl;
  if (metadata?.imageDataUrl?.startsWith("data:image")) return metadata.imageDataUrl;
  return null;
}

function parseVisionJson(raw: string): ActivityAnalysis | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const data = JSON.parse(cleaned) as {
      activityScore?: number;
      signals?: unknown;
      summary?: string;
    };
    const score = Number(data.activityScore);
    if (Number.isNaN(score)) return null;
    const signals = Array.isArray(data.signals)
      ? data.signals.map(String).slice(0, 12)
      : [];
    return {
      activityScore: Math.max(0, Math.min(1, score)),
      signals,
      summary: typeof data.summary === "string" ? data.summary.slice(0, 200) : undefined,
      provider: "remote",
    };
  } catch {
    return null;
  }
}

/**
 * OpenAI GPT-4o-mini (or compatible) vision via chat completions.
 * Falls back to mock heuristics if misconfigured or on error.
 */
export async function analyseMediaActivityRemote(
  metadata?: MediaActivityInput
): Promise<ActivityAnalysis> {
  const imageRef = pickImageRef(metadata);
  if (!imageRef) {
    console.warn("[vision] remote requested but no imageUrl/imageDataUrl — mock fallback");
    return analyseMediaActivityMock(metadata);
  }

  const apiKey = getOpenAiApiKey(process.env.VISION_API_KEY);
  if (!apiKey) {
    console.warn("[vision] VISION_PROVIDER=remote but no API key — mock fallback");
    return analyseMediaActivityMock(metadata);
  }

  const url = process.env.VISION_API_URL?.trim() || OPENAI_CHAT_URL;
  const model = process.env.VISION_MODEL?.trim() || "gpt-4o-mini";
  const timeoutMs = Number(process.env.VISION_TIMEOUT_MS || 20000);

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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse this project-site evidence photo for construction activity.",
              },
              {
                type: "image_url",
                image_url: { url: imageRef, detail: "low" },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[vision] remote ${res.status}: ${body.slice(0, 200)} — mock fallback`);
      return analyseMediaActivityMock(metadata);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("[vision] empty remote content — mock fallback");
      return analyseMediaActivityMock(metadata);
    }

    const parsed = parseVisionJson(content);
    if (!parsed) {
      console.warn("[vision] could not parse JSON — mock fallback");
      return analyseMediaActivityMock(metadata);
    }

    // Merge cheap metadata signals without overwriting vision score
    const mock = analyseMediaActivityMock(metadata);
    const merged = Array.from(new Set([...parsed.signals, ...mock.signals.filter((s) => s === "video_evidence")]));
    return { ...parsed, signals: merged };
  } catch (err) {
    console.warn("[vision] remote error — mock fallback", err);
    return analyseMediaActivityMock(metadata);
  } finally {
    clearTimeout(timer);
  }
}
