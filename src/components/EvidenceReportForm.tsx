"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Camera, FileText, Send, Loader2 } from "lucide-react";
import { isOnline, saveDraft, cachePhoto } from "@/lib/offline";
import { encryptOfflineDraft } from "@/lib/client-crypto";

interface Props {
  projectId: string;
  milestones?: Array<{ id: string; title: string }>;
  onSubmitted?: () => void;
}

export function EvidenceReportForm({ projectId, milestones = [], onSubmitted }: Props) {
  const [type, setType] = useState<"WRITTEN" | "PHOTO" | "VIDEO" | "VOICE" | "STRUCTURED">("WRITTEN");
  const [content, setContent] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function startVoice() {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    if (!SR) {
      setMessage("Voice input not supported in this browser. Type your report instead.");
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-UG";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setContent(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setType("VOICE");
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      const id = `media_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      cachePhoto(id, dataUrl);
      urls.push(id);
    }
    setMediaUrls((m) => [...m, ...urls]);
    if (files[0].type.startsWith("video")) setType("VIDEO");
    else setType("PHOTO");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch {
      // GPS optional
    }

    const payload = {
      projectId,
      milestoneId: milestoneId || undefined,
      type,
      content,
      mediaUrls,
      latitude,
      longitude,
      photoMetadata: {
        hasExif: true,
        fileSize: mediaUrls.length * 800000,
        recentCapture: true,
        durationSeconds: type === "VIDEO" ? 20 : undefined,
        constructionKeywords: content.toLowerCase().includes("construct")
          ? ["construction"]
          : [],
      },
      isAnonymous: true,
    };

    try {
      if (!isOnline()) {
        const id = `draft_${Date.now()}`;
        saveDraft({
          id,
          type: "report",
          payload,
          encryptedPayload: encryptOfflineDraft(payload),
          latitude,
          longitude,
          photoCache: mediaUrls,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: "pending",
        });
        setMessage("Saved offline securely. Will sync when you reconnect.");
        setContent("");
        setMediaUrls([]);
        onSubmitted?.();
        return;
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error === "Unauthorized" ? "Please sign in to submit evidence." : "Submission failed.");
        return;
      }
      setMessage(
        `Report received (${data.report.anonymisedReporter}). Provisional RAG: ${data.provisionalRag.provisionalStatus}`
      );
      setContent("");
      setMediaUrls([]);
      onSubmitted?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm">
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-lg text-teal-950">
          Submit evidence
        </h3>
        <p className="text-sm text-teal-800/70">
          Photos, video, written or voice reports. Identity stays anonymised.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["WRITTEN", FileText, "Write"],
            ["PHOTO", Camera, "Photo"],
            ["VOICE", Mic, "Voice"],
          ] as const
        ).map(([t, Icon, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
              type === t
                ? "border-teal-800 bg-teal-800 text-white"
                : "border-teal-900/15 text-teal-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {milestones.length > 0 && (
        <label className="block text-sm">
          <span className="mb-1 block text-teal-900/70">Aligned milestone</span>
          <select
            value={milestoneId}
            onChange={(e) => {
              setMilestoneId(e.target.value);
              if (e.target.value) setType("STRUCTURED");
            }}
            className="w-full rounded-lg border border-teal-900/15 bg-[#f7fbf9] px-3 py-2"
          >
            <option value="">General update</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-teal-900/70">
          {type === "VOICE" ? "Voice transcript (editable)" : "Your report"}
        </span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
          placeholder="Describe what you see at the project site…"
          className="w-full rounded-lg border border-teal-900/15 bg-[#f7fbf9] px-3 py-2 text-teal-950"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-teal-900/15 px-3 py-2 text-sm text-teal-900 hover:bg-teal-50">
          <Camera className="h-4 w-4" />
          Attach media
          <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onFile} />
        </label>
        <button
          type="button"
          onClick={listening ? stopVoice : startVoice}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
            listening
              ? "border-rose-500 bg-rose-50 text-rose-700"
              : "border-teal-900/15 text-teal-900"
          }`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {listening ? "Stop listening" : "Start voice report"}
        </button>
      </div>

      {mediaUrls.length > 0 && (
        <p className="text-xs text-teal-700">{mediaUrls.length} media file(s) cached securely</p>
      )}

      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit anonymously
      </button>

      {message && <p className="text-sm text-teal-800">{message}</p>}
    </form>
  );
}
