import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileArchive, FileText, Loader2, LogIn, Search, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STORAGE_BUCKETS } from "@/lib/config";
import { extractUploadedDocument } from "@/lib/ocr.functions";
import { ingestUserDocument } from "@/lib/ingestion.functions";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [
    { title: "Tamil Source Library — THAMIZHARIVU AI" },
    { name: "description", content: "Upload Tamil books and documents, review extracted text, and add them to the searchable source library." },
    { property: "og:title", content: "Tamil Source Library — THAMIZHARIVU AI" },
    { property: "og:description", content: "Upload and index your own Tamil research documents." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: LibraryPage,
});

type Stage = "idle" | "uploading" | "reading" | "ready" | "indexing" | "done" | "failed";

function LibraryPage() {
  const { isSignedIn, loading, user } = useAuth();
  const extract = useServerFn(extractUploadedDocument);
  const index = useServerFn(ingestUserDocument);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || !user) return;
    setTitle(file.name.replace(/\.[^.]+$/, "")); setText(""); setSourceId(null); setStage("uploading"); setProgress(15);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKETS.ocrDocuments).upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw new Error(error.message);
      setStage("reading"); setProgress(45);
      const extracted = file.type.startsWith("text/") ? { text: await file.text(), ocrDocumentId: null } : await extract({ data: { filePath: path, fileType: file.type || "application/octet-stream" } });
      setText(extracted.text); setStage("ready"); setProgress(70); toast.success("Document ready for review");
    } catch (error) { setStage("failed"); toast.error("Document could not be read", { description: error instanceof Error ? error.message : "Please try another file." }); }
  }

  async function addToLibrary() {
    if (!text.trim() || !title.trim()) return;
    setStage("indexing"); setProgress(85);
    try { const result = await index({ data: { title, text } }); setSourceId(result.sourceId); setStage("done"); setProgress(100); toast.success("Added to your source library", { description: `${result.embedded} searchable passages created.` }); }
    catch (error) { setStage("failed"); toast.error("Indexing failed", { description: error instanceof Error ? error.message : "Please try again." }); }
  }

  if (!loading && !isSignedIn) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-semibold">Sign in to build your source library</h1><p className="mt-2 text-sm text-muted-foreground">Your uploaded books and documents are private to your account until you choose to share them.</p><Button asChild className="mt-6"><Link to="/auth"><LogIn className="mr-1 size-4" aria-hidden /> Sign in</Link></Button></div>;

  return <div className="mx-auto max-w-5xl px-4 py-12">
    <SectionHeading eyebrow="Your research library" title="Add a Tamil source" tamilTitle="தமிழ் மூல நூலகம்" description="Upload a TXT, PDF or scanned image, review the extracted text, and add it to searchable knowledge_sources with real embeddings." />
    <label className="panel mt-8 flex cursor-pointer flex-col items-center gap-2 border-dashed p-10 text-center hover:border-primary/40"><UploadCloud className="size-7 text-primary" aria-hidden /><span className="font-medium">Choose a Tamil book or document</span><span className="text-xs text-muted-foreground">TXT, PDF, JPG or PNG</span><input type="file" accept="text/plain,application/pdf,image/*" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0])} /></label>
    {stage !== "idle" && <div className="panel mt-4 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-sm font-medium">{stage === "reading" ? <FileArchive className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />} {stage === "done" ? "Indexed in knowledge_sources" : stage}</span><Badge variant={stage === "failed" ? "destructive" : stage === "done" ? "secondary" : "outline"}>{progress}%</Badge></div><Progress value={progress} className="mt-3" /></div>}
    <div className="mt-8 grid gap-4"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Source title" aria-label="Source title" /><textarea value={text} onChange={(event) => setText(event.target.value)} className="font-tamil min-h-72 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Extracted text appears here for correction before indexing." aria-label="Extracted source text" /><div className="flex flex-wrap gap-2"><Button onClick={() => void addToLibrary()} disabled={stage !== "ready" || text.trim().length < 40 || !title.trim()}>{stage === "indexing" ? <Loader2 className="mr-1 size-4 animate-spin" aria-hidden /> : <UploadCloud className="mr-1 size-4" aria-hidden />} Add to knowledge sources</Button>{sourceId && <Button asChild variant="outline"><Link to="/search" search={{ q: title }}><Search className="mr-1 size-4" aria-hidden /> Search this source</Link></Button>}</div></div>
  </div>;
}