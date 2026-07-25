"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Mode = "URL" | "BLOB";

export default function AdminBriefingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("URL");
  const [title, setTitle] = useState("");
  const [narrative, setNarrative] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [committee, setCommittee] = useState("");
  const [district, setDistrict] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [published, setPublished] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadEnabled, setUploadEnabled] = useState(false);
  const [demo, setDemo] = useState(true);

  const role = session?.user?.role;
  const allowed = role === "SUPER_ADMIN" || role === "PARLIAMENTARY";

  useEffect(() => {
    fetch("/api/briefings")
      .then((r) => r.json())
      .then((d) => {
        const isDemo = Boolean(d.demo);
        setUploadEnabled(Boolean(d.uploadEnabled));
        setDemo(isDemo);
        if (isDemo || !d.uploadEnabled) setMode("URL");
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (status === "authenticated" && !allowed) {
      router.replace("/briefings");
    }
  }, [status, allowed, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "BLOB") {
        if (demo || !uploadEnabled) {
          setMessage(
            "Attachments need a live database and BLOB_READ_WRITE_TOKEN. Use Link mode in demo."
          );
          setLoading(false);
          return;
        }
        if (!file) {
          setMessage("Choose a video file to upload.");
          setLoading(false);
          return;
        }
        const fd = new FormData();
        fd.set("file", file);
        fd.set("title", title);
        fd.set("narrative", narrative);
        fd.set("sessionDate", sessionDate);
        fd.set("committee", committee);
        fd.set("district", district);
        fd.set("published", String(published));
        const res = await fetch("/api/briefings/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "Upload failed");
          setLoading(false);
          return;
        }
        router.push("/briefings");
        return;
      }

      const res = await fetch("/api/briefings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          narrative,
          videoUrl,
          videoSource: "URL",
          sessionDate,
          committee: committee || null,
          district: district || null,
          published,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(
          typeof data.error === "string"
            ? data.error
            : "Could not publish briefing. Check required fields."
        );
        setLoading(false);
        return;
      }
      router.push("/briefings");
    } catch {
      setMessage("Network error — try again.");
      setLoading(false);
    }
  }

  if (status === "loading") {
    return <div className="p-8 text-teal-800">Loading…</div>;
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-wider text-teal-700">Admin · Parliamentary</p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Publish Chamber Briefing
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Link a session recording or archive a file to Blob.{" "}
        <Link href="/briefings" className="underline">
          View public feed
        </Link>
      </p>

      {demo && (
        <p className="mt-4 border-l-2 border-amber-500 pl-3 text-sm text-amber-900">
          Demo mode: URL links only. Attachment upload is disabled until Prisma + Blob are
          configured.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
            Video source
          </p>
          <div className="flex gap-2">
            {(
              [
                ["URL", "Link (URL)"],
                ["BLOB", "Attachment (Blob)"],
              ] as const
            ).map(([value, label]) => {
              const disabled = value === "BLOB" && (demo || !uploadEnabled);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setMode(value)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    mode === value
                      ? "bg-teal-800 text-white"
                      : "bg-teal-900/8 text-teal-900 hover:bg-teal-900/15"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block text-sm">
          <span className="text-teal-900/70">Title</span>
          <input
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-teal-900/15 bg-white px-3 py-2"
            placeholder="PAC hearing — district project name"
          />
        </label>

        <label className="block text-sm">
          <span className="text-teal-900/70">Short narrative</span>
          <textarea
            required
            minLength={10}
            rows={4}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            className="mt-1 w-full rounded-md border border-teal-900/15 bg-white px-3 py-2"
            placeholder="Why this session matters for civic oversight…"
          />
        </label>

        {mode === "URL" ? (
          <label className="block text-sm">
            <span className="text-teal-900/70">Video URL</span>
            <input
              required
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="mt-1 w-full rounded-md border border-teal-900/15 bg-white px-3 py-2"
              placeholder="YouTube, Vimeo, or direct .mp4 / .webm URL"
            />
            <span className="mt-1 block text-xs text-teal-700/80">
              Embeds YouTube &amp; Vimeo; plays direct files; other portals open in a new tab.
            </span>
          </label>
        ) : (
          <label className="block text-sm">
            <span className="text-teal-900/70">Video file (MP4 / WebM, max 200MB)</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-teal-900/70">Session date</span>
            <input
              required
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-teal-900/15 bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-teal-900/70">District (optional)</span>
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-1 w-full rounded-md border border-teal-900/15 bg-white px-3 py-2"
              placeholder="Kampala"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-teal-900/70">Committee (optional)</span>
          <input
            value={committee}
            onChange={(e) => setCommittee(e.target.value)}
            className="mt-1 w-full rounded-md border border-teal-900/15 bg-white px-3 py-2"
            placeholder="Public Accounts Committee"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-teal-900">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Publish immediately to the public feed
        </label>

        {message && <p className="text-sm text-rose-700">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
        >
          {loading ? "Publishing…" : mode === "BLOB" ? "Upload & publish" : "Publish link"}
        </button>
      </form>
    </div>
  );
}
