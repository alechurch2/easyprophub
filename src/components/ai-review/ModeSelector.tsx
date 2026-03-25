import { BarChart3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  mode: "pro" | "easy";
  onChange: (mode: "pro" | "easy") => void;
}

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <div className="flex gap-3 mb-6">
      <button
        onClick={() => onChange("pro")}
        className={cn(
          "flex-1 rounded-xl border-2 p-4 transition-all text-left",
          mode === "pro"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className={cn("h-5 w-5", mode === "pro" ? "text-primary" : "text-muted-foreground")} />
          <span className="font-heading font-semibold text-foreground">Pro Mode</span>
        </div>
        <p className="text-xs text-muted-foreground">Analisi completa e avanzata della chart con tutti i dettagli tecnici</p>
      </button>
      <button
        onClick={() => onChange("easy")}
        className={cn(
          "flex-1 rounded-xl border-2 p-4 transition-all text-left",
          mode === "easy"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap className={cn("h-5 w-5", mode === "easy" ? "text-primary" : "text-muted-foreground")} />
          <span className="font-heading font-semibold text-foreground">Easy Mode</span>
        </div>
        <p className="text-xs text-muted-foreground">Analisi semplificata con idee operative chiare e calcolo lottaggio</p>
      </button>
    </div>
  );
}
