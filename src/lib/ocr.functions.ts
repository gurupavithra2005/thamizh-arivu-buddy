import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STORAGE_BUCKETS } from "@/lib/config";

export type OcrResult = {
  ocrDocumentId: string;
  text: string;
  pageCount: number;
  method: "pdf-text-layer" | "vision-ocr";
};

const VISION_MODEL = "google/gemini-3.8-flash";

/** Reads a Tamil page image with the Lovable AI vision model. */
async function visionOcr(bytes: Uint8Array, mimeType: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const dataUrl = `data:${mimeType};base64,${btoa(binary)}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You transcribe scanned Tamil pages. Output ONLY the text visible in the image, preserving line and paragraph breaks and Tamil spelling exactly. Never translate, summarise or add commentary. If the page is unreadable, output exactly: UNREADABLE",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this page." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 402) throw new Error("The AI workspace has run out of credits, so OCR could not run.");
    if (response.status === 429) throw new Error("OCR is rate limited right now. Please retry shortly.");
    throw new Error(`OCR gateway ${response.status}: ${body.slice(0, 300)}`);
  }

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text || text === "UNREADABLE") {
    throw new Error("No readable text could be extracted from this page.");
  }
  return text;
}

/**
 * Extracts text from a file the signed-in user already uploaded to the private
 * ocr-documents bucket, and records the run in public.ocr_documents.
 * PDFs with a text layer are read directly; images go through vision OCR.
 */
export const extractUploadedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const input = (data ?? {}) as { filePath?: unknown; fileType?: unknown };
    if (typeof input.filePath !== "string" || input.filePath.length === 0) {
      throw new Error("filePath is required");
    }
    return {
      filePath: input.filePath,
      fileType: typeof input.fileType === "string" ? input.fileType : "application/octet-stream",
    };
  })
  .handler(async ({ data, context }): Promise<OcrResult> => {
    const ctx = context as unknown as { userId: string };

    // The path is always namespaced by the owner's id; reject anything else.
    if (!data.filePath.startsWith(`${ctx.userId}/`)) {
      throw new Error("You can only process your own uploads");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizeTamilText } = await import("@/lib/rag/normalize");

    const { data: record, error: recordError } = await supabaseAdmin
      .from("ocr_documents")
      .insert({
        user_id: ctx.userId,
        original_file_path: data.filePath,
        file_type: data.fileType,
        processing_status: "processing",
      })
      .select("id")
      .single();
    if (recordError) throw new Error(recordError.message);

    try {
      const { data: blob, error: downloadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.ocrDocuments)
        .download(data.filePath);
      if (downloadError || !blob) throw new Error(downloadError?.message ?? "Upload could not be read");

      const bytes = new Uint8Array(await blob.arrayBuffer());
      let text: string;
      let pageCount = 1;
      let method: OcrResult["method"];

      if (data.fileType.includes("pdf")) {
        const { extractFromPdf } = await import("@/lib/rag/extract.server");
        const pages = await extractFromPdf(bytes);
        if (pages.length === 0) {
          throw new Error(
            "This PDF has no text layer. Please upload page images instead so OCR can read them.",
          );
        }
        pageCount = pages.length;
        text = pages.map((p) => p.text).join("\n\n");
        method = "pdf-text-layer";
      } else {
        text = normalizeTamilText(await visionOcr(bytes, data.fileType));
        method = "vision-ocr";
      }

      await supabaseAdmin
        .from("ocr_documents")
        .update({
          extracted_text: text,
          page_count: pageCount,
          processing_status: "completed",
          metadata: { method },
        })
        .eq("id", record.id);

      return { ocrDocumentId: record.id, text, pageCount, method };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed";
      await supabaseAdmin
        .from("ocr_documents")
        .update({ processing_status: "failed", metadata: { error: message } })
        .eq("id", record.id);
      throw new Error(message);
    }
  });

/** Saves the user's corrected transcription back onto their OCR record. */
export const saveCorrectedText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const input = (data ?? {}) as { ocrDocumentId?: unknown; correctedText?: unknown };
    if (typeof input.ocrDocumentId !== "string") throw new Error("ocrDocumentId is required");
    if (typeof input.correctedText !== "string") throw new Error("correctedText is required");
    return { ocrDocumentId: input.ocrDocumentId, correctedText: input.correctedText };
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as { supabase: { from: (t: string) => any } };
    const { error } = await ctx.supabase
      .from("ocr_documents")
      .update({ corrected_text: data.correctedText })
      .eq("id", data.ocrDocumentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
