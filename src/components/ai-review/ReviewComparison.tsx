import { Review } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELDS: { key: string; label: string }[] = [
  { key: "leggibilita_immagine", label: "Leggibilità immagine" },
  { key: "contesto", label: "Contesto" },
  { key: "bias", label: "Bias / Direzione" },
  { key: "struttura", label: "Struttura" },
  { key: "liquidita", label: "Liquidità" },
  { key: "zona_interessante", label: "Zona interessante" },
  { key: "conferma_richiesta", label: "Conferma richiesta" },
  { key: "invalidazione", label: "Invalidazione" },
  { key: "scenario_bullish", label: "Scenario Bullish" },
  { key: "scenario_bearish", label: "Scenario Bearish" },
  { key: "qualita_setup", label: "Qualità Setup" },
  { key: "warning", label: "Warning" },
  { key: "conclusione", label: "Conclusione" },
];

interface Props {
  reviewA: Review;
  reviewB: Review;
  onClose: () => void;
}

export function ReviewComparison({ reviewA, reviewB, onClose }: Props) {
  const renderCell = (review: Review, key: string) => {
    if (!review.analysis) return <span className="text-muted-foreground italic text-xs">Analisi non disponibile</span>;
    const val = review.analysis[key];
    if (val === undefined || val === null) return <span className="text-muted-foreground italic text-xs">N/D</span>;
    if (key === "qualita_setup") return <Badge variant="secondary">{val}/10</Badge>;
    return <span className="text-sm text-foreground">{val}</span>;
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onClose} className="text-sm text-primary hover:underline mb-4 flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Torna alle review
      </button>
      <h2 className="font-heading text-xl font-bold text-foreground mb-6">Confronto Review</h2>

      {/* Headers */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[reviewA, reviewB].map((r) => (
          <div key={r.id} className="card-premium p-4">
            <p className="text-sm font-semibold text-foreground">{r.asset} - {r.timeframe}</p>
            <p className="text-xs text-muted-foreground">{r.request_type} · {new Date(r.created_at).toLocaleDateString("it-IT")}</p>
            {r.screenshot_url && (
              <img src={r.screenshot_url} alt="Chart" className="mt-3 rounded-lg w-full max-h-40 object-contain bg-secondary/30" />
            )}
            {r.user_note && (
              <div className="mt-3 p-2 bg-secondary/50 rounded-md">
                <div className="flex items-center gap-1 mb-1">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] uppercase text-muted-foreground font-medium">Nota personale</span>
                </div>
                <p className="text-xs text-foreground">{r.user_note}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Field-by-field comparison */}
      <div className="space-y-1">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="grid grid-cols-[140px_1fr_1fr] gap-4 py-3 border-b border-border last:border-0">
            <div className="flex items-start">
              <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
            </div>
            <div>{renderCell(reviewA, key)}</div>
            <div>{renderCell(reviewB, key)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
