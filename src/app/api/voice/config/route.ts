import { NextResponse } from "next/server";
import { voiceSttPublicConfig } from "@/lib/ai/voice-stt";

/** Public STT mode for the evidence form (no secrets). */
export async function GET() {
  return NextResponse.json(voiceSttPublicConfig());
}
