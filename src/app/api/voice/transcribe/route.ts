import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getVoiceSttProvider, voiceSttRemoteConfigured } from "@/lib/ai/providers";
import { transcribeAudioRemote } from "@/lib/ai/voice-stt";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/mp3",
  "video/webm", // MediaRecorder often uses this
]);

/**
 * Remote speech-to-text. Requires VOICE_STT_PROVIDER=remote + VOICE_STT_API_URL.
 * Auth required (same as report submit). Transcript then goes through existing sentiment on report create.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth("report:submit");
  if (error) return error;

  if (getVoiceSttProvider() !== "remote" || !voiceSttRemoteConfigured()) {
    return NextResponse.json(
      {
        error:
          "Remote voice STT is not enabled. Set VOICE_STT_PROVIDER=remote and VOICE_STT_API_URL, or use browser speech in the form.",
      },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio exceeds 25MB limit" }, { status: 400 });
  }
  if (file.type && !ALLOWED.has(file.type) && !file.type.startsWith("audio/")) {
    return NextResponse.json(
      { error: `Unsupported audio type: ${file.type}` },
      { status: 400 }
    );
  }

  try {
    const result = await transcribeAudioRemote(file, file.name || "voice.webm");
    return NextResponse.json({
      transcript: result.transcript,
      provider: result.provider,
      language: result.language,
    });
  } catch (err) {
    console.error("[voice/transcribe]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Transcription failed",
        fallback: "browser",
      },
      { status: 502 }
    );
  }
}
