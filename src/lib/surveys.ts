import type { SurveyDomain } from "@prisma/client";

export interface SurveyQuestion {
  id: string;
  prompt: string;
  type: "scale" | "boolean" | "text" | "select" | "multi";
  options?: string[];
  lowLiteracyPrompt?: string;
  required?: boolean;
}

export const SURVEY_TEMPLATES: Record<SurveyDomain, { title: string; description: string; questions: SurveyQuestion[] }> = {
  INFRASTRUCTURE: {
    title: "Infrastructure Assessment",
    description: "Roads, water, waste management, and electricity access.",
    questions: [
      { id: "road_condition", prompt: "How would you rate the condition of local roads?", type: "scale", lowLiteracyPrompt: "Are the roads good or bad?", required: true },
      { id: "water_access", prompt: "Does the household have reliable clean water?", type: "boolean", lowLiteracyPrompt: "Do you get clean water?", required: true },
      { id: "waste_collection", prompt: "How often is waste collected?", type: "select", options: ["Daily", "Weekly", "Rarely", "Never"], required: true },
      { id: "electricity", prompt: "Electricity reliability this month", type: "scale", required: true },
      { id: "notes", prompt: "Additional infrastructure observations", type: "text" },
    ],
  },
  HEALTHCARE: {
    title: "Healthcare Access Survey",
    description: "Facility distance, drugs, staffing, maternal and child services.",
    questions: [
      { id: "facility_distance", prompt: "Distance to nearest health facility (km)", type: "select", options: ["<1", "1-5", "5-10", ">10"], required: true },
      { id: "drug_availability", prompt: "Were essential medicines available on last visit?", type: "boolean", required: true },
      { id: "staffing", prompt: "Were clinical staff present?", type: "boolean", required: true },
      { id: "maternal_services", prompt: "Quality of maternal/child services", type: "scale", required: true },
      { id: "notes", prompt: "Healthcare observations", type: "text" },
    ],
  },
  EDUCATION: {
    title: "Education Quality Survey",
    description: "School condition, teacher attendance, learning materials.",
    questions: [
      { id: "school_condition", prompt: "Physical condition of the school", type: "scale", required: true },
      { id: "teacher_attendance", prompt: "Were teachers present during visit?", type: "boolean", required: true },
      { id: "materials", prompt: "Availability of learning materials", type: "scale", required: true },
      { id: "pupil_ratio", prompt: "Approximate pupil-teacher ratio", type: "select", options: ["Good (<40)", "Crowded (40-60)", "Overcrowded (>60)"] },
      { id: "notes", prompt: "Education observations", type: "text" },
    ],
  },
  EMPLOYMENT: {
    title: "Employment & Livelihoods",
    description: "Income sources, government support, youth employment.",
    questions: [
      { id: "income_source", prompt: "Primary household income source", type: "select", options: ["Agriculture", "Trade", "Wage labour", "Remittances", "Other"], required: true },
      { id: "govt_support", prompt: "Receiving any government livelihood support?", type: "boolean", required: true },
      { id: "youth_employment", prompt: "Youth employment opportunities locally", type: "scale", required: true },
      { id: "income_stability", prompt: "Income stability over last 6 months", type: "scale" },
      { id: "notes", prompt: "Livelihood observations", type: "text" },
    ],
  },
  SECURITY: {
    title: "Community Security Perception",
    description: "Safety perception, incident frequency, police presence.",
    questions: [
      { id: "safety", prompt: "How safe do you feel in your community?", type: "scale", lowLiteracyPrompt: "Do you feel safe?", required: true },
      { id: "incidents", prompt: "Security incidents in the past month", type: "select", options: ["None", "1-2", "3-5", "More than 5"], required: true },
      { id: "police_presence", prompt: "Adequacy of police / security presence", type: "scale", required: true },
      { id: "reporting", prompt: "Would you report a crime to authorities?", type: "boolean" },
      { id: "notes", prompt: "Security observations", type: "text" },
    ],
  },
};

export const DISTRICTS = [
  "Kampala",
  "Wakiso",
  "Mukono",
  "Gulu",
  "Lira",
  "Mbarara",
  "Jinja",
  "Mbale",
];
