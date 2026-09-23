import { createServerFn } from "@tanstack/react-start";
import { llmConfig } from "@/lib/config";

export type PassageCitation = { label: string; quote: string };
export type PassageExplanation = {
  explanation: string;
  citations: PassageCitation[];
  relatedQuestions: string[];
  model: string;
};

export const explainPassage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const input = (data ?? {}) as { passage?: unknown; question?: unknown };
    if (typeof input.passage !== "string" || input.passage.trim().length < 20) {
      throw new Error("Please provide a source passage of at least 20 characters");
    }
    if (typeof input.question !== "string" || input.question.trim().length < 3) {
      throw new Error("Please provide a question");
    }
    return { passage: input.passage.trim().slice(0, 12000), question: input.question.trim().slice(0, 1000) };
  })
  .handler(async ({ data }): Promise<PassageExplanation> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI Gateway is not configured");
    const model = llmConfig().model;
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              'You explain a researcher-provided Tamil or English passage in plain language. Return ONLY valid JSON: {"explanation":"...","citations":[{"label":"...","quote":"..."}],"relatedQuestions":["..."]}. Explain in the question language. Every quote must be copied exactly from the supplied passage; never invent citations. Use at most 3 short quotes and 3 related questions.',
          },
          { role: "user", content: `PASSAGE:\n${data.passage}\n\nQUESTION:\n${data.question}` },
        ],
        temperature: 0.2,
      }),
    });
    if (!response.ok) throw new Error(`AI Gateway ${response.status}`);
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    try {
      const parsed = JSON.parse(cleaned) as Partial<PassageExplanation>;
      return {
        explanation: typeof parsed.explanation === "string" ? parsed.explanation : "No explanation was returned.",
        citations: Array.isArray(parsed.citations)
          ? parsed.citations.filter((item): item is PassageCitation => Boolean(item && typeof item.label === "string" && typeof item.quote === "string")).slice(0, 3)
          : [],
        relatedQuestions: Array.isArray(parsed.relatedQuestions)
          ? parsed.relatedQuestions.filter((item): item is string => typeof item === "string").slice(0, 3)
          : [],
        model,
      };
    } catch {
      return { explanation: content, citations: [], relatedQuestions: [], model };
    }
  });