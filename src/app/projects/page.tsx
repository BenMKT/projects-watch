"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RagBadge } from "@/components/RagBadge";
import { formatCurrency } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  projectCode: string;
  contractor: string;
  district: string;
  sector: string;
  contractSum: number;
  finalRag: string;
  _count?: { reports: number; subscriptions: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Monitored projects
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Public register of onboarded works with published RAG status.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="block border-t-2 border-teal-800/20 bg-white/60 p-5 transition hover:bg-white"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-teal-700">{p.sector}</p>
              <RagBadge status={p.finalRag} size="sm" />
            </div>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl text-teal-950">
              {p.name}
            </h2>
            <p className="mt-1 text-sm text-teal-800/70">
              {p.projectCode} · {p.district}
            </p>
            <p className="mt-3 text-sm text-teal-900">
              {p.contractor} · {formatCurrency(p.contractSum)}
            </p>
            <p className="mt-2 text-xs text-teal-700">
              {p._count?.reports ?? 0} citizen reports · {p._count?.subscriptions ?? 0} subscribers
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
