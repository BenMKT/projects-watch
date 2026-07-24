"use client";

import { useEffect, useState } from "react";
import { RagBadge } from "@/components/RagBadge";

export default function AdminRagPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rag, setRag] = useState<any>(null);
  const [finalRag, setFinalRag] = useState<"GREEN" | "AMBER" | "RED">("AMBER");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/projects?published=false")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/rag?projectId=${selected}`)
      .then((r) => r.json())
      .then((d) => {
        setRag(d);
        if (d.provisionalStatus && d.provisionalStatus !== "PENDING") {
          setFinalRag(d.provisionalStatus);
        }
      });
  }, [selected]);

  async function publish() {
    const res = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selected,
        finalRag,
        triggerEscalation: true,
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg("Publish failed — Super Admin required.");
      return;
    }
    setMsg(
      `Published ${finalRag}. Escalation ${data.escalation?.level || "none"} created with deadline ${
        data.escalation ? new Date(data.escalation.deadline).toLocaleDateString() : "n/a"
      }.`
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        RAG review & publish
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Weighted consensus produces provisional status. Admin review sets final status and triggers
        ministry alerts.
      </p>

      <label className="mt-8 block text-sm">
        <span className="text-teal-900/70">Select project</span>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
        >
          <option value="">Choose…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.provisionalRag})
            </option>
          ))}
        </select>
      </label>

      {rag && (
        <div className="mt-6 space-y-4 rounded-xl border border-teal-900/10 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <RagBadge status={rag.provisionalStatus} />
            <span className="text-sm text-teal-700">
              {rag.reportCount} reports · confidence {(rag.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm text-teal-900">{rag.rationale}</p>
          {rag.breakdown && (
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-teal-700">Sentiment</dt>
                <dd>{(rag.breakdown.sentimentAvg * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt className="text-teal-700">Activity</dt>
                <dd>{(rag.breakdown.activityAvg * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt className="text-teal-700">Negative ratio</dt>
                <dd>{(rag.breakdown.negativeRatio * 100).toFixed(0)}%</dd>
              </div>
            </dl>
          )}

          <label className="block text-sm">
            <span className="text-teal-900/70">Final published status</span>
            <select
              value={finalRag}
              onChange={(e) => setFinalRag(e.target.value as typeof finalRag)}
              className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
            >
              <option value="GREEN">Green</option>
              <option value="AMBER">Amber</option>
              <option value="RED">Red</option>
            </select>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Admin review notes"
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 text-sm"
            rows={2}
          />
          <button
            onClick={publish}
            disabled={!rag.meetsMinimum}
            className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Publish & escalate
          </button>
          {!rag.meetsMinimum && (
            <p className="text-xs text-amber-700">Minimum 3 independent reports required.</p>
          )}
        </div>
      )}
      {msg && <p className="mt-4 text-sm text-teal-800">{msg}</p>}
    </div>
  );
}
