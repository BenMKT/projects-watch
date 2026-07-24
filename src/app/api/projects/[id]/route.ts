import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { orderIndex: "asc" } },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          content: true,
          sentiment: true,
          sentimentScore: true,
          activityScore: true,
          anonymisedReporter: true,
          mediaUrls: true,
          latitude: true,
          longitude: true,
          createdAt: true,
        },
      },
      escalations: { orderBy: { createdAt: "desc" }, take: 5 },
      ministryResponses: { orderBy: { createdAt: "desc" }, take: 10 },
      performanceLogs: { orderBy: { recordedAt: "desc" }, take: 5 },
      _count: { select: { reports: true, subscriptions: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
