import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { SharedSignals } from "@/components/dashboard/SharedSignals";
import { SignalStatusBadge } from "@/components/dashboard/SignalStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Radio, TrendingUp, TrendingDown, BarChart3, Trophy, XCircle, Clock,
  ArrowUpDown, Filter, Loader2, Target, Percent, Activity, Minus, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLicenseSettings } from "@/hooks/useLicenseSettings";

interface HistorySignal {
  id: string;
  asset: string;
  direction: string;
  order_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  signal_strength: number;
  signal_status: string;
  signal_source?: string;
  published_at: string;
  explanation: string | null;
}

interface SignalStats {
  total: number;
  won: number;
  lost: number;
  active: number;
  triggered: number;
  expired: number;
  withdrawn: number;
  winRate: number | null;
}



export default function Signals() {
  const { user } = useAuth();
  const { settings: licenseSettings } = useLicenseSettings();
  const isFree = licenseSettings.license_level === "free";
  const [allSignals, setAllSignals] = useState<HistorySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAsset, setFilterAsset] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    trackEvent("signals_opened", { page: "signals", section: "signals" });
    loadAll();

    const channel = supabase
      .channel("signals-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_signals" }, () => {
        loadAll();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAll = async () => {
    const { data } = await supabase
      .from("shared_signals")
      .select("id, asset, direction, order_type, entry_price, stop_loss, take_profit, signal_strength, signal_status, signal_source, published_at, explanation")
      .eq("is_published", true)
      .eq("is_archived", false)
      .order("published_at", { ascending: false });
    if (data) setAllSignals(data as any);
    setLoading(false);
  };

  const stats: SignalStats = useMemo(() => {
    const total = allSignals.length;
    const won = allSignals.filter(s => s.signal_status === "won").length;
    const lost = allSignals.filter(s => s.signal_status === "lost").length;
    const active = allSignals.filter(s => s.signal_status === "active").length;
    const triggered = allSignals.filter(s => s.signal_status === "triggered").length;
    const expired = allSignals.filter(s => s.signal_status === "expired").length;
    const withdrawn = allSignals.filter(s => s.signal_status === "withdrawn").length;
    const closed = won + lost;
    const winRate = closed > 0 ? Math.round((won / closed) * 100) : null;
    return { total, won, lost, active, triggered, expired, withdrawn, winRate };
  }, [allSignals]);

  const assets = useMemo(() => {
    const set = new Set(allSignals.map(s => s.asset));
    return Array.from(set).sort();
  }, [allSignals]);

  const historySignals = useMemo(() => {
    let result = allSignals.filter(s => s.signal_status !== "active");
    if (filterStatus !== "all") result = result.filter(s => s.signal_status === filterStatus);
    if (filterAsset !== "all") result = result.filter(s => s.asset === filterAsset);
    result.sort((a, b) => {
      const d = new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
      return sortOrder === "desc" ? -d : d;
    });
    return result;
  }, [allSignals, filterStatus, filterAsset, sortOrder]);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* ═══ HEADER ═══ */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-background to-card" />
          <div className="absolute top-0 right-0 w-[500px] h-[350px] bg-primary/[0.03] rounded-full blur-[100px] -translate-y-1/2" />
          <div className="relative px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Radio className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Trading Hub</p>
                  <h1 className="font-heading text-2xl font-bold text-foreground">Segnali</h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground/60 ml-[52px]">
                Segnali operativi condivisi, storico completo e statistiche di performance
              </p>
            </div>
          </div>
          <div className="divider-fade" />
        </div>

        <div className="px-6 sm:px-8 lg:px-10 py-6 lg:py-8 max-w-5xl mx-auto">

          {/* ═══ ACTIVE SIGNAL ═══ */}
          <SharedSignals isFreeUser={isFree} />

          {/* ═══ FREE UPSELL ═══ */}
          {isFree && (
            <div className="mb-8 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.04] via-card to-amber-500/[0.03] p-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-heading font-semibold text-foreground">Sblocca i segnali completi</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Stop Loss e Take Profit sono disponibili con i piani Pro e Live per un'operatività completa e professionale.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STATS ═══ */}
          {!loading && stats.total > 0 && (
            <div className="mb-10">
              <p className="text-label uppercase text-muted-foreground/50 font-semibold mb-4">Statistiche segnali</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Totali", value: stats.total, icon: Activity, color: "text-foreground" },
                  { label: "Vinti", value: stats.won, icon: Trophy, color: "text-success" },
                  { label: "Persi", value: stats.lost, icon: XCircle, color: "text-destructive" },
                  { label: "Attivi", value: stats.active, icon: Radio, color: "text-primary" },
                  { label: "Aperti", value: stats.triggered, icon: Target, color: "text-info" },
                  { label: "Win Rate", value: stats.winRate !== null ? `${stats.winRate}%` : "—", icon: Percent, color: "text-primary" },
                ].map(s => (
                  <div key={s.label} className="card-premium p-4 text-center">
                    <s.icon className={cn("h-4 w-4 mx-auto mb-2", s.color)} />
                    <p className={cn("font-heading text-xl font-bold", s.color)}>{s.value}</p>
                    <p className="text-[10px] uppercase text-muted-foreground/50 font-semibold mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ HISTORY ═══ */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground/50" />
                <p className="text-label uppercase text-muted-foreground/50 font-semibold">Storico segnali</p>
                <Badge variant="outline" className="text-[9px] ml-0.5 px-1.5">{historySignals.length}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="triggered">Aperto</SelectItem>
                    <SelectItem value="won">Vinto</SelectItem>
                    <SelectItem value="lost">Perso</SelectItem>
                    <SelectItem value="expired">Scaduto</SelectItem>
                    <SelectItem value="withdrawn">Ritirato</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAsset} onValueChange={setFilterAsset}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli asset</SelectItem>
                    {assets.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}>
                  <ArrowUpDown className="h-3 w-3 mr-1" />{sortOrder === "desc" ? "Recenti" : "Meno recenti"}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : historySignals.length === 0 ? (
              <div className="card-elevated p-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground/60">Nessun segnale nello storico</p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">I segnali chiusi appariranno qui</p>
              </div>
            ) : (
              <div className="overflow-x-auto card-elevated">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Asset</th>
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Direzione</th>
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Tipo</th>
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Entry</th>
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">SL</th>
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">TP</th>
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Forza</th>
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Stato</th>
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historySignals.map((sig) => {
                      const buy = sig.direction.toLowerCase().includes("buy");
                      return (
                        <tr key={sig.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {buy ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                              <span className="font-medium text-foreground">{sig.asset}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge className={cn("text-[10px]", buy ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                              {sig.direction}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground capitalize">{sig.order_type}</td>
                          <td className="py-2.5 px-3 font-mono-data text-foreground">{sig.entry_price}</td>
                          <td className="py-2.5 px-3 font-mono-data text-destructive">
                            {isFree ? <span className="blur-[5px] select-none pointer-events-none">0.0000</span> : sig.stop_loss}
                          </td>
                          <td className="py-2.5 px-3 font-mono-data text-success">
                            {isFree ? <span className="blur-[5px] select-none pointer-events-none">0.0000</span> : sig.take_profit}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className={cn(
                                  "h-1.5 w-2 rounded-full",
                                  i <= sig.signal_strength ? "bg-primary" : "bg-muted-foreground/10"
                                )} />
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3"><SignalStatusBadge status={sig.signal_status} /></td>
                          <td className="py-2.5 px-3 text-muted-foreground font-mono-data">
                            {new Date(sig.published_at).toLocaleDateString("it-IT")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
