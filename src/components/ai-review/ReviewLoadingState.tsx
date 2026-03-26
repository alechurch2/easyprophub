import { useState, useEffect } from "react";
import { BarChart3, Eye, ShieldCheck, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const EASY_STEPS = [
  { icon: Eye, text: "Sto leggendo il grafico…" },
  { icon: BarChart3, text: "Analisi della struttura di prezzo…" },
  { icon: Target, text: "Sto preparando il setup operativo…" },
  { icon: ShieldCheck, text: "Calcolo del rischio e del lotto…" },
  { icon: Zap, text: "Costruzione dell'idea finale…" },
];

const PRO_STEPS = [
  { icon: Eye, text: "Analisi struttura di mercato…" },
  { icon: BarChart3, text: "Valutazione liquidità e contesto…" },
  { icon: Target, text: "Identificazione livelli chiave…" },
  { icon: ShieldCheck, text: "Elaborazione scenario operativo…" },
  { icon: Zap, text: "Finalizzazione dell'analisi…" },
];

interface Props {
  mode: "easy" | "pro";
}

export function ReviewLoadingState({ mode }: Props) {
  const steps = mode === "easy" ? EASY_STEPS : PRO_STEPS;
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Advance steps every ~4s
    const stepInterval = setInterval(() => {
      setCurrentStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(stepInterval);
  }, [steps.length]);

  useEffect(() => {
    // Smooth progress that maps to steps but never hits 100%
    const target = Math.min(((currentStep + 1) / steps.length) * 88, 88);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= target) return p;
        return p + 0.5;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [currentStep, steps.length]);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="card-premium p-6 md:p-8 mb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CurrentIcon className="h-7 w-7 text-primary animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-ping" />
        </div>
        <h3 className="font-heading font-semibold text-lg text-foreground">
          Analisi in corso
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          {steps[currentStep].text}
        </p>
      </div>

      {/* Progress bar */}
      <div className="max-w-sm mx-auto mb-8">
        <Progress value={progress} className="h-1.5 bg-secondary" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-1.5 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 rounded-full transition-all duration-500",
              i <= currentStep
                ? "w-6 bg-primary"
                : "w-3 bg-muted-foreground/20"
            )}
          />
        ))}
      </div>

      {/* Skeleton preview */}
      {mode === "easy" ? (
        <div className="space-y-4">
          {/* Signal skeleton */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          </div>
          {/* Parameters skeleton */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pro analysis skeleton */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      )}
    </div>
  );
}
