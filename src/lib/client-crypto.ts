/** Browser-safe AES stub using Web Crypto for offline draft encryption markers.
 * Server-side uses Node crypto AES-256-GCM in lib/encryption.ts.
 * This client helper obfuscates localStorage payloads (base64 + XOR with session key).
 */
function getClientKey(): string {
  if (typeof window === "undefined") return "cdw-client";
  let key = sessionStorage.getItem("cdw_client_key");
  if (!key) {
    key = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    sessionStorage.setItem("cdw_client_key", key);
  }
  return key;
}

export function encryptOfflineDraft(data: unknown): string {
  const json = JSON.stringify(data);
  const key = getClientKey();
  const encoded = Array.from(json)
    .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join("");
  return btoa(unescape(encodeURIComponent(encoded)));
}

export function decryptOfflineDraft<T>(ciphertext: string): T {
  const key = getClientKey();
  const encoded = decodeURIComponent(escape(atob(ciphertext)));
  const json = Array.from(encoded)
    .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join("");
  return JSON.parse(json) as T;
}
