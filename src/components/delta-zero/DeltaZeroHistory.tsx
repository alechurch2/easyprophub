import { useState } from "react";
import { TrendingUp, TrendingDown, MinusCircle, Clock, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const biasConfig = {
  buy: { label: "BUY", icon: TrendingUp, gradient: "from-emerald-500 to-green-600", text: "text-emerald-400" },
  sell: { label: "SELL", icon: TrendingDown, gradient: "from-red-500 to-rose-600", text: "text-red-400" },
  no_trade: { label: "NO TRADE", icon: MinusCircle, gradient: "from-amber-500 to-yellow-600", text: "text-amber-400" },
};

interface Props {
  history: any[] | undefined;
}

export default function DeltaZeroHistory({ history }: Props) {
  const [showHistory, setShowHistory] = useState(false);

  if (!history?.length) return null;

  return (
    <div>
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Clock className="h-4 w-4" />
        <span>Storico Delta-Zero ({history.length})</span>
        {showHistory ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
      </button>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 space-y-2"
          >
            {history.map((h: any) => {
              const hbc = biasConfig[h.bias as keyof typeof biasConfig] || biasConfig.no_trade;
              return (
                <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/50">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br", hbc.gradient)}>
                    <hbc.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold font-mono text-foreground">{h.asset}</span>
                      <span className="text-[10px] text-muted-foreground">{h.timeframe}</span>
                      <span className={cn("text-[10px] font-bold uppercase", hbc.text)}>{hbc.label}</span>
                      {h.uses_overlay && <Layers className="h-3 w-3 text-primary/50" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{h.reasoning}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={cn("h-1.5 w-3 rounded-full", i <= h.confidence ? `bg-gradient-to-r ${hbc.gradient}` : "bg-muted-foreground/10")} />
                    ))}
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 shrink-0">
                    {new Date(h.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
