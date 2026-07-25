export type MediaActivityInput = {
  hasExif?: boolean;
  fileSize?: number;
  durationSeconds?: number;
  recentCapture?: boolean;
  constructionKeywords?: string[];
  /** Public https URL (Vercel Blob / CDN) preferred for remote vision */
  imageUrl?: string;
  /** data:image/...;base64,... — used when Blob is unavailable (size-capped) */
  imageDataUrl?: string;
};
