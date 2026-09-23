import { embeddingConfig } from "@/lib/config";

/**
 * Embedding provider abstraction. Two providers are supported and both return
 * vectors matching EMBEDDING_DIMENSION (768) so document_chunks.embedding stays
 * valid whichever one is configured:
 *
 *  - "lovable"      Lovable AI Gateway (default, no user key required)
 *  - "huggingface"  Hugging Face Inference API (multilingual E5 base, 768 dims)
 *
 * The SAME provider/model must embed indexed chunks and incoming queries.
 */

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const HF_URL = "https://router.huggingface.co/hf-inference/models";

const BATCH_SIZE = 32;
const MAX_ATTEMPTS = 4;

export type EmbeddingInputKind = "document" | "query";

function resolveProvider(): "lovable" | "huggingface" {
  const configured = embeddingConfig().provider.toLowerCase();
  const hasHfKey = !!process.env["HUGGINGFACE_API_KEY"];
  if (configured === "huggingface" || configured === "hf") {
    if (!hasHfKey) throw new Error("HUGGINGFACE_API_KEY is not configured");
    return "huggingface";
  }
  return "lovable";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries only transient failures (429 / 5xx), as required by the gateway contract. */
async function withRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof RetryableError;
      console.error(`[embeddings] ${label} attempt ${attempt} failed`, error);
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250);
    }
  }
  throw lastError;
}

class RetryableError extends Error {}

async function embedBatchLovable(texts: string[]): Promise<number[][]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: texts,
      dimensions: embeddingConfig().dimension,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429 || response.status >= 500) {
      throw new RetryableError(`Embedding gateway ${response.status}: ${body}`);
    }
    throw new Error(`Embedding gateway ${response.status}: ${body}`);
  }

  const json = (await response.json()) as { data: Array<{ index: number; embedding: number[] }> };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function embedBatchHuggingFace(texts: string[], kind: EmbeddingInputKind) {
  const apiKey = process.env["HUGGINGFACE_API_KEY"]!;
  const model = embeddingConfig().model;
  // E5-family models expect an explicit passage/query prefix.
  const prefix = /e5/i.test(model) ? (kind === "query" ? "query: " : "passage: ") : "";

  const response = await fetch(`${HF_URL}/${model}/pipeline/feature-extraction`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      inputs: texts.map((t) => `${prefix}${t}`),
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429 || response.status === 503 || response.status >= 500) {
      throw new RetryableError(`Hugging Face ${response.status}: ${body}`);
    }
    throw new Error(`Hugging Face ${response.status}: ${body}`);
  }

  const json = (await response.json()) as number[][] | number[][][];
  return json.map((vector) =>
    Array.isArray(vector[0]) ? meanPool(vector as number[][]) : (vector as number[]),
  );
}

function meanPool(tokens: number[][]): number[] {
  const dims = tokens[0]?.length ?? 0;
  const out = new Array<number>(dims).fill(0);
  for (const token of tokens) for (let i = 0; i < dims; i++) out[i]! += token[i]!;
  return out.map((v) => v / tokens.length);
}

/**
 * Embeds many texts with batching, retries and partial-failure reporting.
 * Returns vectors aligned to the input order; a failed batch yields nulls so the
 * caller can record a partial ingestion instead of losing the whole run.
 */
export async function embedTexts(
  texts: string[],
  kind: EmbeddingInputKind = "document",
): Promise<{ vectors: (number[] | null)[]; failures: number }> {
  const provider = resolveProvider();
  const expected = embeddingConfig().dimension;
  const vectors: (number[] | null)[] = new Array(texts.length).fill(null);
  let failures = 0;

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);
    try {
      const embedded = await withRetries(`batch ${start}`, () =>
        provider === "huggingface"
          ? embedBatchHuggingFace(batch, kind)
          : embedBatchLovable(batch),
      );
      embedded.forEach((vector, i) => {
        if (vector.length !== expected) {
          throw new Error(
            `Embedding dimension mismatch: got ${vector.length}, expected ${expected}`,
          );
        }
        vectors[start + i] = vector;
      });
    } catch (error) {
      failures += batch.length;
      console.error(`[embeddings] batch starting at ${start} permanently failed`, error);
    }
  }

  return { vectors, failures };
}

/** Embeds a single search query with the same model used for indexing. */
export async function embedQuery(query: string): Promise<number[]> {
  const { vectors } = await embedTexts([query], "query");
  const vector = vectors[0];
  if (!vector) throw new Error("Could not embed the search query");
  return vector;
}
