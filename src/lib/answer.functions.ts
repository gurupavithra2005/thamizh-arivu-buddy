import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { llmConfig } from "@/lib/config";
import type { RetrievedChunk } from "@/lib/retrieval.functions";

export type AnswerCitation = {
  order: number;
  chunkId: number;
  sourceId: string;
  documentId: string;
  sourceTitle: string;
  sourceUrl: string | null;
  publisher: string | null;
  sourceType: string;
  credibility: string;
  language: string;
  snippet: string;
  pageNumber: number | null;
  score: number;
};

export type AssistantAnswer = {
  conversationId: string;
  messageId: string;
  answer: string;
  grounded: boolean;
  citations: AnswerCitation[];
  relatedQuestions: string[];
  latencyMs: number;
  model: string;
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";

const SYSTEM_PROMPT = `You are THAMIZHARIVU AI, a helpful Tamil-first assistant for literature, culture, digital heritage and general questions.

STRICT RULES:
- When SOURCE PASSAGES are present, use them as the primary evidence and cite inline with bracketed numbers matching the passages, e.g. [1], [2]. Do not invent details about those sources.
- When SOURCE PASSAGES are absent, still answer the user's question using your general knowledge. Clearly begin with "Not verified in the indexed Tamil sources:" (or the equivalent in Tamil), avoid pretending the answer came from this library, and never fabricate quotations or source citations.
- Reply in the language of the question: Tamil question -> simple modern Tamil; English -> English; Tanglish/transliteration -> the same mixed style. For Tamil answers, add a short English summary at the end.
- Be useful, concise and factual. For medical, legal or safety-critical questions, recommend a qualified professional.

After the answer, output a final line beginning with "FOLLOWUPS:" listing up to three short follow-up questions separated by " | ".`;

/** Builds the grounded prompt from retrieved passages only. */
function buildPrompt(question: string, chunks: RetrievedChunk[], history: string) {
  const passages = chunks
    .map(
      (c, i) =>
        `[${i + 1}] Source: ${c.sourceTitle}${c.publisher ? ` (${c.publisher})` : ""}${
          c.pageNumber ? `, page ${c.pageNumber}` : ""
        }\n${c.content}`,
    )
    .join("\n\n---\n\n");

  return `${history ? `CONVERSATION SO FAR:\n${history}\n\n` : ""}SOURCE PASSAGES:\n${
    passages || "(no passages retrieved)"
  }\n\nQUESTION: ${question}`;
}

/**
 * Calls the Lovable AI Gateway Responses API. Reasoning models can run for
 * minutes, so the request always streams and the deltas are accumulated here.
 */
async function generateAnswer(prompt: string, model: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const isOpenAi = model.startsWith("openai/");
  const response = await fetch(isOpenAi ? GATEWAY_URL : "https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(
      isOpenAi
        ? {
            model,
            instructions: SYSTEM_PROMPT,
            input: prompt,
            stream: true,
            store: false,
            reasoning: { effort: "low", summary: "auto" },
          }
        : {
            model,
            stream: true,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
          },
    ),
  });

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    if (response.status === 402) {
      throw new Error(
        "The AI workspace has run out of credits, so no answer could be generated. Please top up and try again.",
      );
    }
    if (response.status === 429) {
      throw new Error("The AI service is rate limited right now. Please try again in a moment.");
    }
    throw new Error(`AI gateway ${response.status}: ${body.slice(0, 400)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          choices?: Array<{ delta?: { content?: string } }>;
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        }
        const chunk = event.choices?.[0]?.delta?.content;
        if (typeof chunk === "string") text += chunk;
      } catch {
        // partial SSE frame; ignored
      }
    }
  }

  return text.trim();
}

function splitFollowups(raw: string): { answer: string; followups: string[] } {
  const match = raw.match(/FOLLOWUPS:\s*(.*)$/is);
  if (!match) return { answer: raw, followups: [] };
  const followups = match[1]!
    .split("|")
    .map((q) => q.replace(/^[-*\d.\s]+/, "").trim())
    .filter((q) => q.length > 2)
    .slice(0, 3);
  return { answer: raw.slice(0, match.index).trim(), followups };
}

/**
 * Full grounded pipeline for one turn:
 * understand -> retrieve (hybrid) -> rank -> RAG prompt -> LLM -> persist
 * conversation, message and citations pointing at the real stored chunks.
 */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const input = (data ?? {}) as { question?: unknown; conversationId?: unknown };
    if (typeof input.question !== "string" || input.question.trim().length === 0) {
      throw new Error("A question is required");
    }
    return {
      question: input.question.trim().slice(0, 2000),
      conversationId:
        typeof input.conversationId === "string" && input.conversationId.length > 0
          ? input.conversationId
          : null,
    };
  })
  .handler(async ({ data, context }): Promise<AssistantAnswer> => {
    const ctx = context as unknown as {
      supabase: {
        from: (t: string) => any;
      };
      userId: string;
    };
    const started = Date.now();
    const { retrieveChunks } = await import("@/lib/retrieval.functions");
    const { detectDominantLanguage } = await import("@/lib/rag/extract.server");

    // 1. Conversation (owned by the signed-in user through RLS)
    let conversationId = data.conversationId;
    if (conversationId) {
      const { data: existing, error } = await ctx.supabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!existing) conversationId = null;
    }
    if (!conversationId) {
      const { data: created, error } = await ctx.supabase
        .from("conversations")
        .insert({ user_id: ctx.userId, title: data.question.slice(0, 120) })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = created.id as string;
    }

    const language = detectDominantLanguage(data.question);

    // 2. Persist the user turn
    const { error: userMessageError } = await ctx.supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: data.question,
      language,
    });
    if (userMessageError) throw new Error(userMessageError.message);

    // 3. Conversation memory (last few turns)
    const { data: history } = await ctx.supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(7);
    const historyText = ((history ?? []) as Array<{ role: string; content: string }>)
      .slice(1)
      .reverse()
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 600)}`)
      .join("\n");

    // 4. Hybrid retrieval over the real indexed chunks
    const chunks = await retrieveChunks(data.question);

    const model = llmConfig().model;
    let raw: string;
    let grounded = chunks.length > 0;

    raw = await generateAnswer(buildPrompt(data.question, chunks, historyText), model);
    if (!raw) {
      raw = language === "ta" ? "மன்னிக்கவும், இப்போது பதிலை உருவாக்க முடியவில்லை." : "I could not generate an answer right now.";
      grounded = false;
    }

    const { answer, followups } = splitFollowups(raw);
    const latencyMs = Date.now() - started;

    const citations: AnswerCitation[] = chunks.slice(0, 6).map((c, i) => ({
      order: i + 1,
      chunkId: c.chunkId,
      sourceId: c.sourceId,
      documentId: c.documentId,
      sourceTitle: c.sourceTitle,
      sourceUrl: c.sourceUrl,
      publisher: c.publisher,
      sourceType: c.sourceType,
      credibility: c.credibility,
      language: c.language,
      snippet: c.content.slice(0, 600),
      pageNumber: c.pageNumber,
      score: c.score,
    }));

    // 5. Persist the assistant turn with retrieval metadata
    const { data: assistantMessage, error: assistantError } = await ctx.supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: answer,
        language,
        metadata: {
          model,
          latency_ms: latencyMs,
          answer_status: grounded ? "grounded" : "unverified",
          retrieved_chunk_ids: chunks.map((c) => c.chunkId),
          related_questions: followups,
        },
      })
      .select("id")
      .single();
    if (assistantError) throw new Error(assistantError.message);

    // 6. Citations always point at real stored chunks
    if (citations.length > 0) {
      const { error: citationError } = await ctx.supabase.from("citations").insert(
        citations.map((c) => ({
          message_id: assistantMessage.id,
          source_id: c.sourceId,
          document_id: c.documentId,
          chunk_id: c.chunkId,
          citation_order: c.order,
          source_title: c.sourceTitle,
          source_url: c.sourceUrl,
          snippet: c.snippet,
          page_number: c.pageNumber,
        })),
      );
      if (citationError) console.error("[assistant] citation insert failed", citationError);
    }

    return {
      conversationId,
      messageId: assistantMessage.id as string,
      answer,
      grounded,
      citations,
      relatedQuestions: followups,
      latencyMs,
      model,
    };
  });
