import { createServerFn } from "@tanstack/react-start";

/**
 * Translates a batch of short UI / content strings between English and Tamil.
 * Returns the translations in the same order; falls back to the originals.
 */
export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const input = (data ?? {}) as { texts?: unknown; target?: unknown };
    const target = input.target === "ta" ? "ta" : "en";
    const texts = Array.isArray(input.texts)
      ? input.texts.filter((t): t is string => typeof t === "string").slice(0, 80).map((t) => t.slice(0, 2000))
      : [];
    return { texts, target } as { texts: string[]; target: "ta" | "en" };
  })
  .handler(async ({ data }): Promise<{ translations: string[] }> => {
    if (data.texts.length === 0) return { translations: [] };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { translations: data.texts };

    const targetName = data.target === "ta" ? "simple modern Tamil (Tamil script)" : "clear natural English";
    const prompt = `Translate each string in the JSON array into ${targetName}. Keep meaning, numbers, names, punctuation and brand names such as "THAMIZHARIVU AI" unchanged. Where a Tamil verse or classical passage is translated to English, give a faithful plain-English rendering. Return ONLY a JSON object {"t": [...]} with exactly ${data.texts.length} strings in the same order.\n\n${JSON.stringify(data.texts)}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.8-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        console.error("[translate]", res.status, (await res.text()).slice(0, 300));
        return { translations: data.texts };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(content.replace(/^```(json)?|```$/g, "").trim()) as { t?: unknown };
      const out = Array.isArray(parsed.t) ? parsed.t : [];
      return {
        translations: data.texts.map((orig, i) => (typeof out[i] === "string" && out[i] ? (out[i] as string) : orig)),
      };
    } catch (e) {
      console.error("[translate] failed", e);
      return { translations: data.texts };
    }
  });
