import { PrismaClient } from "@prisma/client";
import { isMockDb, mockPrisma } from "./mock-db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createRealClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

/**
 * Drop-in data client:
 * - DATA_SOURCE=mock → JSON file (data/mock-db.json), no live DB
 * - otherwise → Prisma (SQLite/Postgres)
 */
export const prisma = (
  isMockDb() ? mockPrisma : createRealClient()
) as unknown as PrismaClient;
