import { Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  tier: "standard" | "premium";
  onChange: (tier: "standard" | "premium") => void;
  premiumUsed?: number;
  premiumQuota?: number;
}

export function TierSelector({ tier, onChange, premiumUsed, premiumQuota }: Props) {
  const premiumRemaining = premiumQuota != null && premiumUsed != null
    ? Math.max(0, premiumQuota - premiumUsed)
    : undefined;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">1</span>
        <h3 className="font-heading text-sm font-semibold text-foreground">Scegli il tipo di review</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Standard */}
        <button
          onClick={() => onChange("standard")}
          className={cn(
            "relative rounded-xl border-2 p-5 transition-all duration-200 text-left group",
            tier === "standard"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
              : "border-border/60 hover:border-primary/30 hover:bg-muted/20"
          )}
        >
          {tier === "standard" && (
            <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
              tier === "standard" ? "bg-primary/15" : "bg-muted/50"
            )}>
              <Zap className={cn("h-4 w-4", tier === "standard" ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className="font-heading font-semibold text-foreground">Standard Review</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Analisi bilanciata e veloce. Ideale per controlli rapidi e conferme operative quotidiane.
          </p>
        </button>

        {/* Premium */}
        <button
          onClick={() => onChange("premium")}
          className={cn(
            "relative rounded-xl border-2 p-5 transition-all duration-200 text-left group",
            tier === "premium"
              ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/10"
              : "border-border/60 hover:border-amber-500/30 hover:bg-muted/20"
          )}
        >
          {tier === "premium" && (
            <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
              tier === "premium" ? "bg-amber-500/15" : "bg-muted/50"
            )}>
              <Crown className={cn("h-4 w-4", tier === "premium" ? "text-amber-500" : "text-muted-foreground")} />
            </div>
            <span className="font-heading font-semibold text-foreground">Premium Review</span>
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">PRO AI</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Analisi approfondita con modello AI avanzato. Più dettaglio, ragionamento multi-livello e scenari elaborati.
          </p>
          {premiumRemaining !== undefined && (
            <div className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium",
              premiumRemaining === 0
                ? "bg-destructive/10 text-destructive border border-destructive/15"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/15"
            )}>
              {premiumRemaining === 0
                ? "⚠ Quota esaurita questo mese"
                : `${premiumRemaining}/${premiumQuota} disponibili questo mese`}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
