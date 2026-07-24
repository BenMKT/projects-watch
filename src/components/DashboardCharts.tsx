"use client";

import { useMemo, useState } from "react";

type ProjectPoint = {
  id: string;
  district: string;
  sector: string;
  finalRag: string;
  reportCount?: number;
};

type ScorecardPoint = {
  district: string;
  ragScore: number;
  sentimentAvg: number;
  needIndex: number;
  reportCount?: number;
};

const RAG_STACK: Array<{ key: string; label: string; color: string }> = [
  { key: "GREEN", label: "Green", color: "var(--signal-green)" },
  { key: "AMBER", label: "Amber", color: "var(--signal-amber)" },
  { key: "RED", label: "Red", color: "var(--signal-red)" },
  { key: "PENDING", label: "Pending", color: "#94a3b8" },
];

const SECTOR_ACCENTS: Record<string, string> = {
  Healthcare: "#0f766e",
  Health: "#0f766e",
  Water: "#0369a1",
  Infrastructure: "#b45309",
  Roads: "#b45309",
  Education: "#5b21b6",
  Employment: "#0f766e",
  Security: "#9f1239",
};

function needTone(need: number) {
  if (need > 0.6) return "bg-rose-600";
  if (need > 0.4) return "bg-amber-500";
  return "bg-teal-700";
}

type DistrictBar = {
  district: string;
  ragScore: number;
  sentimentAvg: number;
  needIndex: number;
  projectCount: number;
};

type SectorStack = {
  sector: string;
  GREEN: number;
  AMBER: number;
  RED: number;
  PENDING: number;
  total: number;
};

function aggregateDistricts(
  projects: ProjectPoint[],
  scorecards: ScorecardPoint[]
): DistrictBar[] {
  if (scorecards.length) {
    const byDistrict = new Map<string, ScorecardPoint[]>();
    for (const s of scorecards) {
      const list = byDistrict.get(s.district) || [];
      list.push(s);
      byDistrict.set(s.district, list);
    }
    return Array.from(byDistrict.entries())
      .map(([district, rows]) => {
        const n = Math.max(rows.length, 1);
        return {
          district,
          ragScore: rows.reduce((a, r) => a + r.ragScore, 0) / n,
          sentimentAvg: rows.reduce((a, r) => a + r.sentimentAvg, 0) / n,
          needIndex: rows.reduce((a, r) => a + r.needIndex, 0) / n,
          projectCount: rows.reduce((a, r) => a + (r.reportCount || 0), 0) || n,
        };
      })
      .sort((a, b) => b.needIndex - a.needIndex);
  }

  const map = new Map<string, { rag: number[]; count: number }>();
  for (const p of projects) {
    const entry = map.get(p.district) || { rag: [], count: 0 };
    entry.count += 1;
    entry.rag.push(
      p.finalRag === "GREEN"
        ? 1
        : p.finalRag === "AMBER"
          ? 0.5
          : p.finalRag === "RED"
            ? 0
            : 0.5
    );
    map.set(p.district, entry);
  }
  return Array.from(map.entries())
    .map(([district, v]) => {
      const ragScore = v.rag.reduce((a, b) => a + b, 0) / Math.max(v.rag.length, 1);
      const needIndex = Math.max(0, Math.min(1, 1 - ragScore));
      return {
        district,
        ragScore,
        sentimentAvg: ragScore,
        needIndex,
        projectCount: v.count,
      };
    })
    .sort((a, b) => b.needIndex - a.needIndex);
}

function aggregateSectors(projects: ProjectPoint[]): SectorStack[] {
  const map = new Map<string, SectorStack>();

  for (const p of projects) {
    const sector = p.sector || "Other";
    const entry = map.get(sector) || {
      sector,
      GREEN: 0,
      AMBER: 0,
      RED: 0,
      PENDING: 0,
      total: 0,
    };
    const rag = (
      ["GREEN", "AMBER", "RED", "PENDING"].includes(p.finalRag)
        ? p.finalRag
        : "PENDING"
    ) as "GREEN" | "AMBER" | "RED" | "PENDING";
    entry[rag] += 1;
    entry.total += 1;
    map.set(sector, entry);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function DashboardCharts({
  projects = [],
  scorecards = [],
}: {
  projects?: ProjectPoint[];
  scorecards?: ScorecardPoint[];
}) {
  const districts = useMemo(
    () => aggregateDistricts(projects, scorecards),
    [projects, scorecards]
  );
  const sectors = useMemo(() => aggregateSectors(projects), [projects]);
  const [hoverSector, setHoverSector] = useState<string | null>(null);
  const [hoverRag, setHoverRag] = useState<string | null>(null);

  const maxNeed = Math.max(...districts.map((d) => d.needIndex), 0.01);
  const hovered = sectors.find((s) => s.sector === hoverSector);

  return (
    <section className="mt-12 grid gap-10 lg:grid-cols-2">
      <div className="animate-rise">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
          District performance
        </h2>
        <p className="mt-1 text-sm text-teal-800/70">
          Need index by district — higher bars signal greater intervention pressure
        </p>
        <ul className="mt-6 space-y-3">
          {districts.map((d, i) => {
            const width = `${Math.max(8, (d.needIndex / maxNeed) * 100)}%`;
            return (
              <li key={d.district} className="group">
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-teal-950">{d.district}</span>
                  <span className="tabular-nums text-teal-700">
                    {(d.needIndex * 100).toFixed(0)}% need · RAG{" "}
                    {(d.ragScore * 100).toFixed(0)}%
                    {d.projectCount > 0 ? ` · n=${d.projectCount}` : ""}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-sm bg-teal-900/8">
                  <div
                    className={`chart-bar-fill h-full rounded-sm ${needTone(d.needIndex)} transition-opacity group-hover:opacity-90`}
                    style={{
                      width,
                      animationDelay: `${i * 60}ms`,
                    }}
                    title={`${d.district}: RAG ${(d.ragScore * 100).toFixed(0)}%, need ${(d.needIndex * 100).toFixed(0)}%`}
                  />
                </div>
              </li>
            );
          })}
          {!districts.length && (
            <li className="text-sm text-teal-700">No district scores yet.</li>
          )}
        </ul>
      </div>

      <div className="animate-rise-delay">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
          Sector RAG mix
        </h2>
        <p className="mt-1 text-sm text-teal-800/70">
          Stacked project status by sector — hover a segment for detail
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-teal-800">
          {RAG_STACK.map((r) => (
            <span key={r.key} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: r.color }}
              />
              {r.label}
            </span>
          ))}
        </div>

        <ul className="mt-5 space-y-4">
          {sectors.map((s) => {
            const accent = SECTOR_ACCENTS[s.sector] || "#134e4a";
            return (
              <li key={s.sector}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-teal-950" style={{ color: accent }}>
                    {s.sector}
                  </span>
                  <span className="tabular-nums text-teal-700">
                    {s.total} project{s.total === 1 ? "" : "s"}
                  </span>
                </div>
                <div
                  className="flex h-4 overflow-hidden rounded-sm bg-teal-900/8"
                  onMouseLeave={() => {
                    setHoverSector(null);
                    setHoverRag(null);
                  }}
                >
                  {RAG_STACK.map((r) => {
                    const count = s[r.key as keyof typeof s] as number;
                    if (!count) return null;
                    const pct = (count / s.total) * 100;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        className="chart-bar-fill relative h-full min-w-[4px] transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                        style={{
                          width: `${pct}%`,
                          background: r.color,
                        }}
                        aria-label={`${s.sector}: ${count} ${r.label} (${pct.toFixed(0)}%)`}
                        onMouseEnter={() => {
                          setHoverSector(s.sector);
                          setHoverRag(r.key);
                        }}
                        onFocus={() => {
                          setHoverSector(s.sector);
                          setHoverRag(r.key);
                        }}
                      />
                    );
                  })}
                </div>
              </li>
            );
          })}
          {!sectors.length && (
            <li className="text-sm text-teal-700">No sector data yet.</li>
          )}
        </ul>

        <div
          className="mt-4 min-h-[3.25rem] border-t border-teal-900/10 pt-3 text-sm text-teal-800"
          aria-live="polite"
        >
          {hovered && hoverRag ? (
            <>
              <span className="font-medium text-teal-950">{hovered.sector}</span>
              {" — "}
              {hovered[hoverRag as keyof typeof hovered]} {hoverRag.toLowerCase()}{" "}
              of {hovered.total} (
              {(
                ((hovered[hoverRag as keyof typeof hovered] as number) /
                  hovered.total) *
                100
              ).toFixed(0)}
              %)
            </>
          ) : (
            <span className="text-teal-700/80">
              Hover a stack segment to see sector × RAG counts
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
