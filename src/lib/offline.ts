"use client";

const DRAFT_KEY = "cdw_offline_drafts";
const CACHE_KEY = "cdw_offline_media";

export interface OfflineDraft {
  id: string;
  type: "survey" | "report";
  payload: unknown;
  encryptedPayload: string;
  latitude?: number;
  longitude?: number;
  photoCache?: string[];
  createdAt: string;
  updatedAt: string;
  syncStatus: "pending" | "syncing" | "conflict" | "synced";
}

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function loadDrafts(): OfflineDraft[] {
  if (!canUseStorage()) return [];
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveDraft(draft: OfflineDraft) {
  if (!canUseStorage()) return;
  const drafts = loadDrafts().filter((d) => d.id !== draft.id);
  drafts.push(draft);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

export function removeDraft(id: string) {
  if (!canUseStorage()) return;
  const drafts = loadDrafts().filter((d) => d.id !== id);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

export function cachePhoto(id: string, dataUrl: string) {
  if (!canUseStorage()) return;
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    cache[id] = dataUrl;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // quota exceeded — skip
  }
}

export function getCachedPhoto(id: string): string | null {
  if (!canUseStorage()) return null;
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return cache[id] || null;
  } catch {
    return null;
  }
}

/** Resolve conflicts by last-write-wins with server timestamp check */
export function resolveConflict(
  local: OfflineDraft,
  serverUpdatedAt?: string
): "keep_local" | "keep_server" {
  if (!serverUpdatedAt) return "keep_local";
  return new Date(local.updatedAt) >= new Date(serverUpdatedAt) ? "keep_local" : "keep_server";
}

export async function syncPendingDrafts(
  syncFn: (draft: OfflineDraft) => Promise<{ ok: boolean; conflict?: boolean; serverUpdatedAt?: string }>
) {
  const drafts = loadDrafts().filter((d) => d.syncStatus === "pending" || d.syncStatus === "conflict");
  const results: Array<{ id: string; status: string }> = [];

  for (const draft of drafts) {
    draft.syncStatus = "syncing";
    saveDraft(draft);
    try {
      const res = await syncFn(draft);
      if (res.conflict) {
        const decision = resolveConflict(draft, res.serverUpdatedAt);
        if (decision === "keep_local") {
          const retry = await syncFn({ ...draft, syncStatus: "pending" });
          if (retry.ok) {
            removeDraft(draft.id);
            results.push({ id: draft.id, status: "synced_after_conflict" });
          } else {
            draft.syncStatus = "conflict";
            saveDraft(draft);
            results.push({ id: draft.id, status: "conflict" });
          }
        } else {
          removeDraft(draft.id);
          results.push({ id: draft.id, status: "server_won" });
        }
      } else if (res.ok) {
        removeDraft(draft.id);
        results.push({ id: draft.id, status: "synced" });
      } else {
        draft.syncStatus = "pending";
        saveDraft(draft);
        results.push({ id: draft.id, status: "failed" });
      }
    } catch {
      draft.syncStatus = "pending";
      saveDraft(draft);
      results.push({ id: draft.id, status: "failed" });
    }
  }
  return results;
}
