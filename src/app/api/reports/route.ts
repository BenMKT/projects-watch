import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { anonymiseReporter, encryptPayload } from "@/lib/encryption";
import { analyseSentiment, analyseMediaActivity } from "@/lib/ai/sentiment";
import { computeProvisionalRag, mapReportsForRag } from "@/lib/rag-engine";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { assertWritable, demoWriteBlockedResponse } from "@/lib/demo-guard";

const reportSchema = z.object({
  projectId: z.string(),
  milestoneId: z.string().optional(),
  type: z.enum(["PHOTO", "VIDEO", "WRITTEN", "VOICE", "STRUCTURED"]),
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  photoMetadata: z
    .object({
      hasExif: z.boolean().optional(),
      fileSize: z.number().optional(),
      durationSeconds: z.number().optional(),
      recentCapture: z.boolean().optional(),
      constructionKeywords: z.array(z.string()).optional(),
    })
    .optional(),
  isAnonymous: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const district = searchParams.get("district");
  const sentiment = searchParams.get("sentiment");

  const reports = await prisma.citizenReport.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(sentiment ? { sentiment: sentiment as "POSITIVE" | "NEGATIVE" | "NEUTRAL" } : {}),
      ...(district ? { project: { district } } : {}),
    },
    include: {
      project: { select: { name: true, district: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Never expose reporter identity publicly
  const safe = reports.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    projectName: r.project.name,
    district: r.project.district,
    type: r.type,
    content: r.content,
    mediaUrls: r.mediaUrls,
    latitude: r.latitude,
    longitude: r.longitude,
    sentiment: r.sentiment,
    sentimentScore: r.sentimentScore,
    activityScore: r.activityScore,
    anonymisedReporter: r.anonymisedReporter,
    createdAt: r.createdAt,
  }));

  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("report:submit");
  if (error || !user) return error!;

  const body = await req.json();
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const sentiment = analyseSentiment(data.content || "");
  const activity = analyseMediaActivity(data.photoMetadata);

  const encryptedPayload = encryptPayload(
    JSON.stringify({
      content: data.content,
      mediaUrls: data.mediaUrls,
      metadata: data.photoMetadata,
      submittedBy: user.id,
    })
  );

  const anonymised = anonymiseReporter(
    data.isAnonymous ? user.anonymisedId || user.id : user.id
  );

  const report = await prisma.citizenReport.create({
    data: {
      projectId: data.projectId,
      milestoneId: data.milestoneId,
      reporterId: data.isAnonymous ? null : user.id,
      anonymisedReporter: anonymised,
      type: data.type,
      content: data.content,
      encryptedPayload,
      mediaUrls: data.mediaUrls as Prisma.InputJsonValue,
      latitude: data.latitude,
      longitude: data.longitude,
      photoMetadata: (data.photoMetadata as Prisma.InputJsonValue) ?? undefined,
      sentiment: sentiment.label,
      sentimentScore: sentiment.score,
      activityScore: activity.activityScore,
      isAnonymous: data.isAnonymous,
      weight: data.type === "STRUCTURED" || data.type === "VOICE" ? 1.2 : 1.0,
    },
  });

  // Recompute provisional RAG
  const allReports = await prisma.citizenReport.findMany({
    where: { projectId: data.projectId },
  });
  const rag = computeProvisionalRag(mapReportsForRag(allReports));

  await prisma.project.update({
    where: { id: data.projectId },
    data: { provisionalRag: rag.provisionalStatus },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CITIZEN_REPORT_SUBMITTED",
    entity: "CitizenReport",
    entityId: report.id,
    metadata: {
      projectId: data.projectId,
      type: data.type,
      sentiment: sentiment.label,
      provisionalRag: rag.provisionalStatus,
      anonymisedReporter: anonymised,
    },
  });

  return NextResponse.json(
    {
      report: {
        id: report.id,
        anonymisedReporter: anonymised,
        sentiment: sentiment.label,
        activityScore: activity.activityScore,
      },
      provisionalRag: rag,
    },
    { status: 201 }
  );
}
