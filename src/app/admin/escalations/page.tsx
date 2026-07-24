"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

export default function AdminEscalationsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  function load() {
    fetch("/api/escalations")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    load();
  }, []);

  async function update(id: string, status: string) {
    const res = await fetch("/api/escalations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        escalationId: id,
        status,
        acknowledgement: `Marked ${status}`,
        actionTaken: status === "RESOLVED" ? "Corrective action recorded" : undefined,
      }),
    });
    if (res.ok) {
      setMsg(`Escalation ${status}`);
      load();
    } else setMsg("Update failed");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Escalation desk
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Green → info · Amber → 14 days · Red → 5 days + IGG + parliamentary committee
      </p>
      {msg && <p className="mt-4 text-sm text-teal-700">{msg}</p>}
      <ul className="mt-8 space-y-4">
        {items.map((e) => (
          <li key={e.id} className="rounded-xl border border-teal-900/10 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-teal-950">
                  {e.project?.name || e.project?.projectCode}
                </p>
                <p className="text-xs text-teal-700">
                  {e.level} · {e.status} · deadline {formatDate(e.deadline)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => update(e.id, "ACKNOWLEDGED")}
                  className="rounded border px-2 py-1 text-xs"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => update(e.id, "IN_PROGRESS")}
                  className="rounded border px-2 py-1 text-xs"
                >
                  In progress
                </button>
                <button
                  onClick={() => update(e.id, "RESOLVED")}
                  className="rounded bg-teal-800 px-2 py-1 text-xs text-white"
                >
                  Resolve
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-teal-900/80">{e.publicStatement}</p>
            <p className="mt-1 text-xs text-teal-700">
              Notified: {((e.notifiedBodies as string[]) || []).join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
