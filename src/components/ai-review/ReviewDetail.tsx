import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Review } from "./types";
import { AnalysisDisplay } from "./AnalysisDisplay";
import { EasyAnalysisDisplay } from "./EasyAnalysisDisplay";
import { ReviewRatingWidget } from "./ReviewRatingWidget";
import { ReviewForm } from "./ReviewForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, MessageSquare, Link2, Zap, BarChart3, Crown, Clock, Image, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  review: Review;
  onBack: () => void;
  onRefresh: () => void;
  onSelectReview: (r: Review) => void;
}

export function ReviewDetail({ review, onBack, onRefresh, onSelectReview }: Props) {
  const [showReexamine, setShowReexamine] = useState(false);
  const [linkedReviews, setLinkedReviews] = useState<Review[]>([]);
  const isEasy = review.review_mode === "easy";

  useEffect(() => { loadLinked(); }, [review.id]);

  const loadLinked = async () => {
    const { data: children } = await supabase
      .from("ai_chart_reviews").select("*")
      .eq("parent_review_id", review.id)
      .order("created_at", { ascending: true });
    const results: Review[] = [];
    if (review.parent_review_id) {
      const { data: parent } = await supabase
        .from("ai_chart_reviews").select("*")
        .eq("id", review.parent_review_id).single();
      if (parent) results.push(parent as any);
    }
    if (children) results.push(...(children as any[]));
    setLinkedReviews(results);
  };

  return (
    <div className="animate-fade-in">
      {/* ─── BACK ─── */}
      <button onClick={onBack} className="text-sm text-primary hover:underline mb-6 flex items-center gap-1.5 group">
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" /> Torna alle review
      </button>

      {/* ─── HERO HEADER ─── */}
      <div className="card-elevated p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-primary/[0.03] rounded-full blur-[80px] -translate-y-1/2" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">{review.asset}</h1>
              <span className="text-muted-foreground/40 font-light">·</span>
              <span className="text-lg text-muted-foreground font-medium">{review.timeframe}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {review.review_tier === "premium" && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs"><Crown className="h-3 w-3 mr-0.5" />Premium</Badge>
              )}
              {(review as any).uses_ai_overlay && (
                <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 text-xs"><Layers className="h-3 w-3 mr-0.5" />AI Overlay</Badge>
              )}
              {isEasy ? (
                <Badge variant="outline" className="border-primary/30 text-primary text-xs"><Zap className="h-3 w-3 mr-0.5" />Easy</Badge>
              ) : (
                <Badge variant="outline" className="text-xs"><BarChart3 className="h-3 w-3 mr-0.5" />Pro</Badge>
              )}
              <Badge className={cn(
                "text-xs",
                review.status === "completed" ? "bg-success/10 text-success border-success/20" :
                review.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/20" :
                "bg-warning/10 text-warning border-warning/20"
              )}>
                {review.status === "completed" ? "Completata" : review.status === "failed" ? "Fallita" : "In attesa"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(review.created_at).toLocaleString("it-IT")}</span>
              <span>{review.request_type}</span>
              {review.account_size ? <span className="font-mono-data">Conto: ${(review.account_size).toLocaleString()}</span> : null}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SCREENSHOT ─── */}
      {review.screenshot_url && (
        <div className="card-premium p-2 mb-6 group relative">
          <img src={review.screenshot_url} alt="Chart" className="rounded-lg w-full max-h-80 object-contain" />
          <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-md bg-background/70 backdrop-blur-sm px-2 py-1 text-[10px] text-muted-foreground">
            <Image className="h-3 w-3" /> Screenshot
          </div>
        </div>
      )}

      {/* ─── USER NOTE ─── */}
      {review.user_note && (
        <div className="panel-inset p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-label font-semibold text-muted-foreground/60 uppercase">Nota personale</span>
          </div>
          <p className="text-sm text-foreground">{review.user_note}</p>
        </div>
      )}

      {/* ─── FAILED STATE ─── */}
      {review.status === "failed" && (
        <div className="card-premium p-8 text-center border-destructive/20 mb-6">
          <p className="text-muted-foreground">L'analisi non è stata completata. Riprova con un'immagine più chiara.</p>
        </div>
      )}

      {/* ─── ANALYSIS CONTENT ─── */}
      {isEasy ? (
        <EasyAnalysisDisplay
          analysis={review.analysis}
          accountSize={review.account_size || undefined}
          asset={review.asset}
          reviewId={review.id}
          riskPercent={(review as any).risk_percent || undefined}
        />
      ) : (
        <AnalysisDisplay analysis={review.analysis} />
      )}

      {/* ─── RATING ─── */}
      {review.status === "completed" && (
        <div className="mt-8">
          <ReviewRatingWidget reviewId={review.id} />
        </div>
      )}

      {/* ─── RE-EXAMINE ─── */}
      {review.status === "completed" && !showReexamine && (
        <div className="mt-4">
          <Button variant="outline" onClick={() => setShowReexamine(true)} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Riesamina con più contesto
          </Button>
        </div>
      )}

      {showReexamine && (
        <div className="mt-6">
          <ReviewForm
            onClose={() => setShowReexamine(false)}
            onSuccess={() => { setShowReexamine(false); onRefresh(); loadLinked(); }}
            parentReviewId={review.id}
            defaultAsset={review.asset}
            defaultTimeframe={review.timeframe}
          />
        </div>
      )}

      {/* ─── LINKED REVIEWS ─── */}
      {linkedReviews.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="text-label font-semibold uppercase text-muted-foreground/60">Review collegate</h3>
          </div>
          <div className="space-y-2">
            {linkedReviews.map((lr) => (
              <button key={lr.id} onClick={() => onSelectReview(lr)} className="w-full card-premium p-3.5 text-left hover:border-primary/20 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {lr.id === review.parent_review_id ? "⬆ Review originale" : "⬇ Riesame"}
                      {" · "}{lr.asset} - {lr.timeframe}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 font-mono-data">{new Date(lr.created_at).toLocaleDateString("it-IT")}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {lr.analysis?.qualita_setup ? `${lr.analysis.qualita_setup}/10` : lr.analysis?.signal_quality || "N/A"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── DISCLAIMER ─── */}
      <div className="mt-8 panel-inset p-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground/60">Disclaimer:</strong> Questa analisi ha finalità informative, educative e di supporto operativo.
          Non costituisce esecuzione automatica, consulenza finanziaria personalizzata o garanzia di risultato.
          Le decisioni di trading sono sotto la tua esclusiva responsabilità.
        </p>
      </div>
    </div>
  );
}
