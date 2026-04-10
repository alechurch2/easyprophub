import { TrendingUp, TrendingDown, MinusCircle, AlertTriangle, RotateCcw, Layers, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const biasConfig = {
  buy: { label: "BUY", icon: TrendingUp, gradient: "from-emerald-500 to-green-600", bg: "bg-emerald-500/8", border: "border-emerald-500/25", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  sell: { label: "SELL", icon: TrendingDown, gradient: "from-red-500 to-rose-600", bg: "bg-red-500/8", border: "border-red-500/25", text: "text-red-400", ring: "ring-red-500/20" },
  no_trade: { label: "NO TRADE", icon: MinusCircle, gradient: "from-amber-500 to-yellow-600", bg: "bg-amber-500/8", border: "border-amber-500/25", text: "text-amber-400", ring: "ring-amber-500/20" },
};

interface Props {
  result: any;
  onNewAnalysis: () => void;
  showTradeAction?: boolean;
  onTradeSetup?: () => void;
}

export default function DeltaZeroResult({ result, onNewAnalysis, showTradeAction, onTradeSetup }: Props) {
  const bc = biasConfig[result.bias as keyof typeof biasConfig] || biasConfig.no_trade;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-1.5"
    >
      {/* Section label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Risultato</h2>
      </div>

      <div className={cn("rounded-2xl border bg-card overflow-hidden ring-1", bc.border, bc.ring)}>
        {/* Hero bias */}
        <div className={cn("px-6 py-8 flex flex-col items-center gap-4", bc.bg)}>
          <div className={cn("h-20 w-20 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-xl", bc.gradient)}>
            <bc.icon className="h-10 w-10 text-white" />
          </div>
          <div className="text-center">
            <div className={cn("text-3xl font-bold font-display tracking-tight", bc.text)}>
              {bc.label}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2.5 w-7 rounded-full transition-all",
                    i <= result.confidence ? `bg-gradient-to-r ${bc.gradient}` : "bg-muted-foreground/10"
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-2 font-mono">{result.confidence}/5</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Reasoning */}
          <div className="rounded-xl bg-muted/20 p-4">
            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1.5">Motivazione</p>
            <p className="text-sm text-foreground leading-relaxed">{result.reasoning}</p>
          </div>

          {/* Warning */}
          {result.warning && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">{result.warning}</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
            <span className="font-mono font-medium text-muted-foreground/60">{result.asset} · {result.timeframe}</span>
            {result.uses_overlay && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-primary/60">
                  <Layers className="h-3 w-3" /> Overlay
                </span>
              </>
            )}
            <span>·</span>
            <span>{new Date(result.created_at).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
          </div>

          {/* CTAs */}
          <div className="space-y-2 pt-1">
            {showTradeAction && onTradeSetup && (
              <button
                onClick={onTradeSetup}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]",
                  result.bias === "buy"
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-lg hover:shadow-emerald-500/20"
                    : "bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-lg hover:shadow-red-500/20"
                )}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Esegui su Broker + Hedge
              </button>
            )}

            <button
              onClick={onNewAnalysis}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border/40 bg-muted/20 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/60 transition-all active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              Nuova analisi
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
