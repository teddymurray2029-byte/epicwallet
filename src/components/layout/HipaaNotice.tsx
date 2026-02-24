import { ShieldCheck } from 'lucide-react';

export function HipaaNotice() {
  return (
    <div className="flex items-center justify-center gap-2 py-3.5 text-xs text-muted-foreground border-t border-border/30 bg-card/40 backdrop-blur-sm">
      <ShieldCheck className="h-3.5 w-3.5 text-care-teal/60" />
      <span>
        HIPAA-compliant infrastructure · Data encrypted at rest &amp; in transit ·{' '}
        <a
          href="/privacy"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Privacy Policy
        </a>
      </span>
    </div>
  );
}
