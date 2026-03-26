import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, TrendingUp, Zap, Filter, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  topEvents: { name: string; count: number }[];
  topUsers: { user_id: string; name: string; count: number }[];
  onboardingCompletion: { total: number; completed: number };
  sectionBreakdown: { section: string; count: number }[];
  recentEvents: any[];
}

const SECTIONS = [
  { value: "all", label: "Tutte le sezioni" },
  { value: "onboarding", label: "Onboarding" },
  { value: "training", label: "Formazione" },
  { value: "ai-review", label: "AI Review" },
  { value: "ai-assistant", label: "AI Assistant" },
  { value: "account-center", label: "Account Center" },
  { value: "support", label: "Supporto" },
  { value: "library", label: "Libreria" },
];

const DATE_RANGES = [
  { value: "7", label: "Ultimi 7 giorni" },
  { value: "30", label: "Ultimi 30 giorni" },
  { value: "90", label: "Ultimi 90 giorni" },
  { value: "all", label: "Tutto" },
];

export default function AdminAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

  const load = async () => {
    setLoading(true);

    let query = supabase.from("product_analytics_events" as any).select("*");

    if (dateRange !== "all") {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(dateRange));
      query = query.gte("created_at", since.toISOString());
    }
    if (sectionFilter !== "all") {
      query = query.eq("section", sectionFilter);
    }

    const { data: events } = await query.order("created_at", { ascending: false }).limit(1000);
    const allEvents = (events as any[]) || [];

    // Get profiles for user names
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name || "Utente"; });

    // Top events
    const eventCounts: Record<string, number> = {};
    allEvents.forEach((e) => { eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1; });
    const topEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Top users
    const userCounts: Record<string, number> = {};
    allEvents.forEach((e) => { userCounts[e.user_id] = (userCounts[e.user_id] || 0) + 1; });
    const topUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([user_id, count]) => ({ user_id, name: profileMap[user_id] || user_id.slice(0, 8), count }));

    // Unique users
    const uniqueUsers = new Set(allEvents.map((e) => e.user_id)).size;

    // Section breakdown
    const sectionCounts: Record<string, number> = {};
    allEvents.forEach((e) => {
      const s = e.section || e.page || "altro";
      sectionCounts[s] = (sectionCounts[s] || 0) + 1;
    });
    const sectionBreakdown = Object.entries(sectionCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([section, count]) => ({ section, count }));

    // Onboarding completion
    const { data: onboardingData } = await supabase
      .from("user_onboarding_progress" as any)
      .select("user_id, step_key, status");
    const onboardingUsers = new Set((onboardingData as any[] || []).map((o: any) => o.user_id));
    const fullyCompleted = new Set<string>();
    onboardingUsers.forEach((uid) => {
      const userSteps = (onboardingData as any[] || []).filter((o: any) => o.user_id === uid && o.status === "completed");
      if (userSteps.length >= 6) fullyCompleted.add(uid);
    });

    setSummary({
      totalEvents: allEvents.length,
      uniqueUsers,
      topEvents,
      topUsers,
      onboardingCompletion: { total: onboardingUsers.size, completed: fullyCompleted.size },
      sectionBreakdown,
      recentEvents: allEvents.slice(0, 20).map((e) => ({
        ...e,
        userName: profileMap[e.user_id] || e.user_id.slice(0, 8),
      })),
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [dateRange, sectionFilter]);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Caricamento analytics...</div>;
  }

  if (!summary) return null;

  const filteredRecent = userSearch
    ? summary.recentEvents.filter((e) => e.userName.toLowerCase().includes(userSearch.toLowerCase()) || e.user_id.includes(userSearch))
    : summary.recentEvents;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Cerca utente..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-8 w-[180px]" />
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1" />Aggiorna</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard icon={BarChart3} label="Eventi totali" value={summary.totalEvents} color="text-primary" />
        <KPICard icon={Users} label="Utenti attivi" value={summary.uniqueUsers} color="text-info" />
        <KPICard
          icon={Zap}
          label="Onboarding completato"
          value={`${summary.onboardingCompletion.completed}/${summary.onboardingCompletion.total}`}
          color="text-success"
        />
        <KPICard icon={TrendingUp} label="Feature top" value={summary.topEvents[0]?.name || "—"} color="text-primary" isText />
      </div>

      {/* Top Events + Top Users side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Events */}
        <div className="card-premium p-4">
          <h4 className="font-heading font-semibold text-sm text-foreground mb-3">Feature più usate</h4>
          <div className="space-y-2">
            {summary.topEvents.map((e) => (
              <div key={e.name} className="flex items-center justify-between">
                <span className="text-xs text-foreground truncate max-w-[70%]">{e.name}</span>
                <Badge variant="secondary" className="text-xs">{e.count}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div className="card-premium p-4">
          <h4 className="font-heading font-semibold text-sm text-foreground mb-3">Utenti più attivi</h4>
          <div className="space-y-2">
            {summary.topUsers.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between">
                <span className="text-xs text-foreground truncate max-w-[70%]">{u.name}</span>
                <Badge variant="outline" className="text-xs">{u.count} eventi</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section Breakdown */}
      <div className="card-premium p-4">
        <h4 className="font-heading font-semibold text-sm text-foreground mb-3">Utilizzo per sezione</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {summary.sectionBreakdown.map((s) => (
            <div key={s.section} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <span className="text-xs text-foreground capitalize">{s.section}</span>
              <Badge variant="secondary" className="text-xs">{s.count}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="card-premium p-4">
        <h4 className="font-heading font-semibold text-sm text-foreground mb-3">Ultimi eventi</h4>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {filteredRecent.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 py-1.5 px-2 rounded text-xs hover:bg-muted/30">
              <span className="text-muted-foreground w-[110px] shrink-0">{new Date(e.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="text-foreground font-medium truncate max-w-[120px]">{e.userName}</span>
              <Badge variant="outline" className="text-[10px]">{e.event_name}</Badge>
              {e.section && <span className="text-muted-foreground capitalize">{e.section}</span>}
            </div>
          ))}
          {filteredRecent.length === 0 && <p className="text-xs text-muted-foreground">Nessun evento trovato</p>}
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, isText }: { icon: any; label: string; value: any; color: string; isText?: boolean }) {
  return (
    <div className="card-premium p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("font-bold", isText ? "text-sm truncate" : "text-xl")}>{value}</p>
    </div>
  );
}
