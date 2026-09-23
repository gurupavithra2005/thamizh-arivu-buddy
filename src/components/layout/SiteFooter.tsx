import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-base font-semibold">THAMIZHARIVU AI</p>
          <p className="mt-2 text-sm text-muted-foreground">
            A source-grounded Tamil knowledge assistant for literature, culture and digital heritage.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Explore</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li><Link to="/assistant" className="hover:text-foreground">AI Knowledge Assistant</Link></li>
            <li><Link to="/explorer" className="hover:text-foreground">Cultural Heritage Explorer</Link></li>
            <li><Link to="/search" search={{ q: "" }} className="hover:text-foreground">Search Results</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Knowledge</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li><Link to="/sources" className="hover:text-foreground">Knowledge Sources</Link></li>
            <li><Link to="/upload" className="hover:text-foreground">Document / OCR Upload</Link></li>
            <li><Link to="/history" className="hover:text-foreground">Conversation History</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Project</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About / How it works</Link></li>
            <li>Aurex&apos;26 — Track 05</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        Answers are grounded in retrieved sources. Unverifiable information is clearly flagged.
      </div>
    </footer>
  );
}
