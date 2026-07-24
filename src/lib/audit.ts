import { prisma } from "./prisma";
import { isMockDb } from "./mock-db";
import type { Prisma } from "@prisma/client";

export async function writeAuditLog(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  if (isMockDb()) {
    // Read-only demo: skip persistence
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || undefined,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
