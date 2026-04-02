import { useEffect, useState, useMemo } from "react";
import { trackEvent } from "@/lib/analytics";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLicenseSettings } from "@/hooks/useLicenseSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Upload, Loader2, GitCompare, MessageSquare, Star, Zap, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Review, PremiumUsage } from "@/components/ai-review/types";
import { ReviewForm } from "@/components/ai-review/ReviewForm";
import { EasyReviewForm } from "@/components/ai-review/EasyReviewForm";
import { ReviewDetail } from "@/components/ai-review/ReviewDetail";
import { ReviewComparison } from "@/components/ai-review/ReviewComparison";
import { ReviewFilters } from "@/components/ai-review/ReviewFilters";
import { ModeSelector } from "@/components/ai-review/ModeSelector";
import { TierSelector } from "@/components/ai-review/TierSelector";

export default function AIReview() {
  const { user } = useAuth();
  const { settings: licenseSettings, usage: licenseUsage, refresh: refreshLicense } = useLicenseSettings();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reviewMode, setReviewMode] = useState<"pro" | "easy">("easy");
  const [reviewTier, setReviewTier] = useState<"standard" | "premium">("standard");
  const [premiumUsage, setPremiumUsage] = useState<PremiumUsage | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAsset, setFilterAsset] = useState("all");
  const [filterTimeframe, setFilterTimeframe] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterQuality, setFilterQuality] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Comparison
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => { loadReviews(); loadPremiumUsage(); trackEvent("review_page_opened", { page: "ai-review", section: "ai-review" }); }, []);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("ai_chart_reviews")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setReviews(data as any[]);
    setLoading(false);
  };

  const loadPremiumUsage = async () => {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data } = await supabase
      .from("premium_review_usage" as any)
      .select("*")
      .eq("user_id", user!.id)
      .eq("month_year", monthYear)
      .single();
    if (data) setPremiumUsage(data as any);
  };

  const filtered = useMemo(() => {
    let result = [...reviews];
    if (filterAsset !== "all") result = result.filter(r => r.asset === filterAsset);
    if (filterTimeframe !== "all") result = result.filter(r => r.timeframe === filterTimeframe);
    if (filterStatus !== "all") result = result.filter(r => r.status === filterStatus);
    if (filterQuality !== "all") {
      result = result.filter(r => {
        const q = r.analysis?.qualita_setup ?? r.analysis?.signal_quality;
        if (filterQuality === "high") return (typeof q === "number" ? q >= 8 : q === "alta");
        if (filterQuality === "medium") return (typeof q === "number" ? (q >= 5 && q <= 7) : q === "media");
        if (filterQuality === "low") return (typeof q === "number" ? q <= 4 : q === "bassa");
        return true;
      });
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.asset.toLowerCase().includes(s) ||
        r.request_type.toLowerCase().includes(s) ||
        r.user_note?.toLowerCase().includes(s) ||
        r.analysis?.conclusione?.toLowerCase().includes(s)
      );
    }
    result.sort((a, b) => {
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === "desc" ? -d : d;
    });
    return result;
  }, [reviews, filterAsset, filterTimeframe, filterStatus, filterQuality, search, sortOrder]);

  const toggleCompare = (id: string) => {
    const next = new Set(compareIds);
    if (next.has(id)) next.delete(id);
    else if (next.size < 2) next.add(id);
    setCompareIds(next);
  };

  if (showComparison && compareIds.size === 2) {
    const ids = Array.from(compareIds);
    const a = reviews.find(r => r.id === ids[0])!;
    const b = reviews.find(r => r.id === ids[1])!;
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <ReviewComparison reviewA={a} reviewB={b} onClose={() => { setShowComparison(false); setCompareIds(new Set()); }} />
        </div>
      </AppLayout>
    );
  }

  if (selectedReview) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          <ReviewDetail
            review={selectedReview}
            onBack={() => setSelectedReview(null)}
            onRefresh={() => { loadReviews(); loadPremiumUsage(); }}
            onSelectReview={setSelectedReview}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-success" />
            </div>
            <div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">AI Chart Review</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Analisi strutturata dei tuoi grafici</p>
            </div>
          </div>
          <div className="flex gap-2">
            {compareIds.size === 2 && (
              <Button onClick={() => setShowComparison(true)} size="sm" variant="outline">
                <GitCompare className="h-4 w-4 mr-1" /> Confronta
              </Button>
            )}
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Upload className="h-4 w-4 mr-1" /> Nuova review
            </Button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-4 mb-4 bg-secondary/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>⚠️ Disclaimer:</strong> Questa analisi ha finalità informative, educative e di supporto operativo.
            Non costituisce esecuzione automatica, consulenza finanziaria personalizzata o garanzia di risultato.
            In assenza di contesto sufficiente, il sistema può non proporre alcun setup.
          </p>
        </div>

        {/* License usage counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card-premium p-3">
            <p className="text-[10px] text-muted-foreground">Piano</p>
            <p className="text-sm font-bold text-foreground capitalize">{licenseSettings.license_level}</p>
          </div>
          <div className="card-premium p-3">
            <p className="text-[10px] text-muted-foreground">Standard rimaste</p>
            <p className={cn("text-sm font-bold", licenseUsage.standardReviewsRemaining <= 0 ? "text-destructive" : "text-success")}>
              {licenseUsage.standardReviewsRemaining}/{licenseSettings.chart_review_monthly_limit}
            </p>
          </div>
          <div className="card-premium p-3">
            <p className="text-[10px] text-muted-foreground">Premium rimaste</p>
            <p className={cn("text-sm font-bold", licenseUsage.premiumReviewsRemaining <= 0 ? "text-destructive" : "text-amber-500")}>
              {licenseUsage.premiumReviewsRemaining}/{licenseSettings.premium_review_monthly_limit}
            </p>
          </div>
          <div className="card-premium p-3">
            <p className="text-[10px] text-muted-foreground">Usate questo mese</p>
            <p className="text-sm font-bold text-foreground">{licenseUsage.standardReviewsUsed + licenseUsage.premiumReviewsUsed}</p>
          </div>
        </div>

        {/* Tier selector + Mode selector + Form */}
        {showForm && (
          <div className="flex flex-col gap-10">
            {/* Block 1: Tier + Mode selectors */}
            <div className="space-y-6">
              <TierSelector
                tier={reviewTier}
                onChange={setReviewTier}
                premiumUsed={premiumUsage?.reviews_used ?? 0}
                premiumQuota={premiumUsage?.quota_limit ?? 3}
              />
              <ModeSelector mode={reviewMode} onChange={setReviewMode} />
            </div>

            {/* Block 2: Selection summary */}
            <div className={cn(
              "rounded-xl border px-5 py-4",
              reviewTier === "premium"
                ? "border-amber-500/20 bg-amber-500/[0.04]"
                : "border-border bg-secondary/40"
            )}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Review selezionata
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                  reviewTier === "premium"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    : "bg-primary/10 text-primary border border-primary/20"
                )}>
                  {reviewTier === "premium" ? "👑 Premium Review" : "⚡ Standard Review"}
                </span>
                <span className="text-muted-foreground/40 text-sm">·</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 text-xs font-semibold">
                  {reviewMode === "pro" ? "📊 Pro Mode" : "⚡ Easy Mode"}
                </span>
              </div>
            </div>

            {/* Block 3: Review form */}
            <div>
              {reviewMode === "pro" ? (
                <ReviewForm onClose={() => setShowForm(false)} onSuccess={() => { loadReviews(); loadPremiumUsage(); }} reviewTier={reviewTier} />
              ) : (
                <EasyReviewForm onClose={() => setShowForm(false)} onSuccess={() => { loadReviews(); loadPremiumUsage(); }} reviewTier={reviewTier} />
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <ReviewFilters
          search={search} onSearchChange={setSearch}
          filterAsset={filterAsset} onFilterAsset={setFilterAsset}
          filterTimeframe={filterTimeframe} onFilterTimeframe={setFilterTimeframe}
          filterStatus={filterStatus} onFilterStatus={setFilterStatus}
          filterQuality={filterQuality} onFilterQuality={setFilterQuality}
          sortOrder={sortOrder} onSortToggle={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}
        />

        {compareIds.size > 0 && (
          <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs text-primary">
              <GitCompare className="h-3 w-3 inline mr-1" />
              {compareIds.size}/2 review selezionate per il confronto
              {compareIds.size < 2 && " — selezionane un'altra"}
              <button onClick={() => setCompareIds(new Set())} className="ml-2 underline">Annulla</button>
            </p>
          </div>
        )}

        {/* Reviews list */}
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
            Le tue review <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </h2>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="card-premium p-8 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nessuna review trovata</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <div key={r.id} className={cn(
                  "card-premium p-4 hover:border-primary/30 transition-colors flex items-center gap-3",
                  r.review_tier === "premium" && "border-amber-500/20"
                )}>
                  <Checkbox
                    checked={compareIds.has(r.id)}
                    onCheckedChange={() => toggleCompare(r.id)}
                    disabled={compareIds.size >= 2 && !compareIds.has(r.id)}
                    className="shrink-0"
                  />
                  <button onClick={() => setSelectedReview(r)} className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">
                            {r.asset} - {r.timeframe}
                            {r.parent_review_id && <span className="text-primary text-[10px] ml-2">🔗 Riesame</span>}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.request_type} · {new Date(r.created_at).toLocaleDateString("it-IT")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.review_tier === "premium" && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                            <Crown className="h-2.5 w-2.5 mr-0.5" />Premium
                          </Badge>
                        )}
                        {r.review_mode === "easy" && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                            <Zap className="h-2.5 w-2.5 mr-0.5" />Easy
                          </Badge>
                        )}
                        {r.user_note && <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                        {r.analysis?.qualita_setup != null && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Star className="h-2.5 w-2.5 mr-0.5" />{r.analysis.qualita_setup}/10
                          </Badge>
                        )}
                        {r.analysis?.signal_quality && !r.analysis?.qualita_setup && (
                          <Badge variant="secondary" className="text-[10px]">
                            {r.analysis.signal_quality}
                          </Badge>
                        )}
                        <Badge className={cn(
                          r.status === "completed" ? "bg-success/10 text-success" :
                          r.status === "failed" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        )}>
                          {r.status === "completed" ? "Completata" : r.status === "failed" ? "Fallita" : "In attesa"}
                        </Badge>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
