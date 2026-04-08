import { BarChart3, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  mode: "pro" | "easy";
  onChange: (mode: "pro" | "easy") => void;
}

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        <span className="inline-flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[10px] sm:text-[11px] font-bold font-mono border border-primary/10">02</span>
        <div>
          <h3 className="font-heading text-xs sm:text-sm font-semibold text-foreground">Scegli la modalità di analisi</h3>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground/40 mt-0.5">Definisci il formato dell'output AI</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {/* Pro */}
        <button
          onClick={() => onChange("pro")}
          className={cn(
            "relative rounded-xl sm:rounded-2xl p-3.5 sm:p-6 transition-all duration-300 text-left group overflow-hidden",
            mode === "pro"
              ? "bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] border-2 border-primary/30 shadow-lg shadow-primary/5"
              : "border border-border/40 hover:border-primary/20 hover:bg-muted/10"
          )}
        >
          {mode === "pro" && (
            <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground" strokeWidth={3} />
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300",
              mode === "pro" ? "bg-primary/15 shadow-inner" : "bg-muted/30"
            )}>
              <BarChart3 className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-colors", mode === "pro" ? "text-primary" : "text-muted-foreground/50")} />
            </div>
            <div>
              <span className="font-heading font-bold text-foreground block text-[13px] sm:text-[15px]">Pro Mode</span>
              <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">Completa</span>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground/60 leading-relaxed hidden sm:block">
            Analisi tecnica completa con struttura di mercato, liquidità, scenari e valutazione qualità.
          </p>
          <div className="mt-2.5 sm:mt-4 flex flex-wrap gap-1 sm:gap-2">
            {["Struttura", "Liquidità"].map(tag => (
              <span key={tag} className="text-[7px] sm:text-[9px] uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-md bg-muted/20 text-muted-foreground/40 font-medium">{tag}</span>
            ))}
          </div>
        </button>

        {/* Easy */}
        <button
          onClick={() => onChange("easy")}
          className={cn(
            "relative rounded-xl sm:rounded-2xl p-3.5 sm:p-6 transition-all duration-300 text-left group overflow-hidden",
            mode === "easy"
              ? "bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] border-2 border-primary/30 shadow-lg shadow-primary/5"
              : "border border-border/40 hover:border-primary/20 hover:bg-muted/10"
          )}
        >
          {mode === "easy" && (
            <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground" strokeWidth={3} />
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300",
              mode === "easy" ? "bg-primary/15 shadow-inner" : "bg-muted/30"
            )}>
              <Zap className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-colors", mode === "easy" ? "text-primary" : "text-muted-foreground/50")} />
            </div>
            <div>
              <span className="font-heading font-bold text-foreground block text-[13px] sm:text-[15px]">Easy Mode</span>
              <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">Diretta</span>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground/60 leading-relaxed hidden sm:block">
            Idee operative dirette, livelli chiari e calcolo lottaggio automatico. Ideale per chi inizia.
          </p>
          <div className="mt-2.5 sm:mt-4 flex flex-wrap gap-1 sm:gap-2">
            {["Segnale", "Lottaggio"].map(tag => (
              <span key={tag} className="text-[7px] sm:text-[9px] uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-md bg-muted/20 text-muted-foreground/40 font-medium">{tag}</span>
            ))}
          </div>
        </button>
      </div>
    </div>
  );
}
