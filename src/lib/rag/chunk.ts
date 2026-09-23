import { chunkingConfig } from "@/lib/config";
import { estimateTokens, normalizeTamilText } from "./normalize";

export type ChunkMetadata = {
  pageNumber?: number | null;
  chapter?: string | null;
  section?: string | null;
};

export type PreparedChunk = ChunkMetadata & {
  content: string;
  normalizedContent: string;
  tokenCount: number;
  chunkIndex: number;
  children: PreparedChunk[];
};

type Block = ChunkMetadata & { text: string };

/**
 * Splits a page/section of text into parent chunks (700-1200 tokens) each
 * holding child chunks (150-300 tokens). Paragraph and sentence boundaries are
 * respected so literary lines are never cut mid-verse.
 */
export function buildParentChildChunks(blocks: Block[]): PreparedChunk[] {
  const parents: PreparedChunk[] = [];
  let parentIndex = 0;
  let childIndex = 0;

  for (const block of blocks) {
    const paragraphs = splitParagraphs(block.text);
    let buffer: string[] = [];
    let bufferTokens = 0;

    const flushParent = () => {
      if (buffer.length === 0) return;
      const content = buffer.join("\n\n");
      const children = splitChildren(content, block, () => childIndex++);
      parents.push({
        content,
        normalizedContent: normalizeTamilText(content),
        tokenCount: estimateTokens(content),
        chunkIndex: parentIndex++,
        pageNumber: block.pageNumber ?? null,
        chapter: block.chapter ?? null,
        section: block.section ?? null,
        children,
      });
      buffer = [];
      bufferTokens = 0;
    };

    for (const paragraph of paragraphs) {
      const tokens = estimateTokens(paragraph);
      if (bufferTokens > 0 && bufferTokens + tokens > chunkingConfig.parentMaxTokens) {
        flushParent();
      }
      buffer.push(paragraph);
      bufferTokens += tokens;
      if (bufferTokens >= chunkingConfig.parentMinTokens) flushParent();
    }
    flushParent();
  }

  return parents;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  // Tamil e-texts mix danda-style line breaks with western punctuation.
  return text
    .split(/(?<=[.!?।॥\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitChildren(
  parentContent: string,
  block: ChunkMetadata,
  nextIndex: () => number,
): PreparedChunk[] {
  const sentences = splitSentences(parentContent);
  const children: PreparedChunk[] = [];
  let buffer: string[] = [];
  let tokens = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const content = buffer.join(" ");
    children.push({
      content,
      normalizedContent: normalizeTamilText(content),
      tokenCount: estimateTokens(content),
      chunkIndex: nextIndex(),
      pageNumber: block.pageNumber ?? null,
      chapter: block.chapter ?? null,
      section: block.section ?? null,
      children: [],
    });
    buffer = [];
    tokens = 0;
  };

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    if (tokens > 0 && tokens + sentenceTokens > chunkingConfig.childMaxTokens) flush();
    buffer.push(sentence);
    tokens += sentenceTokens;
    if (tokens >= chunkingConfig.childMinTokens) flush();
  }
  flush();

  return children;
}
