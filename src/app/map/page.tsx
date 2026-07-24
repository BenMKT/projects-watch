"use client";

import { useEffect, useState } from "react";
import { ProjectMap, type MapProject } from "@/components/ProjectMap";
import { RagBadge } from "@/components/RagBadge";
import { DISTRICTS } from "@/lib/surveys";

export default function MapPage() {
  const [projects, setProjects] = useState<MapProject[]>([]);
  const [district, setDistrict] = useState("");
  const [rag, setRag] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (district) params.set("district", district);
    if (rag) params.set("rag", rag);
    fetch(`/api/projects?${params}`)
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
  }, [district, rag]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
            Interactive project map
          </h1>
          <p className="mt-1 text-sm text-teal-800/70">
            Color-coded RAG markers with verified GPS coordinates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="rounded-lg border border-teal-900/15 bg-white px-3 py-2 text-sm"
          >
            <option value="">All districts</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={rag}
            onChange={(e) => setRag(e.target.value)}
            className="rounded-lg border border-teal-900/15 bg-white px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="GREEN">Green</option>
            <option value="AMBER">Amber</option>
            <option value="RED">Red</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-teal-900/10 shadow-sm">
        <ProjectMap projects={projects} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {(["GREEN", "AMBER", "RED", "PENDING"] as const).map((s) => (
          <RagBadge key={s} status={s} />
        ))}
      </div>

      <ul className="mt-8 divide-y divide-teal-900/10 border-t border-teal-900/10">
        {projects.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium text-teal-950">{p.name}</p>
              <p className="text-xs text-teal-800/60">
                {p.projectCode} · {p.district}
              </p>
            </div>
            <RagBadge status={p.finalRag} size="sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}
