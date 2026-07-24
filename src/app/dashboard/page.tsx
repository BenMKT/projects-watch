"use client";

import { useEffect, useState } from "react";
import { ProjectMap } from "@/components/ProjectMap";
import { RagBadge } from "@/components/RagBadge";
import { DashboardCharts } from "@/components/DashboardCharts";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <div className="p-8 text-teal-800">Loading dashboard…</div>;
  }

  const { overview, projects, feed, scorecards, ministryTracker, monthlyReport, escalations } =
    data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Public development dashboard
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        RAG map · district bars · sector stacks · scorecards · ministry tracker
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Projects", overview.projectCount],
          ["Reports", overview.reportCount],
          ["Open escalations", overview.openEscalations],
          ["Red alerts", overview.ragCounts.RED],
        ].map(([label, value]) => (
          <div key={String(label)} className="border-t-2 border-teal-800/30 pt-3">
            <p className="text-xs uppercase tracking-wider text-teal-700">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-teal-950">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            RAG project map
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-teal-900/10">
            <ProjectMap projects={projects || []} />
          </div>
        </div>
        <div className="lg:col-span-2">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            Sentiment mix
          </h2>
          <div className="mt-3 space-y-2">
            {Object.entries(overview.sentimentCounts || {}).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span>{k}</span>
                <span className="font-semibold">{String(v)}</span>
              </div>
            ))}
          </div>
          <h2 className="mt-8 font-[family-name:var(--font-display)] text-xl text-teal-950">
            Latest reports
          </h2>
          <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto">
            {(feed || []).slice(0, 8).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (r: any) => (
                <li key={r.id} className="border-t border-teal-900/10 pt-2 text-sm">
                  <p className="text-xs text-teal-700">
                    {r.sentiment} · {r.district} · {formatDate(r.createdAt)}
                  </p>
                  <p className="line-clamp-2 text-teal-950">{r.content}</p>
                </li>
              )
            )}
          </ul>
        </div>
      </div>

      <DashboardCharts projects={projects || []} scorecards={scorecards || []} />

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
          District development scorecards
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-teal-900/15 text-teal-700">
              <tr>
                <th className="py-2 pr-4 font-medium">District</th>
                <th className="py-2 pr-4 font-medium">RAG score</th>
                <th className="py-2 pr-4 font-medium">Sentiment</th>
                <th className="py-2 pr-4 font-medium">Need index</th>
                <th className="py-2 font-medium">Projects</th>
              </tr>
            </thead>
            <tbody>
              {(scorecards || []).map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (s: any, i: number) => (
                  <tr key={s.id || s.district || i} className="border-b border-teal-900/5">
                    <td className="py-2.5 pr-4 font-medium text-teal-950">{s.district}</td>
                    <td className="py-2.5 pr-4">{(s.ragScore * 100).toFixed(0)}%</td>
                    <td className="py-2.5 pr-4">{(s.sentimentAvg * 100).toFixed(0)}%</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={
                          s.needIndex > 0.6
                            ? "text-rose-700"
                            : s.needIndex > 0.4
                              ? "text-amber-700"
                              : "text-emerald-700"
                        }
                      >
                        {(s.needIndex * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2.5">{s.reportCount}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            Ministry response tracker
          </h2>
          <ul className="mt-4 space-y-3">
            {(ministryTracker || []).slice(0, 6).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (m: any) => (
                <li key={m.id} className="border-t border-teal-900/10 pt-3 text-sm">
                  <p className="font-medium text-teal-950">
                    {m.project?.name} · {m.status}
                  </p>
                  <p className="text-teal-800/70">
                    {m.acknowledgement || m.actionTaken || "Awaiting response"}
                  </p>
                  <p className="text-xs text-teal-700">
                    {m.actor?.name} · {formatDate(m.updatedAt)}
                  </p>
                </li>
              )
            )}
          </ul>
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            Monthly needs report
          </h2>
          <p className="mt-2 text-sm text-teal-900">{monthlyReport?.title}</p>
          <ul className="mt-3 space-y-2">
            {(monthlyReport?.gaps || []).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (g: any) => (
                <li key={g.district} className="text-sm">
                  <span className="font-medium">{g.district}</span> — {g.recommendation}
                </li>
              )
            )}
          </ul>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-teal-900">Active escalations</h3>
            <ul className="mt-2 space-y-2">
              {(escalations || []).slice(0, 4).map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (e: any) => (
                  <li key={e.id} className="flex items-center justify-between text-sm">
                    <Link href={`/projects/${e.projectId}`} className="underline">
                      {e.project?.name || e.projectId}
                    </Link>
                    <RagBadge status={e.ragTrigger} size="sm" />
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
