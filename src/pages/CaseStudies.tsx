import { useEffect, useState, useMemo } from "react";
import { trackEvent } from "@/lib/analytics";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Loader2, ArrowLeft, Search, ArrowUpDown, Star, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Review, ASSETS, TIMEFRAMES } from "@/components/ai-review/types";
import { AnalysisDisplay } from "@/components/ai-review/AnalysisDisplay";

export default function CaseStudies() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Review | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAsset, setFilterAsset] = useState("all");
  const [filterTimeframe, setFilterTimeframe] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterQuality, setFilterQuality] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("ai_chart_reviews")
      .select("*")
      .eq("is_didactic_example", true)
      .eq("didactic_visible", true)
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    if (data) setReviews(data as any[]);
    setLoading(false);
  };

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    reviews.forEach(r => r.didactic_tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [reviews]);

  const filtered = useMemo(() => {
    let result = [...reviews];
    if (filterAsset !== "all") result = result.filter(r => r.asset === filterAsset);
    if (filterTimeframe !== "all") result = result.filter(r => r.timeframe === filterTimeframe);
    if (filterTag !== "all") result = result.filter(r => r.didactic_tags?.includes(filterTag));
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
        r.didactic_title?.toLowerCase().includes(s) ||
        r.didactic_description?.toLowerCase().includes(s) ||
        r.asset.toLowerCase().includes(s) ||
        r.didactic_tags?.some(t => t.toLowerCase().includes(s))
      );
    }
    result.sort((a, b) => {
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === "desc" ? -d : d;
    });
    return result;
  }, [reviews, filterAsset, filterTimeframe, filterTag, filterQuality, search, sortOrder]);

  // Detail view
  if (selected) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
          <button onClick={() => setSelected(null)} className="text-sm text-primary hover:underline mb-4 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Torna alla libreria
          </button>

          {/* Didactic badge */}
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-primary/10 text-primary">
              <GraduationCap className="h-3 w-3 mr-1" /> Esempio Didattico
            </Badge>
            <Badge variant="secondary">{selected.asset} · {selected.timeframe}</Badge>
            {selected.analysis?.qualita_setup != null && (
              <Badge variant="secondary">
                <Star className="h-3 w-3 mr-0.5" />{selected.analysis.qualita_setup}/10
              </Badge>
            )}
          </div>

          <h1 className="font-heading text-xl lg:text-2xl font-bold text-foreground mb-2">
            {selected.didactic_title || `${selected.asset} - ${selected.timeframe}`}
          </h1>

          {selected.didactic_description && (
            <p className="text-sm text-muted-foreground mb-4">{selected.didactic_description}</p>
          )}

          {selected.didactic_tags && selected.didactic_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {selected.didactic_tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-2.5 w-2.5 mr-1" />{tag}
                </Badge>
              ))}
            </div>
          )}

          {selected.screenshot_url && (
            <div className="card-premium p-2 mb-6">
              <img src={selected.screenshot_url} alt="Chart" className="rounded-lg w-full max-h-80 object-contain" />
            </div>
          )}

          <AnalysisDisplay analysis={selected.analysis} />

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> Questo esempio è a scopo educativo e informativo. Non costituisce consulenza finanziaria
              né raccomandazione operativa.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Libreria Didattica</h1>
            <p className="text-sm text-muted-foreground">Esempi selezionati di analisi AI per apprendere le metodologie operative</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-premium p-4 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per titolo, tag..." className="pl-8 h-9 text-sm" />
            </div>
            <Select value={filterAsset} onValueChange={setFilterAsset}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Asset" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli asset</SelectItem>
                {ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
              <SelectTrigger className="w-[100px] h-9 text-xs"><SelectValue placeholder="TF" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i TF</SelectItem>
                {TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tag</SelectItem>
                  {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterQuality} onValueChange={setFilterQuality}>
              <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="Qualità" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="high">Alta (8-10)</SelectItem>
                <SelectItem value="medium">Media (5-7)</SelectItem>
                <SelectItem value="low">Bassa (1-4)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}>
              <ArrowUpDown className="h-3 w-3 mr-1" />{sortOrder === "desc" ? "Recenti" : "Meno recenti"}
            </Button>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">{filtered.length} {filtered.length === 1 ? "esempio" : "esempi"} trovati</p>

        {/* List */}
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nessun esempio didattico disponibile</p>
            <p className="text-xs text-muted-foreground mt-1">Prova a modificare i filtri di ricerca</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="card-premium p-5 text-left hover:border-primary/30 transition-all group"
              >
                {r.screenshot_url && (
                  <div className="rounded-lg overflow-hidden mb-3 bg-secondary/30">
                    <img src={r.screenshot_url} alt="Chart" className="w-full h-36 object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-[10px]">{r.asset}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{r.timeframe}</Badge>
                  {r.analysis?.qualita_setup != null && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-0.5" />{r.analysis.qualita_setup}/10
                    </Badge>
                  )}
                </div>
                <h3 className="font-heading font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                  {r.didactic_title || `${r.asset} - ${r.timeframe}`}
                </h3>
                {r.didactic_description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.didactic_description}</p>
                )}
                {r.didactic_tags && r.didactic_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.didactic_tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{tag}</span>
                    ))}
                    {r.didactic_tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{r.didactic_tags.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
