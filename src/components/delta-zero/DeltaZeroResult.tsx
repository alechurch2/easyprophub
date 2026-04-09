import { TrendingUp, TrendingDown, MinusCircle, AlertTriangle, RotateCcw, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const biasConfig = {
  buy: { label: "BUY", icon: TrendingUp, gradient: "from-emerald-500 to-green-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  sell: { label: "SELL", icon: TrendingDown, gradient: "from-red-500 to-rose-600", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
  no_trade: { label: "NO TRADE", icon: MinusCircle, gradient: "from-amber-500 to-yellow-600", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
};

interface Props {
  result: any;
  onNewAnalysis: () => void;
}

export default function DeltaZeroResult({ result, onNewAnalysis }: Props) {
  const bc = biasConfig[result.bias as keyof typeof biasConfig] || biasConfig.no_trade;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className={cn("rounded-2xl border bg-card overflow-hidden", bc.border)}
    >
      {/* Bias hero */}
      <div className={cn("p-6 flex flex-col items-center gap-3 bg-gradient-to-b", bc.bg)}>
        <div className={cn("h-16 w-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", bc.gradient)}>
          <bc.icon className="h-8 w-8 text-white" />
        </div>
        <div className={cn("text-2xl font-bold font-display tracking-tight", bc.text)}>
          {bc.label}
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-6 rounded-full transition-all",
                i <= result.confidence ? `bg-gradient-to-r ${bc.gradient}` : "bg-muted-foreground/15"
              )}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-2 font-mono">{result.confidence}/5</span>
        </div>
      </div>

      {/* Reasoning + meta */}
      <div className="p-5 space-y-3">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">Motivazione</p>
          <p className="text-sm text-foreground leading-relaxed">{result.reasoning}</p>
        </div>

        {result.warning && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400">{result.warning}</p>
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 pt-1">
          <span className="font-mono">{result.asset} · {result.timeframe}</span>
          {result.uses_overlay && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-primary/70">
                <Layers className="h-3 w-3" /> Overlay
              </span>
            </>
          )}
          <span>·</span>
          <span>{new Date(result.created_at).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
        </div>

        {/* CTA: New analysis */}
        <button
          onClick={onNewAnalysis}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 bg-muted/30 text-sm font-medium text-foreground hover:bg-muted/60 hover:border-border transition-all active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" />
          Nuova analisi
        </button>
      </div>
    </motion.div>
  );
}
