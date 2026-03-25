import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Upload, Loader2, GitCompare, MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Review } from "@/components/ai-review/types";
import { ReviewForm } from "@/components/ai-review/ReviewForm";
import { ReviewDetail } from "@/components/ai-review/ReviewDetail";
import { ReviewComparison } from "@/components/ai-review/ReviewComparison";
import { ReviewFilters } from "@/components/ai-review/ReviewFilters";

export default function AIReview() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

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

  useEffect(() => { loadReviews(); }, []);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("ai_chart_reviews")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setReviews(data as any[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = [...reviews];
    if (filterAsset !== "all") result = result.filter(r => r.asset === filterAsset);
    if (filterTimeframe !== "all") result = result.filter(r => r.timeframe === filterTimeframe);
    if (filterStatus !== "all") result = result.filter(r => r.status === filterStatus);
    if (filterQuality !== "all") {
      result = result.filter(r => {
        const q = r.analysis?.qualita_setup;
        if (typeof q !== "number") return false;
        if (filterQuality === "high") return q >= 8;
        if (filterQuality === "medium") return q >= 5 && q <= 7;
        if (filterQuality === "low") return q <= 4;
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

  // Show comparison view
  if (showComparison && compareIds.size === 2) {
    const ids = Array.from(compareIds);
    const a = reviews.find(r => r.id === ids[0])!;
    const b = reviews.find(r => r.id === ids[1])!;
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          <ReviewComparison reviewA={a} reviewB={b} onClose={() => { setShowComparison(false); setCompareIds(new Set()); }} />
        </div>
      </AppLayout>
    );
  }

  // Show detail view
  if (selectedReview) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <ReviewDetail
            review={selectedReview}
            onBack={() => setSelectedReview(null)}
            onRefresh={loadReviews}
            onSelectReview={setSelectedReview}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-success" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">AI Chart Review</h1>
              <p className="text-sm text-muted-foreground">Analisi strutturata dei tuoi grafici, powered by EasyProp</p>
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
        <div className="p-4 mb-6 bg-secondary/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>⚠️ Disclaimer:</strong> L'AI Chart Review fornisce supporto analitico a scopo educativo.
            Non esegue operazioni automatiche e non costituisce consulenza finanziaria.
          </p>
        </div>

        {/* Form */}
        {showForm && (
          <ReviewForm onClose={() => setShowForm(false)} onSuccess={loadReviews} />
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
                <div key={r.id} className="card-premium p-4 hover:border-primary/30 transition-colors flex items-center gap-3">
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
                        {r.user_note && <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                        {r.analysis?.qualita_setup != null && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Star className="h-2.5 w-2.5 mr-0.5" />{r.analysis.qualita_setup}/10
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
