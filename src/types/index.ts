export type { Role, RagStatus, ReportType, SurveyDomain } from "@prisma/client";

export interface PublicProjectCard {
  id: string;
  projectCode: string;
  name: string;
  contractor: string;
  district: string;
  sector: string;
  latitude: number;
  longitude: number;
  finalRag: string;
  provisionalRag: string;
  statusPublished: boolean;
  contractSum: number;
  reportCount?: number;
}

export interface FeedReport {
  id: string;
  projectName: string;
  projectId: string;
  type: string;
  content: string | null;
  sentiment: string | null;
  anonymisedReporter: string;
  createdAt: string;
  district: string;
}
