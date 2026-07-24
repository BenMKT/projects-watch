"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SURVEY_TEMPLATES } from "@/lib/surveys";
import { isOnline, saveDraft, cachePhoto } from "@/lib/offline";
import { encryptOfflineDraft } from "@/lib/client-crypto";
import type { SurveyQuestion } from "@/lib/surveys";

function SurveyConductor() {
  const params = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [survey, setSurvey] = useState<any>(null);
  const [householdCode, setHouseholdCode] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [msg, setMsg] = useState("");
  const [lowLiteracy, setLowLiteracy] = useState(false);

  useEffect(() => {
    const id = params.get("id");
    fetch("/api/surveys?status=APPROVED")
      .then((r) => r.json())
      .then((list) => {
        const found = Array.isArray(list)
          ? id
            ? list.find((s: { id: string }) => s.id === id) || list[0]
            : list[0]
          : null;
        setSurvey(found || null);
      });
  }, [params]);

  const questions: SurveyQuestion[] =
    survey?.questions ||
    SURVEY_TEMPLATES.INFRASTRUCTURE.questions;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!survey) return;

    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
      );
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch {
      /* optional */
    }

    const payload = {
      surveyId: survey.id,
      householdCode: householdCode || `HH-${Date.now()}`,
      answers,
      latitude,
      longitude,
      photoCache: [],
      isOfflineDraft: !isOnline(),
      clientUpdatedAt: new Date().toISOString(),
    };

    if (!isOnline()) {
      const id = `survey_${Date.now()}`;
      saveDraft({
        id,
        type: "survey",
        payload,
        encryptedPayload: encryptOfflineDraft(payload),
        latitude,
        longitude,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: "pending",
      });
      setMsg("Encrypted offline draft saved. Will auto-sync when online.");
      setAnswers({});
      setHouseholdCode("");
      return;
    }

    const res = await fetch("/api/surveys/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMsg("Survey response synced securely.");
      setAnswers({});
      setHouseholdCode("");
    } else if (res.status === 409) {
      setMsg("Conflict detected — open Offline drafts to resolve.");
    } else {
      setMsg("Submit failed — check you are signed in as a field officer.");
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `photo_${Date.now()}`;
      cachePhoto(id, String(reader.result));
      setMsg(`Photo cached locally (${id})`);
    };
    reader.readAsDataURL(file);
  }

  if (!survey) {
    return <p className="p-8 text-sm">No approved surveys available.</p>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
            {survey.title}
          </h1>
          <p className="text-sm text-teal-800/70">
            {survey.domain} · {survey.district}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLowLiteracy((v) => !v)}
          className="rounded-lg border border-teal-900/15 px-3 py-1.5 text-xs"
        >
          {lowLiteracy ? "Standard text" : "Simple language"}
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="text-teal-900/70">Household code</span>
          <input
            value={householdCode}
            onChange={(e) => setHouseholdCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
            placeholder="Auto-generated if empty"
          />
        </label>

        {questions.map((q) => (
          <label key={q.id} className="block text-sm">
            <span className="text-teal-900/80">
              {lowLiteracy && q.lowLiteracyPrompt ? q.lowLiteracyPrompt : q.prompt}
            </span>
            {q.type === "boolean" ? (
              <select
                required={q.required}
                className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
                value={String(answers[q.id] ?? "")}
                onChange={(e) =>
                  setAnswers({ ...answers, [q.id]: e.target.value === "true" })
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : q.type === "select" ? (
              <select
                required={q.required}
                className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
                value={String(answers[q.id] ?? "")}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              >
                <option value="">Select</option>
                {(q.options || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : q.type === "scale" ? (
              <input
                type="range"
                min={1}
                max={5}
                required={q.required}
                value={Number(answers[q.id] ?? 3)}
                onChange={(e) => setAnswers({ ...answers, [q.id]: Number(e.target.value) })}
                className="mt-2 w-full"
              />
            ) : (
              <textarea
                required={q.required}
                className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
                rows={2}
                value={String(answers[q.id] ?? "")}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
            )}
            {q.type === "scale" && (
              <p className="text-xs text-teal-700">Score: {String(answers[q.id] ?? 3)} / 5</p>
            )}
          </label>
        ))}

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-teal-900/15 px-3 py-2 text-sm">
          Cache site photo
          <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        </label>

        <button type="submit" className="w-full rounded-lg bg-teal-800 py-2.5 text-sm font-semibold text-white">
          {isOnline() ? "Submit & sync" : "Save encrypted offline draft"}
        </button>
        {msg && <p className="text-sm text-teal-800">{msg}</p>}
      </form>
    </div>
  );
}

export default function OfficerSurveyPage() {
  return (
    <Suspense>
      <SurveyConductor />
    </Suspense>
  );
}
