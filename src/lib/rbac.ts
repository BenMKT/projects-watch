import type { Role } from "@/types/roles";

export type Permission =
  | "project:create"
  | "project:publish_status"
  | "project:view"
  | "report:submit"
  | "report:view_public"
  | "survey:create"
  | "survey:approve"
  | "survey:conduct"
  | "survey:view_raw"
  | "survey:export"
  | "volunteer:manage"
  | "dashboard:ministry"
  | "dashboard:district"
  | "dashboard:public"
  | "escalation:manage"
  | "audit:view"
  | "contractor:view_performance"
  | "briefing:publish";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "project:create",
    "project:publish_status",
    "project:view",
    "report:submit",
    "report:view_public",
    "survey:create",
    "survey:approve",
    "survey:conduct",
    "survey:view_raw",
    "survey:export",
    "volunteer:manage",
    "dashboard:ministry",
    "dashboard:district",
    "dashboard:public",
    "escalation:manage",
    "audit:view",
    "contractor:view_performance",
    "briefing:publish",
  ],
  DISTRICT_ADMIN: [
    "project:view",
    "report:submit",
    "report:view_public",
    "survey:create",
    "survey:approve",
    "survey:conduct",
    "survey:view_raw",
    "survey:export",
    "volunteer:manage",
    "dashboard:district",
    "dashboard:public",
    "escalation:manage",
  ],
  FIELD_OFFICER: [
    "project:view",
    "report:submit",
    "report:view_public",
    "survey:conduct",
    "dashboard:public",
  ],
  CITIZEN: [
    "project:view",
    "report:submit",
    "report:view_public",
    "dashboard:public",
  ],
  CONTRACTOR: ["project:view", "report:view_public", "dashboard:public", "contractor:view_performance"],
  PARLIAMENTARY: [
    "project:view",
    "report:view_public",
    "survey:export",
    "dashboard:ministry",
    "dashboard:public",
    "audit:view",
    "contractor:view_performance",
    "escalation:manage",
    "briefing:publish",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: ${role} lacks ${permission}`);
  }
}

/** Roles that require MFA */
export const MFA_REQUIRED_ROLES: Role[] = [
  "SUPER_ADMIN",
  "DISTRICT_ADMIN",
  "FIELD_OFFICER",
  "PARLIAMENTARY",
];

export function requiresMfa(role: Role): boolean {
  return MFA_REQUIRED_ROLES.includes(role);
}
