import { Link } from "react-router-dom";
import { Check, ChevronRight, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { useState } from "react";

export function OnboardingChecklist() {
  const { steps, loading, completedCount, totalCount, progress, nextStep, isComplete, dismissed, setDismissed } = useOnboarding();
  const [expanded, setExpanded] = useState(true);

  if (loading || dismissed || (isComplete && completedCount > 0)) return null;

  return (
    <div className="card-elevated p-5 mb-8 animate-fade-in relative overflow-hidden accent-line-top">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground text-sm">Guida introduttiva</h3>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono-data">
              {completedCount}/{totalCount} completati · {progress}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground/50 hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/30">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground/50 hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/30">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Progress value={progress} className="h-1 mb-4" />

      {expanded && (
        <div className="space-y-0.5">
          {steps.map((step) => (
            <OnboardingStepItem key={step.key} step={step} isNext={nextStep?.key === step.key} />
          ))}
        </div>
      )}

      {expanded && nextStep && (
        <Link
          to={nextStep.path}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary/8 text-primary text-xs font-semibold hover:bg-primary/12 transition-all duration-200"
        >
          Prossimo: {nextStep.title}
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function OnboardingStepItem({ step, isNext }: { step: OnboardingStep; isNext: boolean }) {
  const done = step.status === "completed";

  return (
    <Link
      to={step.path}
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group",
        done ? "opacity-40" : isNext ? "bg-primary/[0.04] border border-primary/10" : "hover:bg-muted/30"
      )}
    >
      <div className={cn(
        "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
        done ? "bg-success/10 text-success" : "border border-border/80 text-muted-foreground/40 group-hover:border-primary/30 group-hover:text-primary"
      )}>
        {done ? <Check className="h-3 w-3" /> : <span className="h-1 w-1 rounded-full bg-current" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-medium", done ? "line-through text-muted-foreground/60" : "text-foreground")}>
          {step.title}
        </p>
        <p className="text-[10px] text-muted-foreground/50 truncate">{step.description}</p>
      </div>
      {!done && <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />}
    </Link>
  );
}
