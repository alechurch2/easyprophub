import { Crown, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div>
      <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        <span className="inline-flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[10px] sm:text-[11px] font-bold font-mono border border-primary/10">01</span>
        <div>
          <h3 className="font-heading text-xs sm:text-sm font-semibold text-foreground">Scegli il tipo di review</h3>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground/40 mt-0.5">Seleziona il livello di profondità dell'analisi AI</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {/* Standard */}
        <button
          onClick={() => onChange("standard")}
          className={cn(
            "relative rounded-xl sm:rounded-2xl p-3.5 sm:p-6 transition-all duration-300 text-left group overflow-hidden",
            tier === "standard"
              ? "bg-gradient-to-br from-success/[0.08] to-success/[0.02] border-2 border-success/30 shadow-lg shadow-success/5"
              : "border border-border/40 hover:border-success/20 hover:bg-muted/10"
          )}
        >
          {tier === "standard" && (
            <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-success flex items-center justify-center shadow-lg shadow-success/30">
              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" strokeWidth={3} />
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300",
              tier === "standard" ? "bg-success/15 shadow-inner" : "bg-muted/30"
            )}>
              <Zap className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-colors", tier === "standard" ? "text-success" : "text-muted-foreground/50")} />
            </div>
            <div>
              <span className="font-heading font-bold text-foreground block text-[13px] sm:text-[15px]">Standard</span>
              <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">Review</span>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground/60 leading-relaxed hidden sm:block">
            Analisi bilanciata e veloce. Ideale per controlli rapidi e conferme operative quotidiane.
          </p>
          <div className="mt-2.5 sm:mt-4 flex flex-wrap gap-1 sm:gap-2">
            {["Veloce", "Precisa"].map(tag => (
              <span key={tag} className="text-[7px] sm:text-[9px] uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-md bg-muted/20 text-muted-foreground/40 font-medium">{tag}</span>
            ))}
          </div>
        </button>

        {/* Premium */}
        <button
          onClick={() => onChange("premium")}
          className={cn(
            "relative rounded-xl sm:rounded-2xl p-3.5 sm:p-6 transition-all duration-300 text-left group overflow-hidden",
            tier === "premium"
              ? "bg-gradient-to-br from-primary/[0.08] to-amber-500/[0.04] border-2 border-primary/30 shadow-lg shadow-primary/5"
              : "border border-border/40 hover:border-primary/20 hover:bg-muted/10"
          )}
        >
          {tier === "premium" ? (
            <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground" strokeWidth={3} />
            </div>
          ) : (
            <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4">
              <span className="text-[7px] sm:text-[9px] uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">PRO AI</span>
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300",
              tier === "premium" ? "bg-primary/15 shadow-inner" : "bg-muted/30"
            )}>
              <Crown className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-colors", tier === "premium" ? "text-primary" : "text-muted-foreground/50")} />
            </div>
            <div>
              <span className="font-heading font-bold text-foreground block text-[13px] sm:text-[15px]">Premium</span>
              <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">Review</span>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground/60 leading-relaxed hidden sm:block">
            Analisi approfondita con modello AI avanzato. Più dettaglio, ragionamento multi-livello e scenari elaborati.
          </p>
          <div className="mt-2.5 sm:mt-4 flex flex-wrap gap-1 sm:gap-2">
            {["Avanzata", "Dettagliata"].map(tag => (
              <span key={tag} className="text-[7px] sm:text-[9px] uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-md bg-primary/5 text-primary/50 font-medium">{tag}</span>
            ))}
          </div>
          {premiumRemaining !== undefined && (
            <div className={cn(
              "mt-2.5 sm:mt-4 inline-flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-mono font-semibold",
              premiumRemaining === 0
                ? "bg-destructive/10 text-destructive border border-destructive/15"
                : "bg-primary/8 text-primary border border-primary/15"
            )}>
              {premiumRemaining === 0
                ? "⚠ Quota esaurita"
                : `${premiumRemaining}/${premiumQuota} disp.`}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
