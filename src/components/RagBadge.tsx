import { RAG_COLORS, cn } from "@/lib/utils";

export function RagBadge({
  status,
  size = "md",
}: {
  status: keyof typeof RAG_COLORS | string;
  size?: "sm" | "md" | "lg";
}) {
  const rag = (RAG_COLORS as Record<string, (typeof RAG_COLORS)[keyof typeof RAG_COLORS]>)[status] ||
    RAG_COLORS.PENDING;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        rag.border,
        rag.text,
        "bg-white/80",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm"
      )}
    >
      <span className={cn("rounded-full", rag.bg, size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2")} />
      {rag.label}
    </span>
  );
}
