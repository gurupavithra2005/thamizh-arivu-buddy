import { BadgeCheck, Bot, TriangleAlert, User } from "lucide-react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { MockBadge } from "@/components/common/MockBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function ChatMessageBubble({
  message,
  onAskRelated,
}: {
  message: ChatMessage;
  onAskRelated?: (question: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <Message from={message.role} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground",
        )}
        aria-hidden
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>

      <div className={cn("max-w-[85%] space-y-2", isUser && "text-right")}>
        <MessageContent
          className={cn(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-secondary text-secondary-foreground"
              : "border border-border bg-card text-card-foreground shadow-sm",
          )}
        >
          {isUser ? (
            <p className="font-tamil whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MessageResponse className="font-tamil whitespace-pre-wrap">{message.content}</MessageResponse>
          )}
        </MessageContent>

        <div className={cn("flex flex-wrap items-center gap-2", isUser && "justify-end")}>
          {message.detectedLanguage && (
            <Badge variant="outline" className="text-[11px]">
              {message.detectedLanguage.label}
            </Badge>
          )}
          {message.isMock && <MockBadge />}
          {!isUser && message.grounded && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-verified">
              <BadgeCheck className="size-3.5" aria-hidden /> Grounded in {message.sources?.length ?? 0} sources
            </span>
          )}
          {!isUser && message.unverified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-mock-foreground">
              <TriangleAlert className="size-3.5" aria-hidden /> Not verified in indexed sources
            </span>
          )}
        </div>

        {!isUser && message.relatedQuestions?.length ? (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Related questions
            </p>
            <div className="flex flex-wrap gap-2">
              {message.relatedQuestions.map((q) => (
                <Button
                  key={q}
                  size="sm"
                  variant="outline"
                  className="font-tamil h-auto whitespace-normal py-1.5 text-left text-xs"
                  onClick={() => onAskRelated?.(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Message>
  );
}
