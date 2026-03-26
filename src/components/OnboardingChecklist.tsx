import { Link } from "react-router-dom";
import { Check, ChevronRight, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { useState } from "react";

export function OnboardingChecklist() {
  const { steps, loading, completedCount, totalCount, progress, nextStep, isComplete, dismissed, setDismissed } = useOnboarding();
  const [expanded, setExpanded] = useState(true);

  if (loading || dismissed || (isComplete && completedCount > 0)) return null;

  return (
    <div className="card-premium p-5 mb-6 animate-fade-in relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground text-sm">Guida introduttiva</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount}/{totalCount} completati
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{progress}%</Badge>
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-1.5 mb-4" />

      {/* Steps */}
      {expanded && (
        <div className="space-y-1">
          {steps.map((step) => (
            <OnboardingStepItem key={step.key} step={step} isNext={nextStep?.key === step.key} />
          ))}
        </div>
      )}

      {/* Next step CTA */}
      {expanded && nextStep && (
        <Link
          to={nextStep.path}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          Prossimo: {nextStep.title}
          <ChevronRight className="h-3.5 w-3.5" />
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
        "flex items-center gap-3 p-2.5 rounded-lg transition-colors group",
        done ? "opacity-60" : isNext ? "bg-primary/5 border border-primary/10" : "hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
        done ? "bg-success/20 text-success" : "border border-border text-muted-foreground group-hover:border-primary/40"
      )}>
        {done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", done ? "line-through text-muted-foreground" : "text-foreground")}>
          {step.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{step.description}</p>
      </div>
      {!done && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </Link>
  );
}
