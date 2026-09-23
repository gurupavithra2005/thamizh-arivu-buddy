import { useState } from "react";
import { Mic, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { detectLanguage } from "@/lib/language-detect";

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  pending,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  pending?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const language = detectLanguage(value);

  return (
    <div className="panel p-3">
      <div className="flex items-start gap-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={2}
          placeholder="தமிழ், English அல்லது Tanglish-ல் கேளுங்கள்… e.g. Chola temple kattidakalai pathi sollunga"
          className="font-tamil min-h-[64px] resize-none border-0 bg-transparent p-2 text-sm shadow-none focus-visible:ring-0"
          aria-label="Ask a question in Tamil, English or Tanglish"
        />
        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label="Voice input (coming soon)"
            onClick={() => toast.info("Voice input placeholder — Tamil speech capture arrives in a later phase.")}
          >
            <Mic className="size-4" aria-hidden />
          </Button>
          <Button size="icon" onClick={onSubmit} disabled={pending || !value.trim()} aria-label="Send question">
            <SendHorizonal className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Language</span>
          <Badge variant="secondary" className="text-[11px]">
            {language.label}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {focused ? "Enter to send · Shift+Enter for a new line" : "No fixed questions — ask anything naturally."}
        </p>
      </div>
    </div>
  );
}
