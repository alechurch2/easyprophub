import {
  Eye, Star, FileText, Target, Layers, Droplets, MapPin, CheckCircle2,
  TrendingUp, TrendingDown, XCircle, AlertTriangle, ShieldAlert, Gauge, Compass, Lightbulb
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function qualityScore(score: number) {
  if (score >= 8) return { label: "Eccellente", color: "text-success", bg: "bg-success/10 border-success/20", ring: "ring-success/30" };
  if (score >= 6) return { label: "Buono", color: "text-primary", bg: "bg-primary/10 border-primary/20", ring: "ring-primary/30" };
  if (score >= 4) return { label: "Discreto", color: "text-warning", bg: "bg-warning/10 border-warning/20", ring: "ring-warning/30" };
  return { label: "Debole", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", ring: "ring-destructive/30" };
}

function SectionBlock({ icon: Icon, label, children, iconColor = "text-primary", priority = "primary" }: {
  icon: any; label: string; children: React.ReactNode; iconColor?: string; priority?: "primary" | "secondary";
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3.5 sm:p-4 transition-all",
      priority === "primary" ? "border-border/50 bg-card" : "border-border/30 bg-card/60"
    )}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={cn(
          "flex items-center justify-center h-6 w-6 rounded-md flex-shrink-0",
          iconColor === "text-success" ? "bg-success/10" : iconColor === "text-destructive" ? "bg-destructive/10" : iconColor === "text-warning" ? "bg-warning/10" : "bg-primary/10"
        )}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[13px] sm:text-sm text-foreground/85 leading-relaxed">{children}</p>
    </div>
  );
}

export function AnalysisDisplay({ analysis }: { analysis: any }) {
  if (!analysis) return null;

  const score = typeof analysis.qualita_setup === "number" ? analysis.qualita_setup : parseInt(analysis.qualita_setup) || 0;
  const quality = qualityScore(score);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">

      {/* ═══════ HERO HEADER ═══════ */}
      <div className="relative rounded-2xl border border-primary/20 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="bg-gradient-to-br from-primary/[0.06] via-card to-card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10">
                <Gauge className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-base sm:text-lg">Analisi Pro</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 border-border/40">
                    <Eye className="h-2.5 w-2.5 mr-0.5" />
                    {analysis.leggibilita_immagine}
                  </Badge>
                </div>
              </div>
            </div>
            {/* Score */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn("flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 ring-2", quality.bg, quality.ring)}>
                <span className={cn("text-lg sm:text-xl font-bold font-mono-data", quality.color)}>{score}</span>
              </div>
              <span className={cn("text-[9px] sm:text-[10px] font-bold uppercase tracking-wide", quality.color)}>{quality.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ CORE ANALYSIS — 2-column grid ═══════ */}
      <div>
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold mb-3 px-0.5">Analisi strutturale</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SectionBlock icon={FileText} label="Contesto">{analysis.contesto}</SectionBlock>
          <SectionBlock icon={Compass} label="Bias / Direzione">{analysis.bias}</SectionBlock>
          <SectionBlock icon={Layers} label="Struttura">{analysis.struttura}</SectionBlock>
          <SectionBlock icon={Droplets} label="Liquidità">{analysis.liquidita}</SectionBlock>
        </div>
      </div>

      {/* ═══════ KEY LEVELS ═══════ */}
      <div>
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold mb-3 px-0.5">Zone e conferme</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SectionBlock icon={MapPin} label="Zona interessante" iconColor="text-primary">{analysis.zona_interessante}</SectionBlock>
          <SectionBlock icon={CheckCircle2} label="Conferma richiesta" iconColor="text-success">{analysis.conferma_richiesta}</SectionBlock>
        </div>
      </div>

      {/* ═══════ SCENARIOS ═══════ */}
      <div>
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold mb-3 px-0.5">Scenari</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-success/25 bg-success/[0.04] p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex items-center justify-center h-6 w-6 rounded-md bg-success/10">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-success uppercase tracking-wider">Bullish</span>
                <span className="text-[9px] text-success/50 ml-1.5">Prevalente</span>
              </div>
            </div>
            <p className="text-[13px] sm:text-sm text-foreground/85 leading-relaxed">{analysis.scenario_bullish}</p>
          </div>
          <div className="rounded-xl border border-destructive/25 bg-destructive/[0.04] p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex items-center justify-center h-6 w-6 rounded-md bg-destructive/10">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-destructive uppercase tracking-wider">Bearish</span>
                <span className="text-[9px] text-destructive/50 ml-1.5">Alternativo</span>
              </div>
            </div>
            <p className="text-[13px] sm:text-sm text-foreground/85 leading-relaxed">{analysis.scenario_bearish}</p>
          </div>
        </div>
      </div>

      {/* ═══════ INVALIDATION + WARNING ═══════ */}
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/15 bg-destructive/[0.03] px-3.5 sm:px-4 py-3">
          <div className="flex items-center justify-center h-5 w-5 rounded-md bg-destructive/10 mt-0.5 flex-shrink-0">
            <XCircle className="h-3 w-3 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-destructive/80 uppercase tracking-wider block mb-1">Invalidazione</span>
            <p className="text-[13px] sm:text-sm text-foreground/80 leading-relaxed">{analysis.invalidazione}</p>
          </div>
        </div>

        {analysis.warning && (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/15 bg-warning/[0.03] px-3.5 sm:px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-warning/80 uppercase tracking-wider block mb-1">Attenzione</span>
              <p className="text-[13px] sm:text-sm text-foreground/80 leading-relaxed">{analysis.warning}</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ CONCLUSION ═══════ */}
      <div className="relative rounded-xl border border-primary/20 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="bg-gradient-to-br from-primary/[0.04] via-card to-card p-4 sm:p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">Conclusione</span>
          </div>
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">{analysis.conclusione}</p>
        </div>
      </div>
    </div>
  );
}
