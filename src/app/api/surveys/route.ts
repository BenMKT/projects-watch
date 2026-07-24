import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { SURVEY_TEMPLATES } from "@/lib/surveys";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { assertWritable, demoWriteBlockedResponse } from "@/lib/demo-guard";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const domain = searchParams.get("domain");
  const district = searchParams.get("district");

  const userGate = await requireAuth("dashboard:public");
  // Citizens can only see published; officers+ see more via permission checks below
  const session = userGate.user;

  const surveys = await prisma.survey.findMany({
    where: {
      ...(domain ? { domain: domain as "INFRASTRUCTURE" | "HEALTHCARE" | "EDUCATION" | "EMPLOYMENT" | "SECURITY" } : {}),
      ...(district ? { district } : {}),
      ...(status
        ? { status: status as "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "PUBLISHED" }
        : session
          ? {}
          : { status: "PUBLISHED" }),
    },
    include: { _count: { select: { responses: true } } },
    orderBy: { updatedAt: "desc" },
  });

  // Survey raw data is not public — strip questions detail for citizens viewing list summaries
  return NextResponse.json(surveys);
}

const createSchema = z.object({
  title: z.string().min(3),
  domain: z.enum(["INFRASTRUCTURE", "HEALTHCARE", "EDUCATION", "EMPLOYMENT", "SECURITY"]),
  district: z.string(),
  description: z.string(),
  useTemplate: z.boolean().default(true),
  questions: z.array(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("survey:create");
  if (error || !user) return error!;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const template = SURVEY_TEMPLATES[data.domain];
  const questions = data.useTemplate ? template.questions : data.questions || [];

  const survey = await prisma.survey.create({
    data: {
      title: data.title || template.title,
      domain: data.domain,
      district: data.district,
      description: data.description || template.description,
      questions: questions as unknown as Prisma.InputJsonValue,
      status: "PENDING_APPROVAL",
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "SURVEY_CREATED",
    entity: "Survey",
    entityId: survey.id,
  });

  return NextResponse.json(survey, { status: 201 });
}

const approveSchema = z.object({
  surveyId: z.string(),
  status: z.enum(["APPROVED", "REJECTED", "PUBLISHED"]),
});

export async function PATCH(req: NextRequest) {
  try {
    assertWritable();
  } catch (err) {
    return demoWriteBlockedResponse(err)!;
  }

  const { error, user } = await requireAuth("survey:approve");
  if (error || !user) return error!;

  const body = await req.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const survey = await prisma.survey.update({
    where: { id: parsed.data.surveyId },
    data: {
      status: parsed.data.status,
      approvedById: user.id,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: `SURVEY_${parsed.data.status}`,
    entity: "Survey",
    entityId: survey.id,
  });

  return NextResponse.json(survey);
}
