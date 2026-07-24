import mockData from "../../data/mock-db.json";

export function isMockDb() {
  return process.env.DATA_SOURCE === "mock";
}

type Dict = Record<string, unknown>;

type MockStore = {
  users: Array<Dict & { id: string; email: string; password?: string }>;
  projects: Array<Dict & { id: string }>;
  milestones: Array<Dict & { id: string; projectId: string }>;
  reports: Array<Dict & { id: string; projectId: string }>;
  subscriptions: Array<Dict & { id: string; userId: string; projectId: string }>;
  surveys: Array<Dict & { id: string }>;
  surveyResponses: Array<Dict & { id: string; surveyId: string }>;
  escalations: Array<Dict & { id: string; projectId: string }>;
  ministryResponses: Array<Dict & { id: string; projectId: string; actorId: string }>;
  performanceLogs: Array<Dict & { id: string; projectId: string }>;
  scorecards: Array<Dict & { id: string }>;
  auditLogs: Array<Dict & { id: string }>;
  retentionPolicies: Array<Dict & { id: string }>;
};

const globalForMock = globalThis as unknown as { __cdwMockStore?: MockStore };

function cloneStore(): MockStore {
  return JSON.parse(JSON.stringify(mockData)) as MockStore;
}

function store(): MockStore {
  if (!globalForMock.__cdwMockStore) {
    globalForMock.__cdwMockStore = cloneStore();
  }
  return globalForMock.__cdwMockStore;
}

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  return new Date(String(value ?? Date.now()));
}

function hydrateDates<T extends Dict>(row: T, fields: string[]): T {
  const next: Dict = { ...row };
  for (const f of fields) {
    if (next[f] != null) next[f] = asDate(next[f]);
  }
  return next as T;
}

function matchWhere(row: Dict, where?: Dict): boolean {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      const op = value as Dict;
      if ("not" in op) {
        if (row[key] === op.not) return false;
        continue;
      }
    }
    if (row[key] !== value) return false;
  }
  return true;
}

function sortRows<T extends Dict>(rows: T[], orderBy?: Dict | Dict[]): T[] {
  if (!orderBy) return rows;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const order of orders) {
      const [field, dir] = Object.entries(order)[0] ?? [];
      if (!field) continue;
      const av = a[field];
      const bv = b[field];
      const cmp =
        av === bv
          ? 0
          : av == null
            ? -1
            : bv == null
              ? 1
              : av < bv
                ? -1
                : 1;
      if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

function applySelect(row: Dict, select?: Dict): Dict {
  if (!select) return row;
  const out: Dict = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) out[key] = row[key];
  }
  return out;
}

function readOnlyDenied(action: string): never {
  const err = new Error(
    `Demo mode is read-only (${action}). Set DATA_SOURCE=prisma with a database for writes.`
  );
  (err as Error & { code: string }).code = "DEMO_READ_ONLY";
  throw err;
}

function enrichProject(project: Dict, args?: { include?: Dict; select?: Dict }) {
  const s = store();
  const id = String(project.id);
  let row: Dict = { ...project };

  const include = args?.include ?? {};
  if (include.milestones) {
    const orderBy = (include.milestones as Dict).orderBy as Dict | undefined;
    row.milestones = sortRows(
      s.milestones.filter((m) => m.projectId === id).map((m) =>
        hydrateDates(m, ["dueDate"])
      ),
      orderBy ?? { orderIndex: "asc" }
    );
  }
  if (include.reports) {
    const conf = include.reports as Dict;
    let reports: Dict[] = s.reports
      .filter((r) => r.projectId === id)
      .map((r) => hydrateDates(r, ["createdAt", "updatedAt"]));
    reports = sortRows(reports, (conf.orderBy as Dict) ?? { createdAt: "desc" });
    if (typeof conf.take === "number") reports = reports.slice(0, conf.take);
    if (conf.select) {
      reports = reports.map((r) => applySelect(r, conf.select as Dict));
    }
    row.reports = reports;
  }
  if (include.escalations) {
    const conf = include.escalations as Dict;
    let items: Dict[] = s.escalations
      .filter((e) => e.projectId === id)
      .map((e) => hydrateDates(e, ["deadline", "createdAt", "updatedAt"]));
    items = sortRows(items, (conf.orderBy as Dict) ?? { createdAt: "desc" });
    if (typeof conf.take === "number") items = items.slice(0, conf.take);
    row.escalations = items;
  }
  if (include.ministryResponses) {
    const conf = include.ministryResponses as Dict;
    let items: Dict[] = s.ministryResponses
      .filter((m) => m.projectId === id)
      .map((m) => hydrateDates(m, ["createdAt", "updatedAt", "acknowledgedAt", "actionedAt"]));
    items = sortRows(items, (conf.orderBy as Dict) ?? { createdAt: "desc" });
    if (typeof conf.take === "number") items = items.slice(0, conf.take);
    row.ministryResponses = items;
  }
  if (include.performanceLogs) {
    const conf = include.performanceLogs as Dict;
    let items: Dict[] = s.performanceLogs
      .filter((p) => p.projectId === id)
      .map((p) => hydrateDates(p, ["recordedAt"]));
    items = sortRows(items, (conf.orderBy as Dict) ?? { recordedAt: "desc" });
    if (typeof conf.take === "number") items = items.slice(0, conf.take);
    row.performanceLogs = items;
  }
  if (include._count) {
    const sel = ((include._count as Dict).select ?? {}) as Dict;
    row._count = {
      ...(sel.reports ? { reports: s.reports.filter((r) => r.projectId === id).length } : {}),
      ...(sel.subscriptions
        ? { subscriptions: s.subscriptions.filter((x) => x.projectId === id).length }
        : {}),
    };
  }

  row = hydrateDates(row, ["startDate", "endDate", "createdAt", "updatedAt"]);
  return row;
}

function model(name: keyof MockStore) {
  return {
    async findMany(args: Dict = {}) {
      const s = store();
      let rows = [...s[name]] as Dict[];
      if (args.where) rows = rows.filter((r) => matchWhere(r, args.where as Dict));
      rows = sortRows(rows, args.orderBy as Dict | Dict[]);
      if (typeof args.take === "number") rows = rows.slice(0, args.take);

      if (name === "projects") {
        return rows.map((r) => enrichProject(r, args as { include?: Dict }));
      }

      if (name === "reports" || name === "citizenReport" as never) {
        return rows.map((r) => {
          const out = hydrateDates(r, ["createdAt", "updatedAt"]);
          const include = args.include as Dict | undefined;
          if (include?.project) {
            const project = s.projects.find((p) => p.id === r.projectId);
            out.project = project
              ? applySelect(project, (include.project as Dict).select as Dict | undefined)
              : null;
          }
          return out;
        });
      }

      if (name === "escalations") {
        return rows.map((r) => {
          const out = hydrateDates(r, ["deadline", "createdAt", "updatedAt"]);
          const include = args.include as Dict | undefined;
          if (include?.project) {
            const project = s.projects.find((p) => p.id === r.projectId);
            out.project = project
              ? applySelect(project, (include.project as Dict).select as Dict | undefined)
              : null;
          }
          if (include?.responses) {
            out.responses = s.ministryResponses
              .filter((m) => m.escalationId === r.id)
              .map((m) => {
                const row = hydrateDates(m, ["createdAt", "updatedAt"]);
                if ((include.responses as Dict).include) {
                  const actor = s.users.find((u) => u.id === m.actorId);
                  row.actor = actor
                    ? {
                        name: actor.name,
                        role: actor.role,
                      }
                    : null;
                }
                return row;
              });
          }
          if (include?.handler) {
            const handler = s.users.find((u) => u.id === r.handlerId);
            out.handler = handler
              ? applySelect(handler, (include.handler as Dict).select as Dict | undefined)
              : null;
          }
          return out;
        });
      }

      if (name === "surveys") {
        return rows.map((r) => {
          const out = hydrateDates(r, ["createdAt", "updatedAt"]);
          const include = args.include as Dict | undefined;
          if (include?._count) {
            out._count = {
              responses: s.surveyResponses.filter((x) => x.surveyId === r.id).length,
            };
          }
          return out;
        });
      }

      if (name === "surveyResponses") {
        return rows.map((r) => {
          const out = hydrateDates(r, ["createdAt", "updatedAt", "syncedAt"]);
          const include = args.include as Dict | undefined;
          if (include?.survey) {
            const survey = s.surveys.find((x) => x.id === r.surveyId);
            out.survey = survey
              ? applySelect(survey, (include.survey as Dict).select as Dict | undefined)
              : null;
          }
          if (include?.officer) {
            const officer = s.users.find((u) => u.id === r.officerId);
            out.officer = officer
              ? applySelect(officer, (include.officer as Dict).select as Dict | undefined)
              : null;
          }
          return out;
        });
      }

      if (name === "subscriptions") {
        return rows.map((r) => {
          const out = hydrateDates(r, ["createdAt"]);
          const include = args.include as Dict | undefined;
          if (include?.project) {
            const project = s.projects.find((p) => p.id === r.projectId);
            out.project = project
              ? applySelect(project, (include.project as Dict).select as Dict | undefined)
              : null;
          }
          return out;
        });
      }

      if (name === "ministryResponses") {
        return rows.map((r) => {
          const out = hydrateDates(r, ["createdAt", "updatedAt", "acknowledgedAt", "actionedAt"]);
          const include = args.include as Dict | undefined;
          if (include?.project) {
            const project = s.projects.find((p) => p.id === r.projectId);
            out.project = project
              ? applySelect(project, (include.project as Dict).select as Dict | undefined)
              : null;
          }
          if (include?.actor) {
            const actor = s.users.find((u) => u.id === r.actorId);
            out.actor = actor
              ? applySelect(actor, (include.actor as Dict).select as Dict | undefined)
              : null;
          }
          return out;
        });
      }

      if (name === "auditLogs") {
        return rows.map((r) => {
          const out = hydrateDates(r, ["createdAt"]);
          const include = args.include as Dict | undefined;
          if (include?.user) {
            const user = s.users.find((u) => u.id === r.userId);
            out.user = user
              ? applySelect(user, (include.user as Dict).select as Dict | undefined)
              : null;
          }
          return out;
        });
      }

      if (name === "scorecards") {
        return rows.map((r) => hydrateDates(r, ["createdAt"]));
      }

      if (name === "retentionPolicies") {
        return rows.map((r) => hydrateDates(r, ["updatedAt"]));
      }

      if (name === "users") {
        return rows.map((r) => {
          const { password: _password, ...rest } = r;
          void _password;
          return args.select ? applySelect(rest, args.select as Dict) : rest;
        });
      }

      return rows;
    },

    async findUnique(args: Dict) {
      const where = args.where as Dict;
      const s = store();
      const rows = s[name] as Dict[];
      const row = rows.find((r) => {
        if (where.id) return r.id === where.id;
        if (where.email) return r.email === where.email;
        return false;
      });
      if (!row) return null;
      if (name === "projects") return enrichProject(row, args as { include?: Dict });
      if (name === "users") {
        // Keep password for auth; strip later if select provided
        if (args.select) return applySelect(row, args.select as Dict);
        return row;
      }
      return row;
    },

    async findFirst(args: Dict = {}) {
      const rows = await this.findMany({ ...args, take: 1 });
      return rows[0] ?? null;
    },

    async create() {
      readOnlyDenied(`${String(name)}.create`);
    },
    async update() {
      readOnlyDenied(`${String(name)}.update`);
    },
    async upsert() {
      readOnlyDenied(`${String(name)}.upsert`);
    },
    async deleteMany() {
      readOnlyDenied(`${String(name)}.deleteMany`);
    },
    async createMany() {
      readOnlyDenied(`${String(name)}.createMany`);
    },
  };
}

/** Prisma-shaped client backed by data/mock-db.json (read-only writes). */
export const mockPrisma = {
  user: model("users"),
  project: model("projects"),
  milestone: model("milestones"),
  citizenReport: {
    ...model("reports"),
  },
  projectSubscription: model("subscriptions"),
  survey: model("surveys"),
  surveyResponse: model("surveyResponses"),
  escalation: model("escalations"),
  ministryResponse: model("ministryResponses"),
  contractorPerformance: model("performanceLogs"),
  developmentScorecard: model("scorecards"),
  auditLog: model("auditLogs"),
  dataRetentionPolicy: model("retentionPolicies"),
  $disconnect: async () => undefined,
};

export function getMockUserForAuth(email: string) {
  return store().users.find((u) => u.email === email.toLowerCase()) ?? null;
}
