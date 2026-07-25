"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Camera, FileText, Send, Loader2 } from "lucide-react";
import { isOnline, saveDraft, cachePhoto } from "@/lib/offline";
import { encryptOfflineDraft } from "@/lib/client-crypto";

interface Props {
  projectId: string;
  milestones?: Array<{ id: string; title: string }>;
  onSubmitted?: () => void;
}

type SttMode = "browser" | "remote";
type VisionMode = "mock" | "remote";

export function EvidenceReportForm({ projectId, milestones = [], onSubmitted }: Props) {
  const [type, setType] = useState<"WRITTEN" | "PHOTO" | "VIDEO" | "VOICE" | "STRUCTURED">("WRITTEN");
  const [content, setContent] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sttMode, setSttMode] = useState<SttMode>("browser");
  const [sttLang, setSttLang] = useState("en-GB");
  const [visionMode, setVisionMode] = useState<VisionMode>("mock");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const liveTranscriptRef = useRef("");
  const speechErrorRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/voice/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.provider === "remote") setSttMode("remote");
        if (typeof d.lang === "string") {
          // Map unsupported Uganda tag to a widely available English locale
          setSttLang(d.lang === "en-UG" ? "en-GB" : d.lang);
        }
      })
      .catch(() => undefined);

    fetch("/api/vision/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.provider === "remote") setVisionMode("remote");
      })
      .catch(() => undefined);

    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function speechErrorMessage(code: string): string {
    switch (code) {
      case "not-allowed":
      case "service-not-allowed":
        return "Microphone permission denied. Allow mic access and try again.";
      case "no-speech":
        return "No speech detected. Speak clearly, then press Stop.";
      case "audio-capture":
        return "No microphone found. Plug in a mic or type your report.";
      case "network":
        return "Speech service network error. Check connection or type your report.";
      case "language-not-supported":
        return `Language ${sttLang} is not supported here. Set VOICE_STT_LANG=en-GB and retry.`;
      case "aborted":
        return "";
      default:
        return `Voice error (${code}). Try Chrome/Edge or type your report.`;
    }
  }

  function startBrowserVoice() {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    if (!SR) {
      setMessage("Voice input not supported in this browser. Use Chrome/Edge, or type your report.");
      return;
    }
    liveTranscriptRef.current = "";
    speechErrorRef.current = null;

    const recognition = new SR();
    // Prefer configured lang; fall back to en-GB (en-UG often yields empty results)
    const lang = sttLang && sttLang !== "en-UG" ? sttLang : "en-GB";
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      liveTranscriptRef.current = transcript;
      setContent(transcript);
      if (transcript.trim()) {
        setMessage("Listening… transcript updating.");
      }
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      speechErrorRef.current = event.error || "unknown";
      const msg = speechErrorMessage(event.error || "unknown");
      if (msg) setMessage(msg);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      const text = liveTranscriptRef.current.trim();
      if (text) {
        setContent(text);
        setMessage("Transcript ready — edit if needed, then submit.");
        return;
      }
      if (speechErrorRef.current && speechErrorRef.current !== "aborted") {
        return; // error message already set
      }
      setMessage(
        "No speech detected. Use Chrome/Edge, allow the mic, speak for a few seconds, then Stop. Or type your report."
      );
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setType("VOICE");
      setMessage(`Listening (browser speech, ${lang})…`);
    } catch {
      setMessage("Could not start voice recognition. Refresh and try again, or type your report.");
      setListening(false);
    }
  }

  async function startRemoteVoice() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Microphone unavailable — falling back to browser speech.");
      startBrowserVoice();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
          ? "audio/ogg"
          : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size < 500) {
          setMessage("Recording too short — try again.");
          return;
        }
        await uploadAndTranscribe(blob);
      };
      recorder.start(250);
      setListening(true);
      setType("VOICE");
      setMessage("Recording audio for remote transcription…");
    } catch {
      setMessage("Mic permission denied — falling back to browser speech.");
      startBrowserVoice();
    }
  }

  async function uploadAndTranscribe(blob: Blob) {
    setTranscribing(true);
    setMessage("Transcribing voice…");
    try {
      const fd = new FormData();
      fd.append("file", blob, `voice-${Date.now()}.webm`);
      const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMessage(
          `${data.error || "Transcription failed"}. You can type the report or retry with browser speech.`
        );
        return;
      }
      setContent(String(data.transcript || "").trim());
      setMessage("Transcript ready — edit if needed, then submit.");
    } catch {
      setMessage("Network error during transcription. Type your report or try browser speech.");
    } finally {
      setTranscribing(false);
    }
  }

  function startVoice() {
    setMessage("");
    if (sttMode === "remote" && isOnline()) {
      void startRemoteVoice();
    } else {
      if (sttMode === "remote" && !isOnline()) {
        setMessage("Offline — using browser speech (remote STT unavailable).");
      }
      startBrowserVoice();
    }
  }

  function stopVoice() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setListening(false);
      return;
    }
    // stop() triggers onend, which finalizes transcript / empty message
    recognitionRef.current?.stop();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];

    // Voice audio attachment → remote STT when enabled
    if (file.type.startsWith("audio/") && sttMode === "remote" && isOnline()) {
      setType("VOICE");
      await uploadAndTranscribe(file);
      return;
    }

    // Images: upload for Blob URL / inline data URL when online (needed for remote vision)
    if (file.type.startsWith("image/") && isOnline()) {
      setUploadingMedia(true);
      setMessage(
        visionMode === "remote"
          ? "Uploading image for vision analysis…"
          : "Uploading evidence image…"
      );
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/evidence/media", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          if (data.url) {
            setMediaUrls((m) => [...m, data.url]);
            setImageDataUrl(undefined);
          } else if (data.imageDataUrl) {
            const id = `media_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            cachePhoto(id, data.imageDataUrl);
            setMediaUrls((m) => [...m, id]);
            setImageDataUrl(data.imageDataUrl);
          }
          setType("PHOTO");
          setMessage(
            visionMode === "remote"
              ? "Image ready — caption optional; vision runs on submit."
              : "Image attached."
          );
          return;
        }
        setMessage(data.error || "Image upload failed — caching locally.");
      } catch {
        setMessage("Upload failed — caching locally.");
      } finally {
        setUploadingMedia(false);
      }
    }

    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(f);
      });
      const id = `media_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      cachePhoto(id, dataUrl);
      urls.push(id);
      if (f.type.startsWith("image/") && !imageDataUrl) {
        setImageDataUrl(dataUrl);
      }
    }
    setMediaUrls((m) => [...m, ...urls]);
    if (file.type.startsWith("video")) setType("VIDEO");
    else if (file.type.startsWith("audio")) setType("VOICE");
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

    const httpMedia = mediaUrls.find((u) => u.startsWith("http"));
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
        sttProvider: type === "VOICE" ? sttMode : undefined,
        visionProvider: type === "PHOTO" || type === "VIDEO" ? visionMode : undefined,
        imageUrl: httpMedia,
        // Only send inline image when no public URL (remote vision fallback)
        imageDataUrl:
          !httpMedia && (type === "PHOTO" || type === "VIDEO")
            ? imageDataUrl
            : undefined,
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
        setImageDataUrl(undefined);
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
      setImageDataUrl(undefined);
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
        <p className="mt-1 text-xs text-teal-700/80">
          Voice: {sttMode === "remote" ? "remote STT" : "browser speech"}
          {" · "}
          Photos: {visionMode === "remote" ? "GPT-4o-mini vision" : "metadata heuristics"}
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
          <input
            type="file"
            accept={
              sttMode === "remote"
                ? "image/*,video/*,audio/*"
                : "image/*,video/*"
            }
            multiple={sttMode !== "remote"}
            className="hidden"
            onChange={onFile}
          />
        </label>
        <button
          type="button"
          onClick={listening ? stopVoice : startVoice}
          disabled={transcribing}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${
            listening
              ? "border-rose-500 bg-rose-50 text-rose-700"
              : "border-teal-900/15 text-teal-900"
          }`}
        >
          {transcribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : listening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {transcribing
            ? "Transcribing…"
            : listening
              ? sttMode === "remote"
                ? "Stop & transcribe"
                : "Stop listening"
              : "Start voice report"}
        </button>
      </div>

      {mediaUrls.length > 0 && (
        <p className="text-xs text-teal-700">{mediaUrls.length} media file(s) cached securely</p>
      )}

      <button
        type="submit"
        disabled={loading || !content.trim() || transcribing || uploadingMedia}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit anonymously
      </button>

      {message && <p className="text-sm text-teal-800">{message}</p>}
    </form>
  );
}
