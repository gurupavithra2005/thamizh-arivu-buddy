import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — THAMIZHARIVU AI" },
      {
        name: "description",
        content:
          "Sign in to save your Tamil knowledge conversations, uploaded documents and OCR results securely.",
      },
      { property: "og:title", content: "Sign in — THAMIZHARIVU AI" },
      {
        property: "og:description",
        content: "Save conversations and uploaded Tamil documents to your account.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const { isSignedIn, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isSignedIn) navigate({ to: "/assistant" });
  }, [isSignedIn, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Check your inbox", {
          description: "Confirm your email address to finish creating the account.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/assistant" });
      }
    } catch (error) {
      toast.error(mode === "signup" ? "Could not sign up" : "Could not sign in", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error(String(result.error));
      if (result.redirected) return;
      navigate({ to: "/assistant" });
    } catch (error) {
      toast.error("Google sign-in failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <SectionHeading
        eyebrow="Your account"
        title={mode === "signin" ? "Sign in" : "Create an account"}
        tamilTitle="கணக்கில் நுழைக"
        description="Conversations, uploaded documents and OCR text are stored privately against your account."
      />

      <Button
        type="button"
        variant="outline"
        className="mt-8 w-full"
        onClick={handleGoogle}
        disabled={pending}
      >
        Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
          ) : (
            <LogIn className="mr-1 size-4" aria-hidden />
          )}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          className="text-primary underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create an account" : "Sign in instead"}
        </button>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        You can keep browsing{" "}
        <Link to="/explorer" className="text-primary underline-offset-4 hover:underline">
          heritage themes
        </Link>{" "}
        and{" "}
        <Link to="/sources" className="text-primary underline-offset-4 hover:underline">
          sources
        </Link>{" "}
        without an account.
      </p>
    </div>
  );
}
