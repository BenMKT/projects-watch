import { NextResponse } from "next/server";
import { visionPublicConfig } from "@/lib/ai/vision";

/** Public vision mode for the evidence form (no secrets). */
export async function GET() {
  return NextResponse.json(visionPublicConfig());
}
