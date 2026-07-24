import { NextResponse } from "next/server";
import { isMockDb } from "@/lib/mock-db";

/** Return 403 when mock mode refuses a write. */
export function demoWriteBlockedResponse(err: unknown) {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: string }).code === "DEMO_READ_ONLY"
  ) {
    return NextResponse.json(
      {
        error: "Demo mode is read-only",
        detail: err instanceof Error ? err.message : "Write not allowed",
      },
      { status: 403 }
    );
  }
  return null;
}

export function assertWritable() {
  if (isMockDb()) {
    const err = new Error(
      "Demo mode is read-only. Browsing and sign-in work; creating/updating records requires a live database."
    );
    (err as Error & { code: string }).code = "DEMO_READ_ONLY";
    throw err;
  }
}
