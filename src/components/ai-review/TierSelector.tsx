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
    <div className="flex gap-3 mb-4">
      <button
        onClick={() => onChange("standard")}
        className={cn(
          "flex-1 rounded-xl border-2 p-4 transition-all text-left",
          tier === "standard"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap className={cn("h-5 w-5", tier === "standard" ? "text-primary" : "text-muted-foreground")} />
          <span className="font-heading font-semibold text-foreground">Standard</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Analisi rapida e affidabile con AI bilanciata
        </p>
      </button>
      <button
        onClick={() => onChange("premium")}
        className={cn(
          "flex-1 rounded-xl border-2 p-4 transition-all text-left relative overflow-hidden",
          tier === "premium"
            ? "border-amber-500 bg-amber-500/5"
            : "border-border hover:border-amber-500/30"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <Crown className={cn("h-5 w-5", tier === "premium" ? "text-amber-500" : "text-muted-foreground")} />
          <span className="font-heading font-semibold text-foreground">Premium</span>
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
            PRO AI
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Analisi approfondita con modello AI avanzato, più dettaglio e ragionamento
        </p>
        {premiumRemaining !== undefined && (
          <p className={cn(
            "text-[10px] mt-1.5 font-medium",
            premiumRemaining === 0 ? "text-destructive" : "text-amber-600"
          )}>
            {premiumRemaining === 0
              ? "⚠ Quota esaurita per questo mese"
              : `${premiumRemaining}/${premiumQuota} review premium disponibili`}
          </p>
        )}
      </button>
    </div>
  );
}
