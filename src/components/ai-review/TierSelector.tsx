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
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
        <h3 className="font-heading text-sm font-semibold text-foreground">Scegli il tipo di review</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Standard */}
        <button
          onClick={() => onChange("standard")}
          className={cn(
            "relative rounded-xl border-2 p-5 transition-all text-left group",
            tier === "standard"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/30"
          )}
        >
          {tier === "standard" && (
            <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Zap className={cn("h-5 w-5", tier === "standard" ? "text-primary" : "text-muted-foreground")} />
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
            "relative rounded-xl border-2 p-5 transition-all text-left group",
            tier === "premium"
              ? "border-amber-500 bg-amber-500/5 shadow-sm shadow-amber-500/10"
              : "border-border hover:border-amber-500/30"
          )}
        >
          {tier === "premium" && (
            <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Crown className={cn("h-5 w-5", tier === "premium" ? "text-amber-500" : "text-muted-foreground")} />
            <span className="font-heading font-semibold text-foreground">Premium Review</span>
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">PRO AI</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Analisi approfondita con modello AI avanzato. Più dettaglio, ragionamento multi-livello e scenari elaborati.
          </p>
          {premiumRemaining !== undefined && (
            <div className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium",
              premiumRemaining === 0
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-600"
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
