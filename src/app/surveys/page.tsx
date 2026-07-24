"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SurveysPublicPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [surveys, setSurveys] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/surveys?status=PUBLISHED")
      .then((r) => r.json())
      .then((d) => setSurveys(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Published survey summaries
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        General citizens can view published summaries. Raw household responses remain restricted.
      </p>
      <ul className="mt-8 space-y-4">
        {surveys.map((s) => (
          <li key={s.id} className="border-t border-teal-900/10 pt-4">
            <p className="font-[family-name:var(--font-display)] text-xl text-teal-950">{s.title}</p>
            <p className="text-sm text-teal-800/70">
              {s.domain} · {s.district} · {s._count?.responses ?? 0} responses
            </p>
            <p className="mt-2 text-sm text-teal-900">{s.description}</p>
          </li>
        ))}
        {surveys.length === 0 && (
          <li className="text-sm text-teal-700">
            No published surveys yet. Field officers:{" "}
            <Link href="/officer" className="underline">
              open field workspace
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
