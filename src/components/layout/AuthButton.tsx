import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/** Header sign-in / sign-out control. Reflects the real session state. */
export function AuthButton({ onNavigate }: { onNavigate?: () => void }) {
  const { isSignedIn, loading, user, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="h-8 w-20 animate-pulse rounded-md bg-secondary" aria-hidden />;
  }

  if (!isSignedIn) {
    return (
      <Button asChild size="sm" variant="outline" onClick={onNavigate}>
        <Link to="/auth">
          <LogIn className="mr-1 size-4" aria-hidden /> Sign in
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:inline">
        {user?.email}
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          await signOut();
          onNavigate?.();
          toast.success("Signed out");
          navigate({ to: "/" });
        }}
      >
        <LogOut className="mr-1 size-4" aria-hidden /> Sign out
      </Button>
    </div>
  );
}
