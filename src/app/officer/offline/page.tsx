"use client";

import { useEffect, useState } from "react";
import {
  loadDrafts,
  removeDraft,
  syncPendingDrafts,
  type OfflineDraft,
} from "@/lib/offline";

export default function OfflineDraftsPage() {
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [msg, setMsg] = useState("");

  function refresh() {
    setDrafts(loadDrafts());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function syncAll() {
    setMsg("Syncing…");
    const results = await syncPendingDrafts(async (draft) => {
      const endpoint =
        draft.type === "survey" ? "/api/surveys/responses" : "/api/reports";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft.payload),
      });
      if (res.status === 409) {
        const data = await res.json();
        return { ok: false, conflict: true, serverUpdatedAt: data.serverUpdatedAt };
      }
      return { ok: res.ok };
    });
    setMsg(`Sync complete: ${results.map((r) => r.status).join(", ") || "nothing queued"}`);
    refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Offline drafts
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Locally encrypted drafts with GPS/photo caching. Auto-syncs when connectivity returns;
        conflicts use last-write-wins.
      </p>

      <button
        onClick={syncAll}
        className="mt-6 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white"
      >
        Sync now
      </button>
      {msg && <p className="mt-2 text-sm text-teal-800">{msg}</p>}

      <ul className="mt-8 space-y-3">
        {drafts.length === 0 && (
          <li className="text-sm text-teal-700">No pending drafts.</li>
        )}
        {drafts.map((d) => (
          <li key={d.id} className="rounded-xl border border-teal-900/10 bg-white p-4 text-sm">
            <p className="font-medium">
              {d.type} · {d.syncStatus}
            </p>
            <p className="text-xs text-teal-700">
              Updated {new Date(d.updatedAt).toLocaleString()}
              {d.latitude != null ? ` · GPS ${d.latitude.toFixed(4)}, ${d.longitude?.toFixed(4)}` : ""}
            </p>
            <button
              onClick={() => {
                removeDraft(d.id);
                refresh();
              }}
              className="mt-2 text-xs text-rose-700 underline"
            >
              Discard
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
