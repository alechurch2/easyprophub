import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AnalysisFieldProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  borderColor?: string;
  variant?: "default" | "hero" | "accent";
}

export function AnalysisField({
  icon: Icon,
  label,
  value,
  iconColor = "text-primary",
  borderColor = "",
  variant = "default",
}: AnalysisFieldProps) {
  if (variant === "hero") {
    return (
      <div className={cn("panel-inset rounded-xl p-4 sm:p-5 accent-line-top", borderColor)}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className={cn("flex items-center justify-center h-7 w-7 rounded-lg", iconColor === "text-primary" ? "bg-primary/10" : iconColor === "text-success" ? "bg-success/10" : iconColor === "text-destructive" ? "bg-destructive/10" : iconColor === "text-warning" ? "bg-warning/10" : "bg-primary/10")}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-sm sm:text-base font-medium text-foreground/90 leading-relaxed">{value}</p>
      </div>
    );
  }

  if (variant === "accent") {
    return (
      <div className={cn("rounded-xl border border-border/50 bg-card p-3.5 sm:p-4 transition-all duration-200 hover:border-border", borderColor)}>
        <div className="flex items-start gap-2.5">
          <div className={cn("flex items-center justify-center h-6 w-6 rounded-md mt-0.5 flex-shrink-0", iconColor === "text-success" ? "bg-success/10" : iconColor === "text-destructive" ? "bg-destructive/10" : iconColor === "text-warning" ? "bg-warning/10" : "bg-primary/10")}>
            <Icon className={cn("h-3.5 w-3.5", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">{label}</span>
            <p className="text-[13px] sm:text-sm text-foreground/90 leading-relaxed">{value}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("panel-inset rounded-xl p-3.5 sm:p-4", borderColor)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", iconColor)} />
        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[13px] sm:text-sm font-medium text-foreground/90 leading-relaxed">{value}</p>
    </div>
  );
}
