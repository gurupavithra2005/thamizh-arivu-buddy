import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2, LogIn, ScanText, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionHeading } from "@/components/common/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STORAGE_BUCKETS } from "@/lib/config";
import { extractUploadedDocument, saveCorrectedText } from "@/lib/ocr.functions";
import { ingestUserDocument } from "@/lib/ingestion.functions";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Tamil OCR & Document Upload — THAMIZHARIVU AI" },
      {
        name: "description",
        content:
          "Upload a Tamil image or PDF, extract the text with OCR, edit it, and index it so the assistant can cite it with real passages.",
      },
      { property: "og:title", content: "Tamil OCR & Document Upload — THAMIZHARIVU AI" },
      {
        property: "og:description",
        content: "Extract Tamil text from images and PDFs, then query it with citations.",
      },
    ],
  }),
  component: UploadPage,
});

type Status = "idle" | "uploading" | "processing" | "done" | "failed";

function UploadPage() {
  const { isSignedIn, loading: authLoading, user } = useAuth();
  const extract = useServerFn(extractUploadedDocument);
  const saveText = useServerFn(saveCorrectedText);
  const index = useServerFn(ingestUserDocument);

  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [ocrId, setOcrId] = useState<string | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [indexed, setIndexed] = useState<{ chunks: number; embedded: number } | null>(null);

  /** Real pipeline: private upload -> server-side Tamil OCR -> editable text. */
  async function handleFile(file: File | undefined) {
    if (!file || !user) return;
    setFileName(file.name);
    setText("");
    setOcrId(null);
    setIndexed(null);
    setMethod(null);
    setTitle(file.name.replace(/\.[^.]+$/, ""));
    setStatus("uploading");
    setProgress(15);

    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.ocrDocuments)
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (uploadError) throw new Error(uploadError.message);

      setStatus("processing");
      setProgress(55);

      const result = await extract({
        data: { filePath: path, fileType: file.type || "application/octet-stream" },
      });
      setOcrId(result.ocrDocumentId);
      setText(result.text);
      setMethod(result.method);
      setStatus("done");
      setProgress(100);
      toast.success("Text extracted", {
        description: `${result.pageCount} page${result.pageCount === 1 ? "" : "s"} read. Please review before indexing.`,
      });
    } catch (error) {
      setStatus("failed");
      setProgress(100);
      toast.error("Extraction failed", {
        description: error instanceof Error ? error.message : "Please try another file.",
      });
    }
  }

  /** Saves the correction, then chunks + embeds it so it becomes searchable. */
  async function handleIndex() {
    if (!text.trim() || indexing) return;
    setIndexing(true);
    try {
      if (ocrId) await saveText({ data: { ocrDocumentId: ocrId, correctedText: text } });
      const result = await index({
        data: { title: title.trim() || fileName || "Uploaded Tamil document", text },
      });
      setIndexed({ chunks: result.childChunks, embedded: result.embedded });
      toast.success("Indexed and searchable", {
        description: `${result.embedded} passage${result.embedded === 1 ? "" : "s"} embedded. The assistant can now cite this document.`,
      });
    } catch (error) {
      toast.error("Indexing failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIndexing(false);
    }
  }

  if (!authLoading && !isSignedIn) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Sign in to upload documents</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Uploads are stored privately in your own account, so OCR needs you signed in.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth">
            <LogIn className="mr-1 size-4" aria-hidden /> Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <SectionHeading
        eyebrow="Tamil OCR"
        title="Document / image upload"
        tamilTitle="ஆவண பதிவேற்றம்"
        description="Turn scanned Tamil pages, palm-leaf photographs and PDFs into searchable, citable text."
      />

      <label className="panel mt-8 flex cursor-pointer flex-col items-center gap-2 border-dashed p-10 text-center transition-colors hover:border-primary/40">
        <FileUp className="size-6 text-primary" aria-hidden />
        <span className="text-sm font-medium">Choose an image or PDF</span>
        <span className="text-xs text-muted-foreground">
          JPG, PNG or PDF — Tamil script supported
        </span>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          disabled={status === "uploading" || status === "processing"}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </label>

      {fileName && (
        <div className="panel mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{fileName}</p>
            <Badge
              variant={
                status === "done" ? "secondary" : status === "failed" ? "destructive" : "outline"
              }
              className="text-[11px]"
            >
              {status === "uploading" && "Uploading"}
              {status === "processing" && "Running Tamil OCR"}
              {status === "done" && "Extraction complete"}
              {status === "failed" && "Extraction failed"}
              {status === "idle" && "Ready"}
            </Badge>
          </div>
          <Progress value={progress} className="mt-3" />
          {(status === "uploading" || status === "processing") && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Reading the page…
            </p>
          )}
          {method && (
            <p className="mt-2 text-xs text-muted-foreground">
              Read with {method === "pdf-text-layer" ? "the PDF text layer" : "AI Tamil transcription"}
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <ScanText className="size-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold">Extracted Tamil text</h2>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
          aria-label="Document title"
          className="mt-3 max-w-md"
        />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="Extracted text appears here. Correct any OCR errors before indexing it."
          className="font-tamil mt-3"
          aria-label="Extracted Tamil text"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={!text.trim() || indexing} onClick={() => void handleIndex()}>
            {indexing ? (
              <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="mr-1 size-4" aria-hidden />
            )}
            Save correction & index for search
          </Button>
          <Button asChild variant="outline">
            <Link to="/assistant" search={{ q: "", c: "" }}>
              Open assistant
            </Link>
          </Button>
        </div>

        {indexed && (
          <div className="panel mt-4 p-5">
            <p className="text-sm font-medium">
              Indexed — {indexed.chunks} passage{indexed.chunks === 1 ? "" : "s"}, {indexed.embedded}{" "}
              embedded
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This document is recorded as needs-review credibility and is now retrievable in search
              and citable by the assistant.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/search" search={{ q: title.trim() || "" }}>
                <Search className="mr-1 size-4" aria-hidden /> Search this document
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
