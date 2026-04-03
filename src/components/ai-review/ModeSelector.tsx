import { BarChart3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  mode: "pro" | "easy";
  onChange: (mode: "pro" | "easy") => void;
}

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <div className="mb-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">2</span>
        <h3 className="font-heading text-sm font-semibold text-foreground">Scegli la modalità di analisi</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Pro */}
        <button
          onClick={() => onChange("pro")}
          className={cn(
            "relative rounded-xl border-2 p-5 transition-all duration-200 text-left group",
            mode === "pro"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
              : "border-border/60 hover:border-primary/30 hover:bg-muted/20"
          )}
        >
          {mode === "pro" && (
            <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
              mode === "pro" ? "bg-primary/15" : "bg-muted/50"
            )}>
              <BarChart3 className={cn("h-4 w-4", mode === "pro" ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className="font-heading font-semibold text-foreground">Pro Mode</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Analisi tecnica completa con struttura di mercato, liquidità, scenari e valutazione qualità. Per chi opera con metodo.
          </p>
        </button>

        {/* Easy */}
        <button
          onClick={() => onChange("easy")}
          className={cn(
            "relative rounded-xl border-2 p-5 transition-all duration-200 text-left group",
            mode === "easy"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
              : "border-border/60 hover:border-primary/30 hover:bg-muted/20"
          )}
        >
          {mode === "easy" && (
            <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
              mode === "easy" ? "bg-primary/15" : "bg-muted/50"
            )}>
              <Zap className={cn("h-4 w-4", mode === "easy" ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className="font-heading font-semibold text-foreground">Easy Mode</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Analisi semplificata con idee operative dirette, livelli chiari e calcolo lottaggio automatico. Ideale per chi inizia.
          </p>
        </button>
      </div>
    </div>
  );
}
