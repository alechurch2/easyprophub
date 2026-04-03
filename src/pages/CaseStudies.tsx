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

  const [search, setSearch] = useState("");
  const [filterAsset, setFilterAsset] = useState("all");
  const [filterTimeframe, setFilterTimeframe] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterQuality, setFilterQuality] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    loadReviews();
    trackEvent("library_opened", { page: "case-studies", section: "library" });
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
          <button onClick={() => setSelected(null)} className="text-[11px] uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors mb-6 flex items-center gap-1.5">
            <ArrowLeft className="h-3 w-3" /> Torna alla libreria
          </button>

          <div className="card-elevated p-6 sm:p-8 mb-6">
            {/* Didactic badge */}
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-primary/10 text-primary border border-primary/20">
                <GraduationCap className="h-3 w-3 mr-1" /> Esempio Didattico
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">{selected.asset} · {selected.timeframe}</Badge>
              {selected.analysis?.qualita_setup != null && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  <Star className="h-3 w-3 mr-0.5 text-primary" />{selected.analysis.qualita_setup}/10
                </Badge>
              )}
            </div>

            <h1 className="font-heading text-xl lg:text-2xl font-bold text-foreground mb-2">
              {selected.didactic_title || `${selected.asset} - ${selected.timeframe}`}
            </h1>

            {selected.didactic_description && (
              <p className="text-sm text-muted-foreground/70 leading-relaxed">{selected.didactic_description}</p>
            )}

            {selected.didactic_tags && selected.didactic_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {selected.didactic_tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md panel-inset text-muted-foreground/60">
                    <Tag className="h-2.5 w-2.5 mr-1 inline" />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {selected.screenshot_url && (
            <div className="rounded-2xl overflow-hidden mb-6 border border-border/50 shadow-2xl bg-black/20">
              <img src={selected.screenshot_url} alt="Chart" className="w-full max-h-80 object-contain" />
            </div>
          )}

          <AnalysisDisplay analysis={selected.analysis} />

          {/* Disclaimer */}
          <div className="mt-8 panel-inset p-4 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
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
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Knowledge Base</p>
              <h1 className="font-heading text-2xl font-bold text-foreground">Libreria Didattica</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/60 ml-[52px]">Esempi selezionati di analisi AI per apprendere le metodologie operative</p>
          <div className="divider-fade mb-0 mt-4" />
        </div>

        {/* Filters */}
        <div className="panel-inset p-4 rounded-xl mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
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
        <p className="text-[10px] font-mono text-muted-foreground/40 mb-4">{filtered.length} {filtered.length === 1 ? "esempio" : "esempi"} trovati</p>

        {/* List */}
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground/60">Nessun esempio didattico disponibile</p>
            <p className="text-[10px] text-muted-foreground/40 mt-1">Prova a modificare i filtri di ricerca</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="card-premium p-0 text-left hover:border-primary/20 transition-all duration-200 group overflow-hidden"
              >
                {r.screenshot_url && (
                  <div className="overflow-hidden bg-black/20 border-b border-border/30">
                    <img src={r.screenshot_url} alt="Chart" className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px] font-mono">{r.asset}</Badge>
                    <Badge variant="secondary" className="text-[10px] font-mono">{r.timeframe}</Badge>
                    {r.analysis?.qualita_setup != null && (
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        <Star className="h-2.5 w-2.5 mr-0.5 text-primary" />{r.analysis.qualita_setup}/10
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                    {r.didactic_title || `${r.asset} - ${r.timeframe}`}
                  </h3>
                  {r.didactic_description && (
                    <p className="text-xs text-muted-foreground/60 mt-1.5 line-clamp-2 leading-relaxed">{r.didactic_description}</p>
                  )}
                  {r.didactic_tags && r.didactic_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {r.didactic_tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded panel-inset text-muted-foreground/50">{tag}</span>
                      ))}
                      {r.didactic_tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground/40">+{r.didactic_tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
