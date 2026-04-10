import { useState } from "react";
import { TrendingUp, TrendingDown, MinusCircle, ChevronDown, ChevronUp, Layers, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const biasConfig = {
  buy: { label: "BUY", icon: TrendingUp, gradient: "from-emerald-500 to-green-600", text: "text-emerald-400", dot: "bg-emerald-500" },
  sell: { label: "SELL", icon: TrendingDown, gradient: "from-red-500 to-rose-600", text: "text-red-400", dot: "bg-red-500" },
  no_trade: { label: "NO TRADE", icon: MinusCircle, gradient: "from-amber-500 to-yellow-600", text: "text-amber-400", dot: "bg-amber-500" },
};

interface Props {
  history: any[] | undefined;
  onSelect?: (analysis: any) => void;
  onClose?: () => void;
}

export default function DeltaZeroHistory({ history, onSelect, onClose }: Props) {
  const [showHistory, setShowHistory] = useState(false);

  if (!history?.length) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/50 p-6 text-center">
        <p className="text-xs text-muted-foreground/50">Nessuna analisi recente</p>
      </div>
    );
  }

  const handleToggle = () => {
    const newState = !showHistory;
    setShowHistory(newState);
    if (!newState && onClose) onClose();
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Analisi recenti</span>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">
            {history.length}
          </span>
        </div>
        {showHistory ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 divide-y divide-border/20">
              {history.map((h: any) => {
                const hbc = biasConfig[h.bias as keyof typeof biasConfig] || biasConfig.no_trade;
                return (
                  <button
                    key={h.id}
                    onClick={() => onSelect?.(h)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 w-full text-left transition-all",
                      onSelect && "hover:bg-muted/20 cursor-pointer group"
                    )}
                  >
                    {/* Bias dot */}
                    <div className={cn("h-2 w-2 rounded-full shrink-0", hbc.dot)} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold font-mono text-foreground">{h.asset}</span>
                        <span className="text-[10px] text-muted-foreground/50">{h.timeframe}</span>
                        <span className={cn("text-[10px] font-bold uppercase", hbc.text)}>{hbc.label}</span>
                        {h.uses_overlay && <Layers className="h-3 w-3 text-primary/40" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{h.reasoning}</p>
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={cn("h-1 w-2.5 rounded-full", i <= h.confidence ? `bg-gradient-to-r ${hbc.gradient}` : "bg-muted-foreground/8")} />
                      ))}
                    </div>

                    {/* Date */}
                    <span className="text-[9px] text-muted-foreground/40 shrink-0 font-mono">
                      {new Date(h.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                    </span>

                    {onSelect && (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
