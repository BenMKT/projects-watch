import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { clusterPoints, buildHeatmap } from "@/lib/ai/clustering";
import { analyseSentiment } from "@/lib/ai/sentiment";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "overview";

  if (view === "export") {
    const { error } = await requireAuth("survey:export");
    if (error) return error;
  }

  const projects = await prisma.project.findMany({
    where: { statusPublished: true },
    include: {
      _count: { select: { reports: true } },
      reports: {
        select: {
          sentiment: true,
          sentimentScore: true,
          latitude: true,
          longitude: true,
          weight: true,
        },
      },
    },
  });

  const reports = await prisma.citizenReport.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: { project: { select: { name: true, district: true } } },
  });

  const escalations = await prisma.escalation.findMany({
    include: { project: { select: { name: true, projectCode: true } }, responses: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const scorecards = await prisma.developmentScorecard.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 40,
  });

  const ministry = await prisma.ministryResponse.findMany({
    include: {
      project: { select: { name: true, projectCode: true } },
      actor: { select: { name: true, role: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  const geoPoints = projects.map((p) => ({
    id: p.id,
    lat: p.latitude,
    lng: p.longitude,
    rag: p.finalRag,
    weight: p.finalRag === "RED" ? 3 : p.finalRag === "AMBER" ? 2 : 1,
    label: p.name,
  }));

  const reportPoints = reports
    .filter((r) => r.latitude && r.longitude)
    .map((r) => ({
      id: r.id,
      lat: r.latitude!,
      lng: r.longitude!,
      weight: r.sentiment === "NEGATIVE" ? 2 : 1,
      needWeight:
        (r.sentiment === "NEGATIVE" ? 2 : 0.5) *
        (1 - (r.sentimentScore ?? 0.5)),
    }));

  const clusters = clusterPoints(geoPoints);
  const heatmap = buildHeatmap([...geoPoints.map((g) => ({ ...g, needWeight: g.weight })), ...reportPoints]);

  const ragCounts = { GREEN: 0, AMBER: 0, RED: 0, PENDING: 0 };
  for (const p of projects) {
    ragCounts[p.finalRag as keyof typeof ragCounts] += 1;
  }

  const sentimentCounts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 };
  for (const r of reports) {
    if (r.sentiment) sentimentCounts[r.sentiment] += 1;
  }

  // District scorecards derived live if none seeded
  const districtMap = new Map<string, { rag: number[]; sent: number[]; count: number }>();
  for (const p of projects) {
    const entry = districtMap.get(p.district) || { rag: [], sent: [], count: 0 };
    entry.count += 1;
    entry.rag.push(p.finalRag === "GREEN" ? 1 : p.finalRag === "AMBER" ? 0.5 : p.finalRag === "RED" ? 0 : 0.5);
    for (const r of p.reports) {
      if (r.sentimentScore != null) entry.sent.push(r.sentimentScore);
    }
    districtMap.set(p.district, entry);
  }

  const liveScorecards = Array.from(districtMap.entries()).map(([district, v]) => {
    const ragScore = v.rag.length ? v.rag.reduce((a, b) => a + b, 0) / v.rag.length : 0.5;
    const sentimentAvg = v.sent.length ? v.sent.reduce((a, b) => a + b, 0) / v.sent.length : 0.5;
    const needIndex = Math.max(0, Math.min(1, (1 - ragScore) * 0.6 + (1 - sentimentAvg) * 0.4));
    return { district, ragScore, sentimentAvg, needIndex, reportCount: v.count };
  });

  // Sample monthly gap report narrative
  const topGaps = liveScorecards.sort((a, b) => b.needIndex - a.needIndex).slice(0, 5);
  const monthlySummary = {
    title: `Regional Development Needs — ${new Date().toLocaleString("en", { month: "long", year: "numeric" })}`,
    gaps: topGaps.map((g) => ({
      district: g.district,
      needIndex: g.needIndex,
      recommendation:
        g.needIndex > 0.6
          ? "Priority intervention — high need index from RAG + sentiment"
          : "Monitor — moderate development pressure",
    })),
    aiNote: analyseSentiment(
      topGaps.map((g) => `${g.district} need ${g.needIndex > 0.5 ? "urgent" : "stable"}`).join(". ")
    ),
  };

  return NextResponse.json({
    overview: {
      projectCount: projects.length,
      reportCount: reports.length,
      openEscalations: escalations.filter((e) => e.status === "OPEN" || e.status === "OVERDUE").length,
      ragCounts,
      sentimentCounts,
    },
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      projectCode: p.projectCode,
      district: p.district,
      sector: p.sector,
      latitude: p.latitude,
      longitude: p.longitude,
      finalRag: p.finalRag,
      reportCount: p._count.reports,
    })),
    feed: reports.map((r) => ({
      id: r.id,
      projectName: r.project.name,
      district: r.project.district,
      type: r.type,
      content: r.content,
      sentiment: r.sentiment,
      anonymisedReporter: r.anonymisedReporter,
      createdAt: r.createdAt,
    })),
    clusters,
    heatmap,
    scorecards: scorecards.length ? scorecards : liveScorecards,
    escalations,
    ministryTracker: ministry,
    monthlyReport: monthlySummary,
  });
}
