import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAuth("audit:view");
  if (error) return error;

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const policies = await prisma.dataRetentionPolicy.findMany();

  return NextResponse.json({ logs, policies });
}
