import {
  Eye, Star, FileText, Target, Layers, Droplets, MapPin, CheckCircle2,
  TrendingUp, TrendingDown, XCircle, AlertTriangle, ShieldAlert
} from "lucide-react";
import { AnalysisField } from "./AnalysisField";

export function AnalysisDisplay({ analysis }: { analysis: any }) {
  if (!analysis) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalysisField icon={Eye} label="Leggibilità immagine" value={analysis.leggibilita_immagine} />
        <AnalysisField icon={Star} label="Qualità Setup" value={`${analysis.qualita_setup}/10`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalysisField icon={FileText} label="Contesto" value={analysis.contesto} />
        <AnalysisField icon={Target} label="Bias / Direzione" value={analysis.bias} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalysisField icon={Layers} label="Struttura" value={analysis.struttura} />
        <AnalysisField icon={Droplets} label="Liquidità" value={analysis.liquidita} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalysisField icon={MapPin} label="Zona interessante" value={analysis.zona_interessante} />
        <AnalysisField icon={CheckCircle2} label="Conferma richiesta" value={analysis.conferma_richiesta} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalysisField icon={TrendingUp} label="Scenario Bullish" value={analysis.scenario_bullish} iconColor="text-success" />
        <AnalysisField icon={TrendingDown} label="Scenario Bearish" value={analysis.scenario_bearish} iconColor="text-destructive" />
      </div>
      <AnalysisField icon={XCircle} label="Invalidazione" value={analysis.invalidazione} iconColor="text-destructive" borderColor="border-destructive/20" />
      {analysis.warning && (
        <AnalysisField icon={AlertTriangle} label="Warning" value={analysis.warning} iconColor="text-warning" borderColor="border-warning/20" />
      )}
      <AnalysisField icon={ShieldAlert} label="Conclusione" value={analysis.conclusione} iconColor="text-primary" borderColor="border-primary/20" />
    </div>
  );
}
