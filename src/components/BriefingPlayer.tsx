"use client";

import { ExternalLink } from "lucide-react";
import { resolveVideoPlayback } from "@/lib/utils";

export function BriefingPlayer({
  videoUrl,
  title,
}: {
  videoUrl: string;
  title: string;
}) {
  const playback = resolveVideoPlayback(videoUrl);

  if (playback.kind === "iframe") {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-teal-950">
        <iframe
          src={playback.src}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (playback.kind === "video") {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-teal-950">
        <video
          className="absolute inset-0 h-full w-full object-contain"
          controls
          preload="metadata"
          playsInline
        >
          <source src={playback.src} />
          <a href={playback.src} className="text-white underline">
            Download / open recording
          </a>
        </video>
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-teal-950 to-teal-900 px-6 text-center">
      <p className="font-[family-name:var(--font-display)] text-lg text-teal-50">
        {title}
      </p>
      <p className="max-w-md text-sm text-teal-100/70">
        This link is not an embeddable YouTube/Vimeo or direct video file. Open it
        in a new tab to watch the session.
      </p>
      <a
        href={playback.src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 hover:bg-white/15"
      >
        Open recording
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
