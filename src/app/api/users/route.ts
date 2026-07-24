import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";
import { anonymiseReporter } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { assertWritable, demoWriteBlockedResponse } from "@/lib/demo-guard";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["CITIZEN", "FIELD_OFFICER"]).default("CITIZEN"),
  district: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, role, district } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const anonymisedId = anonymiseReporter(email);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role as Role,
      district,
      anonymisedId,
      mfaEnabled: role === "FIELD_OFFICER",
      mfaSecret: role === "FIELD_OFFICER" ? "123456" : null,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  await writeAuditLog({
    userId: user.id,
    action: "USER_REGISTERED",
    entity: "User",
    entityId: user.id,
  });

  return NextResponse.json(user, { status: 201 });
}

export async function GET() {
  const { error } = await requireAuth("volunteer:manage");
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      district: true,
      mfaEnabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
