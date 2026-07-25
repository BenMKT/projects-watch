import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { isMockDb } from "@/lib/mock-db";
import { assertWritable, demoWriteBlockedResponse } from "@/lib/demo-guard";
import { writeAuditLog } from "@/lib/audit";

const MAX_BYTES = 200 * 1024 * 1024; // 200MB
const ALLOWED = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth("briefing:publish");
  if (error || !user) return error;

  if (isMockDb()) {
    return NextResponse.json(
      {
        error:
          "Demo mode is URL-only for Chamber Briefings. Switch DATA_SOURCE=prisma and configure BLOB_READ_WRITE_TOKEN for attachments.",
      },
      { status: 403 }
    );
  }

  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err) ?? NextResponse.json({ error: "Write blocked" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured on this deployment." },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "").trim();
  const narrative = String(form.get("narrative") || "").trim();
  const sessionDate = String(form.get("sessionDate") || "").trim();
  const committee = String(form.get("committee") || "").trim() || null;
  const district = String(form.get("district") || "").trim() || null;
  const published = String(form.get("published") || "true") !== "false";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing video file" }, { status: 400 });
  }
  if (!title || title.length < 3 || !narrative || narrative.length < 10 || !sessionDate) {
    return NextResponse.json(
      { error: "title, narrative (≥10 chars), and sessionDate are required" },
      { status: 400 }
    );
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use MP4, WebM, or QuickTime." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 200MB limit" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `chamber-briefings/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: file.type,
  });

  const briefing = await prisma.chamberBriefing.create({
    data: {
      title,
      narrative,
      videoSource: "BLOB",
      videoUrl: blob.url,
      blobPath: blob.pathname,
      mimeType: file.type,
      fileSize: file.size,
      sessionDate: new Date(sessionDate),
      committee,
      district,
      published,
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "BRIEFING_UPLOADED",
    entity: "ChamberBriefing",
    entityId: briefing.id,
    metadata: { videoSource: "BLOB", pathname: blob.pathname, bytes: file.size },
  });

  return NextResponse.json({ briefing }, { status: 201 });
}
