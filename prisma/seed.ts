import { PrismaClient, Prisma, type RagStatus, type SentimentLabel } from "@prisma/client";
import bcrypt from "bcryptjs";
import { anonymiseReporter } from "../src/lib/encryption";
import { SURVEY_TEMPLATES } from "../src/lib/surveys";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Citizen Development Watch…");

  await prisma.ministryResponse.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.citizenReport.deleteMany();
  await prisma.projectSubscription.deleteMany();
  await prisma.surveyResponse.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.contractorPerformance.deleteMany();
  await prisma.developmentScorecard.deleteMany();
  await prisma.monthlyReport.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.dataRetentionPolicy.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@cdw.local",
      name: "Ministry Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      district: "Kampala",
      mfaEnabled: true,
      mfaSecret: "123456",
      anonymisedId: anonymiseReporter("superadmin@cdw.local"),
    },
  });

  await prisma.user.create({
    data: {
      email: "district@cdw.local",
      name: "Kampala District Admin",
      passwordHash,
      role: "DISTRICT_ADMIN",
      district: "Kampala",
      mfaEnabled: true,
      mfaSecret: "123456",
      anonymisedId: anonymiseReporter("district@cdw.local"),
    },
  });

  const officer = await prisma.user.create({
    data: {
      email: "officer@cdw.local",
      name: "Amina Field Officer",
      passwordHash,
      role: "FIELD_OFFICER",
      district: "Kampala",
      mfaEnabled: true,
      mfaSecret: "123456",
      anonymisedId: anonymiseReporter("officer@cdw.local"),
    },
  });

  const citizen = await prisma.user.create({
    data: {
      email: "citizen@cdw.local",
      name: "Joseph Citizen",
      passwordHash,
      role: "CITIZEN",
      district: "Kampala",
      anonymisedId: anonymiseReporter("citizen@cdw.local"),
    },
  });

  await prisma.user.create({
    data: {
      email: "parliament@cdw.local",
      name: "Parliamentary Oversight",
      passwordHash,
      role: "PARLIAMENTARY",
      mfaEnabled: true,
      mfaSecret: "123456",
      anonymisedId: anonymiseReporter("parliament@cdw.local"),
    },
  });

  const projectDefs = [
    {
      projectCode: "CDW-KLA-001",
      name: "Northern Bypass Dual Carriageway Phase II",
      contractor: "Nile Bridge Civil Ltd",
      contractSum: 420000000000,
      durationMonths: 24,
      scope:
        "Dual carriageway expansion, drainage, pedestrian walkways and street lighting along Kampala Northern Bypass.",
      district: "Kampala",
      sector: "Infrastructure",
      latitude: 0.3721,
      longitude: 32.5589,
      finalRag: "AMBER" as RagStatus,
      provisionalRag: "AMBER" as RagStatus,
      statusPublished: true,
    },
    {
      projectCode: "CDW-GUL-014",
      name: "Gulu Community Water Kiosk Network",
      contractor: "Acholi Water Works Co.",
      contractSum: 18000000000,
      durationMonths: 12,
      scope: "Construction of 40 community water kiosks with solar pumping in peri-urban Gulu.",
      district: "Gulu",
      sector: "Water",
      latitude: 2.7746,
      longitude: 32.299,
      finalRag: "GREEN" as RagStatus,
      provisionalRag: "GREEN" as RagStatus,
      statusPublished: true,
    },
    {
      projectCode: "CDW-JIN-008",
      name: "Jinja Community Health Centre Upgrade",
      contractor: "Source of the Nile Builders",
      contractSum: 31000000000,
      durationMonths: 18,
      scope: "Maternity ward expansion, drug store renovation, and solar backup for Jinja CHC.",
      district: "Jinja",
      sector: "Healthcare",
      latitude: 0.4244,
      longitude: 33.2041,
      finalRag: "RED" as RagStatus,
      provisionalRag: "RED" as RagStatus,
      statusPublished: true,
    },
    {
      projectCode: "CDW-MBA-021",
      name: "Mbale Youth Polytechnic Workshop",
      contractor: "Elgon Craft Contractors",
      contractSum: 9500000000,
      durationMonths: 10,
      scope: "New workshops for welding, carpentry and ICT training with accessibility upgrades.",
      district: "Mbale",
      sector: "Education",
      latitude: 1.082,
      longitude: 34.175,
      finalRag: "PENDING" as RagStatus,
      provisionalRag: "PENDING" as RagStatus,
      statusPublished: false,
    },
  ];

  const projects = [];
  for (const def of projectDefs) {
    const p = await prisma.project.create({
      data: {
        ...def,
        baselinePhotos: ["baseline-1.jpg", "baseline-2.jpg"],
        startDate: new Date("2024-06-01"),
        endDate: new Date("2026-06-01"),
        createdById: superAdmin.id,
        milestones: {
          create: [
            {
              title: "Site mobilisation",
              description: "Contractor mobilisation and site handover",
              dueDate: new Date("2024-08-01"),
              orderIndex: 1,
              completed: true,
            },
            {
              title: "Structural / core works",
              description: "Primary construction milestone",
              dueDate: new Date("2025-06-01"),
              orderIndex: 2,
              completed: def.finalRag === "GREEN",
            },
            {
              title: "Commissioning & handover",
              description: "Final inspection and community handover",
              dueDate: new Date("2026-01-01"),
              orderIndex: 3,
            },
          ],
        },
      },
      include: { milestones: true },
    });
    projects.push(p);
  }

  const reportSeeds: Array<{
    projectIndex: number;
    content: string;
    sentiment: SentimentLabel;
    sentimentScore: number;
    activityScore: number;
    type: "WRITTEN" | "PHOTO" | "VOICE" | "STRUCTURED";
  }> = [
    { projectIndex: 0, content: "Work is active but slow. Drainage incomplete near junction.", sentiment: "NEUTRAL", sentimentScore: 0.45, activityScore: 0.55, type: "WRITTEN" },
    { projectIndex: 0, content: "Delay on pedestrian walkways. Materials missing for two weeks.", sentiment: "NEGATIVE", sentimentScore: 0.25, activityScore: 0.35, type: "PHOTO" },
    { projectIndex: 0, content: "Some progress on lighting poles this week. Still behind schedule.", sentiment: "NEUTRAL", sentimentScore: 0.5, activityScore: 0.6, type: "VOICE" },
    { projectIndex: 1, content: "Excellent progress. Three kiosks completed and working with good water quality.", sentiment: "POSITIVE", sentimentScore: 0.9, activityScore: 0.85, type: "STRUCTURED" },
    { projectIndex: 1, content: "Community satisfied. Solar pumps active and reliable.", sentiment: "POSITIVE", sentimentScore: 0.85, activityScore: 0.8, type: "WRITTEN" },
    { projectIndex: 1, content: "On track for remaining kiosks. Contractor delivering quality work.", sentiment: "POSITIVE", sentimentScore: 0.88, activityScore: 0.82, type: "PHOTO" },
    { projectIndex: 2, content: "Site abandoned. No workers for a month. Materials appear stolen.", sentiment: "NEGATIVE", sentimentScore: 0.1, activityScore: 0.15, type: "PHOTO" },
    { projectIndex: 2, content: "Maternity ward incomplete and stalled. Community very concerned about corruption.", sentiment: "NEGATIVE", sentimentScore: 0.12, activityScore: 0.2, type: "VOICE" },
    { projectIndex: 2, content: "Failed delivery. Fence broken, works stopped, unsafe for patients.", sentiment: "NEGATIVE", sentimentScore: 0.15, activityScore: 0.18, type: "WRITTEN" },
  ];

  for (const r of reportSeeds) {
    const project = projects[r.projectIndex];
    await prisma.citizenReport.create({
      data: {
        projectId: project.id,
        milestoneId: project.milestones[1]?.id,
        reporterId: null,
        anonymisedReporter: anonymiseReporter(`seed-${r.projectIndex}-${r.content.slice(0, 8)}`),
        type: r.type,
        content: r.content,
        mediaUrls: r.type === "PHOTO" ? ["evidence.jpg"] : [],
        latitude: project.latitude + (Math.random() - 0.5) * 0.01,
        longitude: project.longitude + (Math.random() - 0.5) * 0.01,
        sentiment: r.sentiment,
        sentimentScore: r.sentimentScore,
        activityScore: r.activityScore,
        isAnonymous: true,
        weight: r.type === "STRUCTURED" ? 1.2 : 1,
      },
    });
  }

  await prisma.projectSubscription.create({
    data: { userId: citizen.id, projectId: projects[0].id },
  });

  // Escalation for RED project
  const redEsc = await prisma.escalation.create({
    data: {
      projectId: projects[2].id,
      level: "CRITICAL",
      ragTrigger: "RED",
      status: "OPEN",
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      recipients: [
        "minister@works.go.ug",
        "ps@works.go.ug",
        "igg@igg.go.ug",
        "pac@parliament.go.ug",
      ],
      notifiedBodies: [
        "Line Minister",
        "Permanent Secretary",
        "Inspectorate of Government (IGG)",
        "Parliamentary Committee",
      ],
      publicStatement:
        "Public notice: Project CDW-JIN-008 (Jinja Community Health Centre Upgrade) classified RED — stalled/abandoned. Authorities notified with 5-day response deadline.",
      handlerId: superAdmin.id,
    },
  });

  await prisma.ministryResponse.create({
    data: {
      projectId: projects[2].id,
      escalationId: redEsc.id,
      actorId: superAdmin.id,
      status: "PENDING",
      acknowledgement: "Critical escalation opened pending ministerial acknowledgement",
    },
  });

  await prisma.escalation.create({
    data: {
      projectId: projects[0].id,
      level: "WARNING",
      ragTrigger: "AMBER",
      status: "ACKNOWLEDGED",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      recipients: ["project.officer@works.go.ug", "district.desk@works.go.ug"],
      notifiedBodies: ["Project Officer", "Ministry Desk"],
      handlerId: superAdmin.id,
    },
  });

  for (const domain of Object.keys(SURVEY_TEMPLATES) as Array<keyof typeof SURVEY_TEMPLATES>) {
    const tpl = SURVEY_TEMPLATES[domain];
    const survey = await prisma.survey.create({
      data: {
        title: tpl.title,
        domain,
        district: "Kampala",
        description: tpl.description,
        status: domain === "INFRASTRUCTURE" || domain === "HEALTHCARE" ? "APPROVED" : "PUBLISHED",
        questions: tpl.questions as unknown as Prisma.InputJsonValue,
        approvedById: superAdmin.id,
      },
    });

    if (domain === "INFRASTRUCTURE") {
      await prisma.surveyResponse.create({
        data: {
          surveyId: survey.id,
          officerId: officer.id,
          householdCode: "HH-KLA-001",
          answers: {
            road_condition: 3,
            water_access: true,
            waste_collection: "Weekly",
            electricity: 4,
            notes: "Mixed infrastructure quality in Kampala parish",
          },
          photoCache: [],
          latitude: 0.3476,
          longitude: 32.5825,
          syncedAt: new Date(),
        },
      });
    }
  }

  await prisma.contractorPerformance.createMany({
    data: [
      {
        projectId: projects[0].id,
        contractor: "Nile Bridge Civil Ltd",
        score: 62,
        onTimeRate: 0.55,
        qualityScore: 0.7,
        ragHistory: [{ at: "2025-01", rag: "AMBER" }] as unknown as Prisma.InputJsonValue,
        notes: "Behind on walkways along Northern Bypass",
      },
      {
        projectId: projects[2].id,
        contractor: "Source of the Nile Builders",
        score: 28,
        onTimeRate: 0.2,
        qualityScore: 0.35,
        ragHistory: [{ at: "2025-01", rag: "RED" }] as unknown as Prisma.InputJsonValue,
        notes: "Site inactive — under review",
      },
    ],
  });

  const now = new Date();
  await prisma.developmentScorecard.createMany({
    data: [
      {
        district: "Kampala",
        sector: "Infrastructure",
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        ragScore: 0.55,
        sentimentAvg: 0.48,
        needIndex: 0.52,
        reportCount: 3,
        trends: [{ month: "prev", needIndex: 0.48 }] as unknown as Prisma.InputJsonValue,
      },
      {
        district: "Jinja",
        sector: "Healthcare",
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        ragScore: 0.15,
        sentimentAvg: 0.12,
        needIndex: 0.82,
        reportCount: 3,
        trends: [{ month: "prev", needIndex: 0.7 }] as unknown as Prisma.InputJsonValue,
      },
      {
        district: "Gulu",
        sector: "Water",
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        ragScore: 0.92,
        sentimentAvg: 0.88,
        needIndex: 0.18,
        reportCount: 3,
        trends: [{ month: "prev", needIndex: 0.25 }] as unknown as Prisma.InputJsonValue,
      },
    ],
  });

  await prisma.dataRetentionPolicy.createMany({
    data: [
      {
        entityType: "CitizenReport",
        retentionDays: 2555,
        anonymiseAfter: 365,
        description: "Citizen evidence retained 7 years; reporter linkage anonymised after 1 year.",
      },
      {
        entityType: "SurveyResponse",
        retentionDays: 1825,
        anonymiseAfter: 730,
        description: "Household survey raw data restricted; anonymise household codes after 2 years.",
      },
      {
        entityType: "AuditLog",
        retentionDays: 3650,
        description: "Immutable audit trail retained 10 years for parliamentary/audit access.",
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      action: "SEED_COMPLETED",
      entity: "System",
      metadata: { projects: projects.length } as unknown as Prisma.InputJsonValue,
    },
  });

  console.log("Seed complete.");
  console.log("Demo logins (password: password123, MFA: 123456):");
  console.log("  superadmin@cdw.local | district@cdw.local | officer@cdw.local");
  console.log("  citizen@cdw.local | parliament@cdw.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
