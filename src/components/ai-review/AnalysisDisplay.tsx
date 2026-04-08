import {
  Eye, Star, FileText, Target, Layers, Droplets, MapPin, CheckCircle2,
  TrendingUp, TrendingDown, XCircle, AlertTriangle, ShieldAlert, Gauge, Compass, Lightbulb
} from "lucide-react";
import { AnalysisField } from "./AnalysisField";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function qualityScore(score: number) {
  if (score >= 8) return { label: "Eccellente", color: "bg-success/10 text-success border-success/20" };
  if (score >= 6) return { label: "Buono", color: "bg-primary/10 text-primary border-primary/20" };
  if (score >= 4) return { label: "Discreto", color: "bg-warning/10 text-warning border-warning/20" };
  return { label: "Debole", color: "bg-destructive/10 text-destructive border-destructive/20" };
}

export function AnalysisDisplay({ analysis }: { analysis: any }) {
  if (!analysis) return null;

  const score = typeof analysis.qualita_setup === "number" ? analysis.qualita_setup : parseInt(analysis.qualita_setup) || 0;
  const quality = qualityScore(score);

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ═══════ HERO: Quality + Image Readability ═══════ */}
      <div className="relative rounded-2xl border-2 border-primary/30 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/8 via-primary/4 to-transparent px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10">
                <Gauge className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-lg sm:text-xl leading-tight">
                  Analisi Pro
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Valutazione approfondita del setup</p>
              </div>
            </div>
            {/* Score gauge */}
            <div className="flex flex-col items-center gap-1">
              <div className={cn("flex items-center justify-center h-11 w-11 sm:h-14 sm:w-14 rounded-full border-2", quality.color.replace("bg-", "border-").split(" ")[0].replace("/10", "/40"))}>
                <span className="text-lg sm:text-xl font-bold font-mono-data text-foreground">{score}</span>
              </div>
              <Badge className={cn("text-[9px] sm:text-[10px] px-2 py-0 border h-4", quality.color)}>
                {quality.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              <Eye className="h-2.5 w-2.5 mr-1" />
              {analysis.leggibilita_immagine}
            </Badge>
          </div>
        </div>
      </div>

      {/* ═══════ CONTEXT + BIAS — Primary analysis ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <AnalysisField icon={FileText} label="Contesto" value={analysis.contesto} variant="accent" />
        <AnalysisField icon={Compass} label="Bias / Direzione" value={analysis.bias} variant="accent" iconColor="text-primary" />
      </div>

      {/* ═══════ STRUCTURE + LIQUIDITY ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <AnalysisField icon={Layers} label="Struttura" value={analysis.struttura} variant="accent" />
        <AnalysisField icon={Droplets} label="Liquidità" value={analysis.liquidita} variant="accent" />
      </div>

      {/* ═══════ KEY ZONE + CONFIRMATION ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <AnalysisField icon={MapPin} label="Zona interessante" value={analysis.zona_interessante} variant="accent" iconColor="text-primary" />
        <AnalysisField icon={CheckCircle2} label="Conferma richiesta" value={analysis.conferma_richiesta} variant="accent" iconColor="text-success" />
      </div>

      {/* ═══════ SCENARIOS — Visual split ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 sm:p-4">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-success/15">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-success uppercase tracking-wider">Scenario Bullish</span>
              <span className="text-[9px] text-success/60 block">Prevalente</span>
            </div>
          </div>
          <p className="text-[13px] sm:text-sm text-foreground/90 leading-relaxed">{analysis.scenario_bullish}</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 sm:p-4">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-destructive/15">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-destructive uppercase tracking-wider">Scenario Bearish</span>
              <span className="text-[9px] text-destructive/60 block">Alternativo</span>
            </div>
          </div>
          <p className="text-[13px] sm:text-sm text-foreground/90 leading-relaxed">{analysis.scenario_bearish}</p>
        </div>
      </div>

      {/* ═══════ INVALIDATION ═══════ */}
      <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 sm:px-4 py-3 sm:py-3.5">
        <div className="flex items-center justify-center h-6 w-6 rounded-md bg-destructive/10 mt-0.5 flex-shrink-0">
          <XCircle className="h-3.5 w-3.5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] sm:text-xs font-bold text-destructive uppercase tracking-wider block mb-1">Invalidazione</span>
          <p className="text-[13px] sm:text-sm text-foreground/90 leading-relaxed">{analysis.invalidazione}</p>
        </div>
      </div>

      {/* ═══════ WARNING ═══════ */}
      {analysis.warning && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/5 px-3.5 sm:px-4 py-3 sm:py-3.5">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-warning uppercase tracking-wider block mb-1">Attenzione</span>
            <p className="text-[13px] sm:text-sm text-foreground/90 leading-relaxed">{analysis.warning}</p>
          </div>
        </div>
      )}

      {/* ═══════ CONCLUSION — Hero treatment ═══════ */}
      <div className="panel-inset rounded-xl p-4 sm:p-5 accent-line-top">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">Conclusione</span>
        </div>
        <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">{analysis.conclusione}</p>
      </div>
    </div>
  );
}
