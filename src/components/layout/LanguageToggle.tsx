import { Languages, Loader2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** EN / தமிழ் switch — translates every page into the chosen language. */
export function LanguageToggle() {
  const { lang, setLang, busy } = useLang();
  return (
    <div
      data-no-translate
      className="inline-flex items-center rounded-md border border-border bg-background p-0.5 text-xs"
      role="group"
      aria-label="Language"
    >
      {busy ? (
        <Loader2 className="mx-1 size-3.5 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        <Languages className="mx-1 size-3.5 text-muted-foreground" aria-hidden />
      )}
      {(["en", "ta"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "rounded px-2 py-1 font-medium transition-colors",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            l === "ta" && "font-tamil",
          )}
        >
          {l === "en" ? "EN" : "தமிழ்"}
        </button>
      ))}
    </div>
  );
}
