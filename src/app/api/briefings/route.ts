import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { isMockDb } from "@/lib/mock-db";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  title: z.string().min(3).max(200),
  narrative: z.string().min(10).max(2000),
  videoUrl: z.string().url(),
  videoSource: z.enum(["URL", "BLOB"]).default("URL"),
  blobPath: z.string().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable().or(z.literal("")),
  sessionDate: z.string().min(1),
  committee: z.string().max(120).optional().nullable(),
  district: z.string().max(80).optional().nullable(),
  published: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";

  let includeDrafts = false;
  if (all) {
    const { error } = await requireAuth("briefing:publish");
    if (error) return error;
    includeDrafts = true;
  }

  const briefings = await prisma.chamberBriefing.findMany({
    where: includeDrafts ? undefined : { published: true },
    orderBy: { sessionDate: "desc" },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
    take: 100,
  });

  return NextResponse.json({
    briefings,
    demo: isMockDb(),
    uploadEnabled: !isMockDb() && Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth("briefing:publish");
  if (error || !user) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (isMockDb() && data.videoSource === "BLOB") {
    return NextResponse.json(
      {
        error: "Demo mode only supports linked (URL) videos. Attachments require Blob + a live database.",
      },
      { status: 400 }
    );
  }

  const briefing = await prisma.chamberBriefing.create({
    data: {
      title: data.title,
      narrative: data.narrative,
      videoSource: data.videoSource,
      videoUrl: data.videoUrl,
      blobPath: data.blobPath ?? null,
      mimeType: data.mimeType ?? null,
      fileSize: data.fileSize ?? null,
      thumbnailUrl: data.thumbnailUrl || null,
      sessionDate: new Date(data.sessionDate),
      committee: data.committee || null,
      district: data.district || null,
      published: data.published,
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  try {
    await writeAuditLog({
      userId: user.id,
      action: "BRIEFING_PUBLISHED",
      entity: "ChamberBriefing",
      entityId: briefing.id,
      metadata: { videoSource: data.videoSource, title: data.title },
    });
  } catch {
    // audit may be read-only in mock
  }

  return NextResponse.json({ briefing }, { status: 201 });
}
