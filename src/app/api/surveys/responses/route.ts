import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { encryptOfflineDraft, decryptOfflineDraft } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { assertWritable, demoWriteBlockedResponse } from "@/lib/demo-guard";

const responseSchema = z.object({
  surveyId: z.string(),
  householdCode: z.string(),
  answers: z.record(z.string(), z.any()),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  photoCache: z.array(z.string()).default([]),
  isOfflineDraft: z.boolean().default(false),
  clientId: z.string().optional(),
  clientUpdatedAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("survey:conduct");
  if (error || !user) return error!;

  const body = await req.json();
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const encryptedDraft = encryptOfflineDraft({
    answers: data.answers,
    photoCache: data.photoCache,
    householdCode: data.householdCode,
  });

  // Conflict detection for offline sync
  if (data.clientId) {
    const existing = await prisma.surveyResponse.findFirst({
      where: {
        surveyId: data.surveyId,
        householdCode: data.householdCode,
        officerId: user.id,
      },
    });

    if (existing && data.clientUpdatedAt) {
      if (existing.updatedAt > new Date(data.clientUpdatedAt)) {
        return NextResponse.json(
          {
            conflict: true,
            serverUpdatedAt: existing.updatedAt.toISOString(),
            serverId: existing.id,
          },
          { status: 409 }
        );
      }
    }
  }

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: data.surveyId,
      officerId: user.id,
      householdCode: data.householdCode,
      answers: data.answers as Prisma.InputJsonValue,
      latitude: data.latitude,
      longitude: data.longitude,
      photoCache: data.photoCache as Prisma.InputJsonValue,
      encryptedDraft,
      isOfflineDraft: data.isOfflineDraft,
      syncedAt: data.isOfflineDraft ? null : new Date(),
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: data.isOfflineDraft ? "SURVEY_OFFLINE_DRAFT" : "SURVEY_RESPONSE_SYNCED",
    entity: "SurveyResponse",
    entityId: response.id,
  });

  return NextResponse.json({ ok: true, id: response.id }, { status: 201 });
}

/** Bulk sync endpoint for offline queue */
export async function PUT(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("survey:conduct");
  if (error || !user) return error!;

  const body = await req.json();
  const items = z.array(responseSchema).safeParse(body.drafts);
  if (!items.success) {
    return NextResponse.json({ error: items.error.flatten() }, { status: 400 });
  }

  const results = [];
  for (const data of items.data) {
    try {
      const encryptedDraft = encryptOfflineDraft(data.answers);
      const created = await prisma.surveyResponse.create({
        data: {
          surveyId: data.surveyId,
          officerId: user.id,
          householdCode: data.householdCode,
          answers: data.answers as Prisma.InputJsonValue,
          latitude: data.latitude,
          longitude: data.longitude,
          photoCache: data.photoCache as Prisma.InputJsonValue,
          encryptedDraft,
          isOfflineDraft: false,
          syncedAt: new Date(),
          conflictResolved: true,
        },
      });
      results.push({ householdCode: data.householdCode, ok: true, id: created.id });
    } catch (e) {
      results.push({ householdCode: data.householdCode, ok: false, error: String(e) });
    }
  }

  return NextResponse.json({ results });
}

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth("survey:view_raw");
  if (error || !user) return error!;

  const surveyId = new URL(req.url).searchParams.get("surveyId");
  const responses = await prisma.surveyResponse.findMany({
    where: surveyId ? { surveyId } : undefined,
    include: {
      survey: { select: { title: true, domain: true, district: true } },
      officer: { select: { name: true, district: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Decrypt drafts only for authorized roles
  const enriched = responses.map((r) => ({
    ...r,
    decryptedPreview: r.encryptedDraft
      ? decryptOfflineDraft<Record<string, unknown>>(r.encryptedDraft)
      : null,
  }));

  return NextResponse.json(enriched);
}
