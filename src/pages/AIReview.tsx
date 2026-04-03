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
  const { settings: licenseSettings, usage: licenseUsage, loading: licenseLoading, refresh: refreshLicense } = useLicenseSettings();
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
      <div className="animate-fade-in">
        {/* ═══ PAGE HEADER ═══ */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-background to-card" />
          <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-success/[0.03] rounded-full blur-[100px] -translate-y-1/2" />
          
          <div className="relative px-6 sm:px-8 lg:px-10 py-6 lg:py-8">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-label uppercase text-muted-foreground/50 font-semibold mb-2">Analisi AI</p>
                <h1 className="font-heading text-display-sm font-bold text-foreground">AI Chart Review</h1>
                <p className="text-sm text-muted-foreground mt-1">Analisi strutturata dei tuoi grafici</p>
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
          </div>
          <div className="divider-fade" />
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="px-6 sm:px-8 lg:px-10 py-6 lg:py-8 max-w-5xl mx-auto">

          {/* Disclaimer */}
          <div className="panel-inset p-3.5 mb-6">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground/60">⚠️ Disclaimer:</strong> Questa analisi ha finalità informative, educative e di supporto operativo.
              Non costituisce esecuzione automatica, consulenza finanziaria personalizzata o garanzia di risultato.
              In assenza di contesto sufficiente, il sistema può non proporre alcun setup.
            </p>
          </div>

          {/* ── License usage — asymmetric counters ── */}
          {licenseLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card-premium p-4">
                  <Skeleton className="h-3 w-16 mb-2.5" />
                  <Skeleton className="h-6 w-14" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="card-elevated p-4 accent-line-top">
                <p className="text-label text-muted-foreground/60 font-semibold uppercase mb-1.5">Piano</p>
                <p className="font-heading text-title font-bold text-foreground capitalize">{licenseSettings.license_level}</p>
              </div>
              <div className="card-premium p-4">
                <p className="text-label text-muted-foreground/60 font-semibold uppercase mb-1.5">Standard</p>
                <p className={cn("font-mono-data text-title font-bold",
                  licenseUsage.standardReviewsRemaining <= 0 ? "text-destructive" : "text-success"
                )}>
                  {licenseUsage.standardReviewsRemaining}<span className="text-muted-foreground/40 text-xs font-normal">/{licenseSettings.chart_review_monthly_limit}</span>
                </p>
              </div>
              <div className="card-premium p-4">
                <p className="text-label text-muted-foreground/60 font-semibold uppercase mb-1.5">Premium</p>
                <p className={cn("font-mono-data text-title font-bold",
                  licenseUsage.premiumReviewsRemaining <= 0 ? "text-destructive" : "text-primary"
                )}>
                  {licenseUsage.premiumReviewsRemaining}<span className="text-muted-foreground/40 text-xs font-normal">/{licenseSettings.premium_review_monthly_limit}</span>
                </p>
              </div>
              <div className="card-premium p-4">
                <p className="text-label text-muted-foreground/60 font-semibold uppercase mb-1.5">Usate</p>
                <p className="font-mono-data text-title font-bold text-foreground">
                  {licenseUsage.standardReviewsUsed + licenseUsage.premiumReviewsUsed}
                </p>
              </div>
            </div>
          )}

          {/* ── New review form ── */}
          {showForm && (
            <div className="flex flex-col gap-8 mb-10">
              <div className="space-y-5">
                <TierSelector
                  tier={reviewTier}
                  onChange={setReviewTier}
                  premiumUsed={premiumUsage?.reviews_used ?? 0}
                  premiumQuota={premiumUsage?.quota_limit ?? 3}
                />
                <ModeSelector mode={reviewMode} onChange={setReviewMode} />
              </div>

              {/* Selection summary */}
              <div className={cn(
                "card-premium px-5 py-4 relative overflow-hidden",
                reviewTier === "premium" && "border-primary/20 accent-line-top"
              )}>
                <p className="text-label font-semibold uppercase text-muted-foreground/60 mb-3">
                  Review selezionata
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                    reviewTier === "premium"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-success/8 text-success border border-success/15"
                  )}>
                    {reviewTier === "premium" ? "👑 Premium" : "⚡ Standard"}
                  </span>
                  <span className="text-muted-foreground/20">·</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/8 text-primary border border-primary/15 px-3 py-1.5 text-xs font-semibold">
                    {reviewMode === "pro" ? "📊 Pro Mode" : "⚡ Easy Mode"}
                  </span>
                </div>
              </div>

              <div>
                {reviewMode === "pro" ? (
                  <ReviewForm onClose={() => setShowForm(false)} onSuccess={() => { loadReviews(); loadPremiumUsage(); refreshLicense(); }} reviewTier={reviewTier} />
                ) : (
                  <EasyReviewForm onClose={() => setShowForm(false)} onSuccess={() => { loadReviews(); loadPremiumUsage(); refreshLicense(); }} reviewTier={reviewTier} />
                )}
              </div>
            </div>
          )}

          {/* ── Filters ── */}
          <ReviewFilters
            search={search} onSearchChange={setSearch}
            filterAsset={filterAsset} onFilterAsset={setFilterAsset}
            filterTimeframe={filterTimeframe} onFilterTimeframe={setFilterTimeframe}
            filterStatus={filterStatus} onFilterStatus={setFilterStatus}
            filterQuality={filterQuality} onFilterQuality={setFilterQuality}
            sortOrder={sortOrder} onSortToggle={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}
          />

          {compareIds.size > 0 && (
            <div className="mb-4 panel-inset p-3">
              <p className="text-xs text-primary font-medium">
                <GitCompare className="h-3 w-3 inline mr-1" />
                {compareIds.size}/2 review selezionate per il confronto
                {compareIds.size < 2 && " — selezionane un'altra"}
                <button onClick={() => setCompareIds(new Set())} className="ml-2 underline hover:no-underline">Annulla</button>
              </p>
            </div>
          )}

          {/* ── Reviews list ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-title font-semibold text-foreground">Le tue review</h2>
              <span className="text-xs text-muted-foreground/50 font-mono-data">{filtered.length} risultati</span>
            </div>
            {loading ? (
              <div className="flex justify-center p-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="card-elevated p-16 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground text-sm">Nessuna review trovata</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((r) => (
                  <div key={r.id} className={cn(
                    "card-premium p-3.5 hover:border-primary/15 transition-all duration-200 flex items-center gap-3",
                    r.review_tier === "premium" && "border-primary/10"
                  )}>
                    <Checkbox
                      checked={compareIds.has(r.id)}
                      onCheckedChange={() => toggleCompare(r.id)}
                      disabled={compareIds.size >= 2 && !compareIds.has(r.id)}
                      className="shrink-0"
                    />
                    <button onClick={() => setSelectedReview(r)} className="flex-1 text-left group min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {r.asset} · {r.timeframe}
                            {r.parent_review_id && <span className="text-primary text-[10px] ml-1.5">🔗 Riesame</span>}
                          </h3>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono-data">
                            {r.request_type} · {new Date(r.created_at).toLocaleDateString("it-IT")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                          {r.review_tier === "premium" && (
                            <Badge className="bg-primary/8 text-primary border-primary/15 text-[10px]">
                              <Crown className="h-2.5 w-2.5 mr-0.5" />Premium
                            </Badge>
                          )}
                          {r.review_mode === "easy" && (
                            <Badge variant="outline" className="text-[10px] border-primary/15 text-primary">
                              <Zap className="h-2.5 w-2.5 mr-0.5" />Easy
                            </Badge>
                          )}
                          {r.user_note && <MessageSquare className="h-3 w-3 text-muted-foreground/40" />}
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
                            "text-[10px]",
                            r.status === "completed" ? "bg-success/8 text-success border-success/15" :
                            r.status === "failed" ? "bg-destructive/8 text-destructive border-destructive/15" :
                            "bg-warning/8 text-warning border-warning/15"
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
      </div>
    </AppLayout>
  );
}
