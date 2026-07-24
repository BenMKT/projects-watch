"use client";

import { FormEvent, useEffect, useState } from "react";
import { DISTRICTS, SURVEY_TEMPLATES } from "@/lib/surveys";

export default function AdminSurveysPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [surveys, setSurveys] = useState<any[]>([]);
  const [domain, setDomain] = useState<keyof typeof SURVEY_TEMPLATES>("INFRASTRUCTURE");
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [title, setTitle] = useState("");

  function load() {
    fetch("/api/surveys")
      .then((r) => r.json())
      .then((d) => setSurveys(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || SURVEY_TEMPLATES[domain].title,
        domain,
        district,
        description: SURVEY_TEMPLATES[domain].description,
        useTemplate: true,
      }),
    });
    setTitle("");
    load();
  }

  async function setStatus(surveyId: string, status: string) {
    await fetch("/api/surveys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surveyId, status }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Survey management
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Create domain surveys and approve for field officers. Raw survey data is not public.
      </p>

      <form onSubmit={create} className="mt-8 space-y-3 rounded-xl border border-teal-900/10 bg-white p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Survey title"
          className="w-full rounded-lg border border-teal-900/15 px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as typeof domain)}
            className="rounded-lg border border-teal-900/15 px-3 py-2 text-sm"
          >
            {Object.keys(SURVEY_TEMPLATES).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="rounded-lg border border-teal-900/15 px-3 py-2 text-sm"
          >
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-teal-800 px-4 py-2 text-sm text-white">
          Create survey
        </button>
      </form>

      <ul className="mt-8 space-y-3">
        {surveys.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-teal-900/10 pt-3 text-sm">
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-teal-700">
                {s.domain} · {s.district} · {s.status} · {s._count?.responses ?? 0} responses
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStatus(s.id, "APPROVED")} className="rounded border px-2 py-1 text-xs">
                Approve
              </button>
              <button
                onClick={() => setStatus(s.id, "PUBLISHED")}
                className="rounded bg-teal-800 px-2 py-1 text-xs text-white"
              >
                Publish summary
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
