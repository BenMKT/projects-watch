import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/api-auth";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Upload evidence image for vision analysis / report mediaUrls.
 * - With BLOB_READ_WRITE_TOKEN → public Blob URL
 * - Without Blob → data URL (capped) so remote vision can still run in prisma demos
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth("report:submit");
  if (error) return error;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image exceeds 8MB limit" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathname = `evidence/${Date.now()}-${safeName}`;
    const blob = await put(pathname, file, {
      access: "public",
      token,
      contentType: file.type,
    });
    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      storage: "blob",
      fileSize: file.size,
      mimeType: file.type,
    });
  }

  // Fallback: inline data URL for vision (no Blob configured)
  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  if (dataUrl.length > 5_500_000) {
    return NextResponse.json(
      {
        error:
          "Image too large for inline vision without Blob. Configure BLOB_READ_WRITE_TOKEN.",
      },
      { status: 413 }
    );
  }

  return NextResponse.json({
    url: null,
    imageDataUrl: dataUrl,
    storage: "inline",
    fileSize: file.size,
    mimeType: file.type,
  });
}
