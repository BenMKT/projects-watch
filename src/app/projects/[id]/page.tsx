"use client";

import { useEffect, useState, use } from "react";
import { RagBadge } from "@/components/RagBadge";
import { EvidenceReportForm } from "@/components/EvidenceReportForm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Bell, BellOff } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [ragInfo, setRagInfo] = useState<{ rationale?: string; reportCount?: number; meetsMinimum?: boolean } | null>(null);

  function load() {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then(setProject);
    fetch(`/api/rag?projectId=${id}`)
      .then((r) => r.json())
      .then(setRagInfo);
  }

  useEffect(() => {
    load();
    if (session?.user) {
      fetch(`/api/subscriptions?projectId=${id}`)
        .then((r) => r.json())
        .then((subs) => setSubscribed(Array.isArray(subs) && subs.length > 0));
    }
  }, [id, session?.user]);

  async function toggleSub() {
    if (!session?.user) {
      alert("Sign in to subscribe");
      return;
    }
    if (subscribed) {
      await fetch(`/api/subscriptions?projectId=${id}`, { method: "DELETE" });
      setSubscribed(false);
    } else {
      await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      setSubscribed(true);
    }
  }

  if (!project || project.error) {
    return <div className="p-8 text-teal-800">Loading project…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-teal-700">
            {project.projectCode} · {project.district} · {project.sector}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-teal-950 sm:text-4xl">
            {project.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <RagBadge status={project.finalRag} />
            {!project.statusPublished && (
              <span className="text-xs text-amber-700">Provisional: {project.provisionalRag}</span>
            )}
          </div>
        </div>
        <button
          onClick={toggleSub}
          className="inline-flex items-center gap-2 rounded-lg border border-teal-900/15 bg-white px-4 py-2 text-sm text-teal-900"
        >
          {subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {subscribed ? "Unsubscribe" : "Subscribe to alerts"}
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="border-t border-teal-900/10 pt-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">Scope</h2>
            <p className="mt-2 text-sm leading-relaxed text-teal-900/80">{project.scope}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-teal-700">Contractor</dt>
                <dd className="font-medium">{project.contractor}</dd>
              </div>
              <div>
                <dt className="text-teal-700">Contract sum</dt>
                <dd className="font-medium">{formatCurrency(project.contractSum)}</dd>
              </div>
              <div>
                <dt className="text-teal-700">Duration</dt>
                <dd className="font-medium">{project.durationMonths} months</dd>
              </div>
              <div>
                <dt className="text-teal-700">Started</dt>
                <dd className="font-medium">{formatDate(project.startDate)}</dd>
              </div>
            </dl>
          </section>

          <section className="border-t border-teal-900/10 pt-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
              Milestones
            </h2>
            <ol className="mt-3 space-y-3">
              {project.milestones?.map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (m: any) => (
                  <li key={m.id} className="flex gap-3 text-sm">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        m.completed ? "bg-emerald-500" : "bg-teal-300"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-teal-950">{m.title}</p>
                      <p className="text-teal-800/70">{m.description}</p>
                      <p className="text-xs text-teal-700">Due {formatDate(m.dueDate)}</p>
                    </div>
                  </li>
                )
              )}
            </ol>
          </section>

          <section className="border-t border-teal-900/10 pt-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
              Citizen evidence
            </h2>
            <p className="mt-1 text-xs text-teal-700">
              {ragInfo?.reportCount ?? 0} reports ·{" "}
              {ragInfo?.meetsMinimum
                ? ragInfo.rationale
                : "Need 3 independent reports for provisional RAG"}
            </p>
            <ul className="mt-4 space-y-3">
              {project.reports?.map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (r: any) => (
                  <li key={r.id} className="rounded-lg bg-white/70 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-teal-700">
                      <span>{r.type}</span>
                      <span>·</span>
                      <span>{r.anonymisedReporter}</span>
                      <span>·</span>
                      <span>{r.sentiment}</span>
                      <span>·</span>
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-teal-950">{r.content}</p>
                  </li>
                )
              )}
            </ul>
          </section>
        </div>

        <div>
          <EvidenceReportForm
            projectId={id}
            milestones={project.milestones || []}
            onSubmitted={load}
          />
        </div>
      </div>
    </div>
  );
}
