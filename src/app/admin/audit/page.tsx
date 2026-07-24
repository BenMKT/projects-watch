"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

export default function AuditPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data || data.error) {
    return <div className="p-8 text-sm text-teal-800">Loading audit trail… (requires parliamentary / super admin)</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Audit trails & retention
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Timestamped actions for accountability. GDPR / local retention policies below.
      </p>

      <section className="mt-8">
        <h2 className="font-semibold text-teal-950">Data retention policies</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data.policies || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => (
              <li key={p.id} className="border-t border-teal-900/10 pt-2">
                <span className="font-medium">{p.entityType}</span> — retain {p.retentionDays} days
                {p.anonymiseAfter ? `, anonymise after ${p.anonymiseAfter} days` : ""} · {p.description}
              </li>
            )
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-teal-950">Recent logs</h2>
        <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto text-xs">
          {(data.logs || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (l: any) => (
              <li key={l.id} className="rounded-lg bg-white/70 px-3 py-2">
                <span className="font-semibold">{l.action}</span> on {l.entity}
                {l.entityId ? ` (${l.entityId.slice(0, 8)}…)` : ""} by{" "}
                {l.user?.name || "system"} · {formatDate(l.createdAt)}
              </li>
            )
          )}
        </ul>
      </section>
    </div>
  );
}
