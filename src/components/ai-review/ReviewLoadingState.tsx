import { useState, useEffect } from "react";
import { BarChart3, Eye, ShieldCheck, Target, Zap, Layers, Droplets, Compass, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const EASY_STEPS = [
  { icon: Eye, text: "Lettura del grafico…", sub: "Identificazione dei pattern visivi" },
  { icon: BarChart3, text: "Analisi della struttura…", sub: "Price action e livelli chiave" },
  { icon: Target, text: "Setup operativo…", sub: "Definizione entry, SL e TP" },
  { icon: ShieldCheck, text: "Calcolo del rischio…", sub: "Lotto e gestione del capitale" },
  { icon: Zap, text: "Costruzione del segnale…", sub: "Generazione dell'idea finale" },
];

const PRO_STEPS = [
  { icon: Eye, text: "Analisi struttura di mercato…", sub: "Valutazione del contesto macro" },
  { icon: Layers, text: "Valutazione multi-livello…", sub: "Struttura, liquidità e volumi" },
  { icon: Compass, text: "Identificazione bias…", sub: "Direzione prevalente del mercato" },
  { icon: Target, text: "Mappatura livelli chiave…", sub: "Zone di interesse e confluenze" },
  { icon: Lightbulb, text: "Elaborazione scenari…", sub: "Costruzione analisi completa" },
];

interface Props {
  mode: "easy" | "pro";
}

export function ReviewLoadingState({ mode }: Props) {
  const steps = mode === "easy" ? EASY_STEPS : PRO_STEPS;
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stepping, setStepping] = useState(false);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepping(true);
      setTimeout(() => {
        setCurrentStep((s) => (s < steps.length - 1 ? s + 1 : s));
        setStepping(false);
      }, 300);
    }, 4000);
    return () => clearInterval(stepInterval);
  }, [steps.length]);

  useEffect(() => {
    const target = Math.min(((currentStep + 1) / steps.length) * 88, 88);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= target) return p;
        return p + 0.4;
      });
    }, 60);
    return () => clearInterval(timer);
  }, [currentStep, steps.length]);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="card-elevated p-5 sm:p-8 mb-6 sm:mb-8 animate-fade-in overflow-hidden">

      {/* ── Header with animated icon ── */}
      <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
        <div className="relative mb-4 sm:mb-5">
          {/* Outer glow ring */}
          <div className="absolute inset-0 h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 animate-pulse -m-1 sm:-m-2" />
          <div className={cn(
            "relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center transition-all duration-300",
            stepping ? "scale-90 opacity-50" : "scale-100 opacity-100"
          )}>
            <CurrentIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          </div>
          {/* Ping dot */}
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary">
            <span className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
          </span>
        </div>

        <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
          {mode === "easy" ? "Analisi in corso" : "Analisi approfondita in corso"}
        </h3>
        <p className={cn(
          "text-sm sm:text-base text-foreground/80 mt-1.5 max-w-xs font-medium transition-all duration-300",
          stepping ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
        )}>
          {steps[currentStep].text}
        </p>
        <p className={cn(
          "text-[11px] sm:text-xs text-muted-foreground mt-1 max-w-xs transition-all duration-300 delay-75",
          stepping ? "opacity-0" : "opacity-100"
        )}>
          {steps[currentStep].sub}
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div className="max-w-xs sm:max-w-sm mx-auto mb-6 sm:mb-8">
        <Progress value={progress} className="h-1.5 bg-secondary/50" />
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] text-muted-foreground font-mono-data">{Math.round(progress)}%</span>
          <span className="text-[9px] text-muted-foreground">
            Step {currentStep + 1}/{steps.length}
          </span>
        </div>
      </div>

      {/* ── Step timeline ── */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-6 sm:mb-8">
        {steps.map((step, i) => {
          const StepIcon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center rounded-full transition-all duration-500",
                isActive
                  ? "h-8 w-8 sm:h-9 sm:w-9 bg-primary/15 border border-primary/30"
                  : isDone
                    ? "h-6 w-6 sm:h-7 sm:w-7 bg-primary/10"
                    : "h-5 w-5 sm:h-6 sm:w-6 bg-muted/40"
              )}
            >
              <StepIcon className={cn(
                "transition-all duration-300",
                isActive
                  ? "h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary"
                  : isDone
                    ? "h-3 w-3 text-primary/60"
                    : "h-2.5 w-2.5 text-muted-foreground/30"
              )} />
            </div>
          );
        })}
      </div>

      {/* ── Skeleton preview ── */}
      {mode === "easy" ? (
        <div className="space-y-3 sm:space-y-4">
          {/* Hero signal skeleton */}
          <div className="rounded-2xl border-2 border-border/40 bg-card/50 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Skeleton className="h-14 sm:h-16 rounded-xl" />
              <Skeleton className="h-14 sm:h-16 rounded-xl" />
              <Skeleton className="h-14 sm:h-16 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          </div>
          {/* Explanation skeleton */}
          <div className="rounded-xl border border-border/30 bg-card/30 p-3 sm:p-4 space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-4/5 rounded-md" />
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* Pro hero skeleton */}
          <div className="rounded-2xl border-2 border-border/40 bg-card/50 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-3 w-44 rounded-md" />
              </div>
              <Skeleton className="h-14 w-14 rounded-full" />
            </div>
          </div>
          {/* Analysis fields skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-border/30 bg-card/30 p-3 sm:p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-3/4 rounded-md" />
              </div>
            ))}
          </div>
          {/* Scenarios skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-success/20 bg-success/5 p-3 sm:p-4 space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-2/3 rounded-md" />
            </div>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 sm:p-4 space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-2/3 rounded-md" />
            </div>
          </div>
          {/* Conclusion skeleton */}
          <div className="rounded-xl border border-border/30 bg-card/30 p-3 sm:p-4 space-y-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-5/6 rounded-md" />
          </div>
        </div>
      )}
    </div>
  );
}
