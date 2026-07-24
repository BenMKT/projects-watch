"use client";

import { useEffect, useState } from "react";
import { isOnline, loadDrafts, syncPendingDrafts } from "@/lib/offline";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const update = () => {
      setOnline(isOnline());
      setPending(loadDrafts().filter((d) => d.syncStatus !== "synced").length);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    const drafts = loadDrafts().filter((d) => d.syncStatus === "pending");
    if (drafts.length === 0) return;

    setSyncing(true);
    syncPendingDrafts(async (draft) => {
      const endpoint =
        draft.type === "survey" ? "/api/surveys/responses" : "/api/reports";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft.payload),
      });
      if (res.status === 409) {
        const data = await res.json();
        return { ok: false, conflict: true, serverUpdatedAt: data.serverUpdatedAt };
      }
      return { ok: res.ok };
    }).finally(() => {
      setSyncing(false);
      setPending(loadDrafts().filter((d) => d.syncStatus !== "synced").length);
    });
  }, [online]);

  if (online && pending === 0 && !syncing) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-sm ${
        online ? "bg-teal-700 text-white" : "bg-amber-600 text-white"
      }`}
      role="status"
    >
      {online ? (
        <>
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing offline drafts…" : `${pending} draft(s) pending sync`}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          Offline mode — drafts saved locally with encryption
          {pending > 0 ? ` (${pending} queued)` : ""}
        </>
      )}
    </div>
  );
}
