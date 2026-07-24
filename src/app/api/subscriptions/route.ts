import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { assertWritable, demoWriteBlockedResponse } from "@/lib/demo-guard";

export async function GET(req: NextRequest) {
  const projectId = new URL(req.url).searchParams.get("projectId");
  const user = (await requireAuth()).user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await prisma.projectSubscription.findMany({
    where: {
      userId: user.id,
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          projectCode: true,
          finalRag: true,
          district: true,
        },
      },
    },
  });

  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("project:view");
  if (error || !user) return error!;

  const { projectId } = await req.json();
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const sub = await prisma.projectSubscription.upsert({
    where: { userId_projectId: { userId: user.id, projectId } },
    create: { userId: user.id, projectId },
    update: {},
  });

  await writeAuditLog({
    userId: user.id,
    action: "PROJECT_SUBSCRIBED",
    entity: "ProjectSubscription",
    entityId: sub.id,
    metadata: { projectId },
  });

  return NextResponse.json(sub, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("project:view");
  if (error || !user) return error!;

  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  await prisma.projectSubscription.deleteMany({
    where: { userId: user.id, projectId },
  });

  return NextResponse.json({ ok: true });
}
