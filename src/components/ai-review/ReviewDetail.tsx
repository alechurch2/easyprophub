import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Review } from "./types";
import { AnalysisDisplay } from "./AnalysisDisplay";
import { EasyAnalysisDisplay } from "./EasyAnalysisDisplay";
import { ReviewRatingWidget } from "./ReviewRatingWidget";
import { ReviewForm } from "./ReviewForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, MessageSquare, Link2, Zap, BarChart3, Crown } from "lucide-react";
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
      <button onClick={onBack} className="text-sm text-primary hover:underline mb-4 flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Torna alle review
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl font-bold text-foreground">{review.asset} - {review.timeframe}</h1>
            {review.review_tier === "premium" && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Crown className="h-3 w-3 mr-0.5" />Premium</Badge>
            )}
            {isEasy ? (
              <Badge variant="outline" className="border-primary/30 text-primary"><Zap className="h-3 w-3 mr-0.5" />Easy</Badge>
            ) : (
              <Badge variant="outline"><BarChart3 className="h-3 w-3 mr-0.5" />Pro</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {review.request_type} · {new Date(review.created_at).toLocaleString("it-IT")}
            {review.account_size ? ` · Conto: $${(review.account_size).toLocaleString()}` : ""}
          </p>
        </div>
        <Badge className={cn(
          review.status === "completed" ? "bg-success/10 text-success" :
          review.status === "failed" ? "bg-destructive/10 text-destructive" :
          "bg-warning/10 text-warning"
        )}>
          {review.status === "completed" ? "Completata" : review.status === "failed" ? "Fallita" : "In attesa"}
        </Badge>
      </div>

      {review.screenshot_url && (
        <div className="card-premium p-2 mb-6">
          <img src={review.screenshot_url} alt="Chart" className="rounded-lg w-full max-h-80 object-contain" />
        </div>
      )}

      {review.user_note && (
        <div className="card-premium p-4 mb-6 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Nota personale</span>
          </div>
          <p className="text-sm text-foreground">{review.user_note}</p>
        </div>
      )}

      {review.status === "failed" && (
        <div className="card-premium p-6 text-center border-destructive/20 mb-6">
          <p className="text-muted-foreground">L'analisi non è stata completata. Riprova con un'immagine più chiara.</p>
        </div>
      )}

      {isEasy ? (
        <EasyAnalysisDisplay
          analysis={review.analysis}
          accountSize={review.account_size || undefined}
          asset={review.asset}
          reviewId={review.id}
        />
      ) : (
        <AnalysisDisplay analysis={review.analysis} />
      )}

      {review.status === "completed" && (
        <div className="mt-6">
          <ReviewRatingWidget reviewId={review.id} />
        </div>
      )}

      {review.status === "completed" && !showReexamine && (
        <div className="mt-4">
          <Button variant="outline" onClick={() => setShowReexamine(true)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Riesamina con più contesto
          </Button>
        </div>
      )}

      {showReexamine && (
        <div className="mt-4">
          <ReviewForm
            onClose={() => setShowReexamine(false)}
            onSuccess={() => { setShowReexamine(false); onRefresh(); loadLinked(); }}
            parentReviewId={review.id}
            defaultAsset={review.asset}
            defaultTimeframe={review.timeframe}
          />
        </div>
      )}

      {linkedReviews.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Review collegate</h3>
          </div>
          <div className="space-y-2">
            {linkedReviews.map((lr) => (
              <button key={lr.id} onClick={() => onSelectReview(lr)} className="w-full card-premium p-3 text-left hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">
                      {lr.id === review.parent_review_id ? "⬆ Review originale" : "⬇ Riesame"}
                      {" · "}{lr.asset} - {lr.timeframe}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(lr.created_at).toLocaleDateString("it-IT")}</p>
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

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Disclaimer:</strong> Questa analisi ha finalità informative, educative e di supporto operativo.
          Non costituisce esecuzione automatica, consulenza finanziaria personalizzata o garanzia di risultato.
          Le decisioni di trading sono sotto la tua esclusiva responsabilità.
        </p>
      </div>
    </div>
  );
}
