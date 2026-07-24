import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { isMockDb } from "@/lib/mock-db";
import { assertWritable, demoWriteBlockedResponse } from "@/lib/demo-guard";

export async function GET() {
  const { error } = await requireAuth("escalation:manage");
  if (error) {
    // Public can see high-level open critical escalations (no internal notes)
    const publicEsc = await prisma.escalation.findMany({
      where: { level: "CRITICAL", publicStatement: { not: null } },
      select: {
        id: true,
        level: true,
        status: true,
        deadline: true,
        publicStatement: true,
        notifiedBodies: true,
        project: { select: { name: true, projectCode: true, district: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(publicEsc);
  }

  const escalations = await prisma.escalation.findMany({
    include: {
      project: true,
      responses: { include: { actor: { select: { name: true, role: true } } } },
      handler: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Mark overdue (skip persistence in mock demo)
  const now = new Date();
  for (const e of escalations) {
    if ((e.status === "OPEN" || e.status === "ACKNOWLEDGED") && e.deadline < now) {
      if (!isMockDb()) {
        await prisma.escalation.update({
          where: { id: e.id },
          data: { status: "OVERDUE" },
        });
      }
      e.status = "OVERDUE";
    }
  }

  return NextResponse.json(escalations);
}

const updateSchema = z.object({
  escalationId: z.string(),
  status: z.enum(["ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"]),
  acknowledgement: z.string().optional(),
  actionTaken: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("escalation:manage");
  if (error || !user) return error!;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { escalationId, status, acknowledgement, actionTaken } = parsed.data;

  const escalation = await prisma.escalation.update({
    where: { id: escalationId },
    data: { status, handlerId: user.id },
  });

  await prisma.ministryResponse.create({
    data: {
      projectId: escalation.projectId,
      escalationId,
      actorId: user.id,
      status:
        status === "ACKNOWLEDGED"
          ? "ACKNOWLEDGED"
          : status === "RESOLVED"
            ? "CLOSED"
            : "ACTIONED",
      acknowledgement,
      actionTaken,
      acknowledgedAt: status === "ACKNOWLEDGED" ? new Date() : undefined,
      actionedAt: status === "IN_PROGRESS" || status === "RESOLVED" ? new Date() : undefined,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: `ESCALATION_${status}`,
    entity: "Escalation",
    entityId: escalationId,
    metadata: { acknowledgement, actionTaken },
  });

  return NextResponse.json(escalation);
}
