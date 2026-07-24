import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { assertWritable, demoWriteBlockedResponse } from "@/lib/demo-guard";

const projectSchema = z.object({
  projectCode: z.string().min(3),
  name: z.string().min(3),
  contractor: z.string().min(2),
  contractSum: z.number().positive(),
  durationMonths: z.number().int().positive(),
  scope: z.string().min(10),
  district: z.string(),
  sector: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  baselinePhotos: z.array(z.string()).default([]),
  startDate: z.string(),
  endDate: z.string().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        dueDate: z.string(),
        orderIndex: z.number().int(),
      })
    )
    .default([]),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const district = searchParams.get("district");
  const rag = searchParams.get("rag");
  const publishedOnly = searchParams.get("published") !== "false";

  const projects = await prisma.project.findMany({
    where: {
      ...(district ? { district } : {}),
      ...(rag ? { finalRag: rag as "GREEN" | "AMBER" | "RED" | "PENDING" } : {}),
      ...(publishedOnly ? { statusPublished: true } : {}),
    },
    include: {
      milestones: { orderBy: { orderIndex: "asc" } },
      _count: { select: { reports: true, subscriptions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("project:create");
  if (error || !user) return error!;

  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const project = await prisma.project.create({
    data: {
      projectCode: data.projectCode,
      name: data.name,
      contractor: data.contractor,
      contractSum: data.contractSum,
      durationMonths: data.durationMonths,
      scope: data.scope,
      district: data.district,
      sector: data.sector,
      latitude: data.latitude,
      longitude: data.longitude,
      baselinePhotos: data.baselinePhotos as Prisma.InputJsonValue,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      createdById: user.id,
      milestones: {
        create: data.milestones.map((m) => ({
          title: m.title,
          description: m.description,
          dueDate: new Date(m.dueDate),
          orderIndex: m.orderIndex,
        })),
      },
    },
    include: { milestones: true },
  });

  await writeAuditLog({
    userId: user.id,
    action: "PROJECT_ONBOARDED",
    entity: "Project",
    entityId: project.id,
    metadata: { projectCode: project.projectCode, name: project.name },
  });

  return NextResponse.json(project, { status: 201 });
}
