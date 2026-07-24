import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { computeProvisionalRag, mapReportsForRag } from "@/lib/rag-engine";
import { buildEscalationPlan, computeDeadline } from "@/lib/escalation";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { assertWritable, demoWriteBlockedResponse } from "@/lib/demo-guard";

const publishSchema = z.object({
  projectId: z.string(),
  finalRag: z.enum(["GREEN", "AMBER", "RED"]),
  triggerEscalation: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const reports = await prisma.citizenReport.findMany({ where: { projectId } });
  const rag = computeProvisionalRag(mapReportsForRag(reports));
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { provisionalRag: true, finalRag: true, statusPublished: true },
  });

  return NextResponse.json({ ...rag, project });
}

export async function POST(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("project:publish_status");
  if (error || !user) return error!;

  const body = await req.json();
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, finalRag, triggerEscalation, notes } = parsed.data;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      finalRag,
      provisionalRag: finalRag,
      statusPublished: true,
    },
  });

  let escalation = null;
  if (triggerEscalation) {
    const plan = buildEscalationPlan(finalRag);
    if (plan) {
      escalation = await prisma.escalation.create({
        data: {
          projectId,
          level: plan.level,
          ragTrigger: finalRag,
          deadline: computeDeadline(new Date(), plan.deadlineDays),
          recipients: plan.recipients as Prisma.InputJsonValue,
          notifiedBodies: plan.notifiedBodies as Prisma.InputJsonValue,
          publicStatement: plan.requiresPublicStatement
            ? `Public notice: Project ${project.projectCode} (${project.name}) has been classified ${finalRag}. Authorities notified.`
            : null,
          handlerId: user.id,
        },
      });

      await prisma.ministryResponse.create({
        data: {
          projectId,
          escalationId: escalation.id,
          actorId: user.id,
          status: "PENDING",
          acknowledgement: notes || `Status published as ${finalRag}`,
        },
      });
    }
  }

  await writeAuditLog({
    userId: user.id,
    action: "RAG_STATUS_PUBLISHED",
    entity: "Project",
    entityId: projectId,
    metadata: { finalRag, escalationId: escalation?.id, notes },
  });

  return NextResponse.json({ project, escalation });
}
