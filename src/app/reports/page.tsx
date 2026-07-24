"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { DISTRICTS } from "@/lib/surveys";

interface FeedItem {
  id: string;
  projectName: string;
  projectId?: string;
  district: string;
  type: string;
  content: string | null;
  sentiment: string | null;
  anonymisedReporter: string;
  createdAt: string;
}

export default function ReportsFeedPage() {
  const [reports, setReports] = useState<FeedItem[]>([]);
  const [district, setDistrict] = useState("");
  const [sentiment, setSentiment] = useState("");

  useEffect(() => {
    const q = new URLSearchParams();
    if (district) q.set("district", district);
    if (sentiment) q.set("sentiment", sentiment);
    fetch(`/api/reports?${q}`)
      .then((r) => r.json())
      .then((d) => setReports(Array.isArray(d) ? d : []));
  }, [district, sentiment]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Community reports feed
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Filterable public evidence stream. Reporters are anonymised.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
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
          value={sentiment}
          onChange={(e) => setSentiment(e.target.value)}
          className="rounded-lg border border-teal-900/15 bg-white px-3 py-2 text-sm"
        >
          <option value="">All sentiment</option>
          <option value="POSITIVE">Positive</option>
          <option value="NEUTRAL">Neutral</option>
          <option value="NEGATIVE">Negative</option>
        </select>
      </div>

      <ul className="mt-8 space-y-4">
        {reports.map((r) => (
          <li key={r.id} className="border-t border-teal-900/10 pt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-teal-700">
              <span
                className={`rounded px-1.5 py-0.5 ${
                  r.sentiment === "POSITIVE"
                    ? "bg-emerald-100 text-emerald-800"
                    : r.sentiment === "NEGATIVE"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {r.sentiment || "NEUTRAL"}
              </span>
              <span>{r.type}</span>
              <span>·</span>
              <span>{r.district}</span>
              <span>·</span>
              <span>{r.anonymisedReporter}</span>
              <span>·</span>
              <span>{formatDate(r.createdAt)}</span>
            </div>
            <p className="mt-2 text-teal-950">{r.content}</p>
            <Link
              href={`/projects/${r.projectId}`}
              className="mt-1 inline-block text-sm text-teal-700 underline"
            >
              {r.projectName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
