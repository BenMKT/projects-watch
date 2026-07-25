"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { RagBadge } from "@/components/RagBadge";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/utils";

export default function AdminHomePage() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analytics, setAnalytics] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [audit, setAudit] = useState<any>(null);

  useEffect(() => {
    fetch("/api/analytics?view=export").then((r) => r.json()).then(setAnalytics);
    fetch("/api/audit").then((r) => (r.ok ? r.json() : null)).then(setAudit);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-wider text-teal-700">
        {session?.user?.role ? ROLE_LABELS[session.user.role] : "Admin"}
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Ministry & district console
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Project onboarding, RAG publication, survey approval, escalations, exports.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["/admin/projects", "Onboard / manage projects", true],
            ["/admin/rag", "Review & publish RAG", true],
            [
              "/admin/briefings",
              "Chamber Briefings",
              session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "PARLIAMENTARY",
            ],
            ["/admin/surveys", "Approve surveys", true],
            ["/admin/escalations", "Escalation desk", true],
            ["/admin/volunteers", "Manage volunteers", true],
            ["/admin/audit", "Audit & retention", true],
          ] as Array<[string, string, boolean]>
        )
          .filter(([, , show]) => show)
          .map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-teal-900/10 bg-white px-4 py-4 text-sm font-medium text-teal-950 hover:border-teal-700"
            >
              {label}
            </Link>
          ))}
      </div>

      {analytics && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Live overview</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {Object.entries(analytics.overview?.ragCounts || {}).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <RagBadge status={k} size="sm" />
                <span className="text-sm font-semibold">{String(v)}</span>
              </div>
            ))}
          </div>
          <ul className="mt-6 space-y-2">
            {(analytics.escalations || []).slice(0, 5).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (e: any) => (
                <li key={e.id} className="flex justify-between border-t border-teal-900/10 pt-2 text-sm">
                  <span>
                    {e.project?.name} · {e.level} · {e.status}
                  </span>
                  <span className="text-teal-700">Deadline {formatDate(e.deadline)}</span>
                </li>
              )
            )}
          </ul>
        </section>
      )}

      {audit?.logs && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Recent audit trail</h2>
          <ul className="mt-3 max-h-64 overflow-y-auto text-xs">
            {audit.logs.slice(0, 15).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (l: any) => (
                <li key={l.id} className="border-t border-teal-900/5 py-2">
                  <span className="font-medium">{l.action}</span> · {l.entity} ·{" "}
                  {l.user?.name || "system"} · {formatDate(l.createdAt)}
                </li>
              )
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
