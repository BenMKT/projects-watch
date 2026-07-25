"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BriefingPlayer } from "@/components/BriefingPlayer";
import { formatDate } from "@/lib/utils";

type Briefing = {
  id: string;
  title: string;
  narrative: string;
  videoSource: "URL" | "BLOB";
  videoUrl: string;
  sessionDate: string;
  committee?: string | null;
  district?: string | null;
  author?: { name: string; role: string } | null;
};

export default function BriefingsPage() {
  const { data: session } = useSession();
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const canPublish =
    session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "PARLIAMENTARY";

  useEffect(() => {
    fetch("/api/briefings")
      .then((r) => r.json())
      .then((d) => setBriefings(d.briefings || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-teal-700">
            Parliamentary record
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-teal-950 sm:text-4xl">
            Chamber Briefings
          </h1>
          <p className="mt-2 max-w-xl text-sm text-teal-800/75">
            Session recordings and short narratives connecting debate on the floor to
            projects citizens are watching.
          </p>
        </div>
        {canPublish && (
          <Link
            href="/admin/briefings"
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900"
          >
            Publish briefing
          </Link>
        )}
      </div>

      {loading && <p className="mt-12 text-sm text-teal-700">Loading briefings…</p>}

      {!loading && !briefings.length && (
        <p className="mt-12 text-sm text-teal-700">No published briefings yet.</p>
      )}

      <ol className="mt-12 space-y-16">
        {briefings.map((b, i) => (
          <li
            key={b.id}
            className="animate-rise border-t border-teal-900/15 pt-8"
            style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-teal-700">
              <span className="rounded-sm bg-teal-900/8 px-2 py-0.5 font-medium uppercase tracking-wide text-teal-900">
                {b.videoSource === "BLOB" ? "Archived recording" : "Linked session"}
              </span>
              <span>{formatDate(b.sessionDate)}</span>
              {b.committee && <span>· {b.committee}</span>}
              {b.district && <span>· {b.district}</span>}
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
              {b.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-teal-900/85">{b.narrative}</p>
            <div className="mt-5 overflow-hidden rounded-xl border border-teal-900/10 shadow-sm">
              <BriefingPlayer videoUrl={b.videoUrl} title={b.title} />
            </div>
            {b.author?.name && (
              <p className="mt-3 text-xs text-teal-700">Filed by {b.author.name}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
