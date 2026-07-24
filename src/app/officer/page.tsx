"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { loadDrafts } from "@/lib/offline";

export default function OfficerHomePage() {
  const { data: session } = useSession();
  const [draftCount, setDraftCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [surveys, setSurveys] = useState<any[]>([]);

  useEffect(() => {
    setDraftCount(loadDrafts().length);
    fetch("/api/surveys?status=APPROVED")
      .then((r) => r.json())
      .then((d) => setSurveys(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Field officer workspace
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Welcome {session?.user?.name}. Conduct household surveys with offline-first drafts.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/officer/survey"
          className="rounded-xl border border-teal-900/10 bg-white p-4 text-sm font-medium hover:border-teal-700"
        >
          Conduct household survey
        </Link>
        <Link
          href="/officer/offline"
          className="rounded-xl border border-teal-900/10 bg-white p-4 text-sm font-medium hover:border-teal-700"
        >
          Offline drafts ({draftCount})
        </Link>
      </div>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl">Approved surveys</h2>
      <ul className="mt-3 space-y-2">
        {surveys.map((s) => (
          <li key={s.id} className="border-t border-teal-900/10 pt-2 text-sm">
            <Link href={`/officer/survey?id=${s.id}`} className="font-medium text-teal-900 underline">
              {s.title}
            </Link>
            <p className="text-xs text-teal-700">
              {s.domain} · {s.district}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
