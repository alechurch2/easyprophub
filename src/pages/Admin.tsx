import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield, Users, BookOpen, HeadphonesIcon, BarChart3, Megaphone, Bot,
  Loader2, Check, X, Pause, Plus, Trash2, Edit2, Save, ChevronLeft,
  ThumbsUp, ThumbsDown, Star, MessageSquare, Link2, GraduationCap, Search, ArrowUpDown, Wallet,
  Crown, Clock, Calendar, RefreshCw, Infinity, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ---- Users Tab with License & Quota Management ----
function AdminUsers() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [premiumUsage, setPremiumUsage] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLicense, setFilterLicense] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setProfiles(data);

    // Load premium usage for current month
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: usageData } = await supabase
      .from("premium_review_usage")
      .select("*")
      .eq("month_year", monthYear);
    if (usageData) {
      const map: Record<string, any> = {};
      usageData.forEach((u: any) => { map[u.user_id] = u; });
      setPremiumUsage(map);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (userId: string, status: string) => {
    await supabase.from("profiles").update({ status: status as any }).eq("user_id", userId);
    toast.success("Stato aggiornato");
    load();
  };

  const updateLicense = async (userId: string, updates: Record<string, any>) => {
    await supabase.from("profiles").update(updates as any).eq("user_id", userId);
    toast.success("Licenza aggiornata");
    load();
  };

  const setLicenseDuration = async (userId: string, days: number) => {
    const now = new Date();
    const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    await updateLicense(userId, {
      license_status: "active",
      access_started_at: now.toISOString(),
      access_expires_at: expires.toISOString(),
      status: "approved",
    });
  };

  const setLifetime = async (userId: string) => {
    await updateLicense(userId, {
      license_status: "lifetime",
      access_expires_at: null,
      status: "approved",
    });
  };

  const suspendLicense = async (userId: string) => {
    await updateLicense(userId, { license_status: "suspended" });
  };

  const reactivateLicense = async (userId: string) => {
    await updateLicense(userId, { license_status: "active", status: "approved" });
  };

  const setCustomExpiry = async (userId: string, date: Date) => {
    await updateLicense(userId, {
      license_status: "active",
      access_expires_at: date.toISOString(),
      status: "approved",
    });
  };

  const extendLicense = async (userId: string, days: number) => {
    const profile = profiles.find(p => p.user_id === userId);
    if (!profile) return;
    const current = profile.access_expires_at ? new Date(profile.access_expires_at) : new Date();
    const base = current > new Date() ? current : new Date();
    const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    await updateLicense(userId, {
      license_status: "active",
      access_expires_at: newExpiry.toISOString(),
      status: "approved",
    });
  };

  // Premium quota management
  const updatePremiumQuota = async (userId: string, quota: number) => {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const existing = premiumUsage[userId];
    if (existing) {
      await supabase.from("premium_review_usage").update({ quota_limit: quota } as any).eq("id", existing.id);
    } else {
      await supabase.from("premium_review_usage").insert({
        user_id: userId, month_year: monthYear, reviews_used: 0, quota_limit: quota,
      } as any);
    }
    toast.success("Quota premium aggiornata");
    load();
  };

  const resetPremiumUsage = async (userId: string) => {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const existing = premiumUsage[userId];
    if (existing) {
      await supabase.from("premium_review_usage").update({ reviews_used: 0 } as any).eq("id", existing.id);
    }
    toast.success("Utilizzo premium resettato");
    load();
  };

  const addExtraReviews = async (userId: string, extra: number) => {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const existing = premiumUsage[userId];
    if (existing) {
      await supabase.from("premium_review_usage").update({
        quota_limit: existing.quota_limit + extra,
      } as any).eq("id", existing.id);
    } else {
      await supabase.from("premium_review_usage").insert({
        user_id: userId, month_year: monthYear, reviews_used: 0, quota_limit: extra,
      } as any);
    }
    toast.success(`Aggiunte ${extra} review premium extra`);
    load();
  };

  const getDaysRemaining = (p: any): number | null => {
    if (!p.access_expires_at) return null;
    if (p.license_status === "lifetime") return null;
    const diff = new Date(p.access_expires_at).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getLicenseColor = (p: any) => {
    const ls = p.license_status || "active";
    if (ls === "lifetime") return "bg-primary/10 text-primary";
    if (ls === "suspended") return "bg-destructive/10 text-destructive";
    if (ls === "expired") return "bg-destructive/10 text-destructive";
    const days = getDaysRemaining(p);
    if (days !== null && days <= 0) return "bg-destructive/10 text-destructive";
    if (days !== null && days <= 7) return "bg-amber-500/10 text-amber-600";
    return "bg-success/10 text-success";
  };

  const getLicenseLabel = (p: any) => {
    const ls = p.license_status || "active";
    if (ls === "lifetime") return "♾️ Lifetime";
    if (ls === "suspended") return "🔒 Sospeso";
    if (ls === "pending") return "⏳ Pending";
    const days = getDaysRemaining(p);
    if (days !== null && days <= 0) return "❌ Scaduta";
    if (days !== null) return `${days}g rimanenti`;
    return "✅ Attiva";
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-success/10 text-success";
      case "pending": return "bg-warning/10 text-warning";
      case "suspended": return "bg-destructive/10 text-destructive";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const filtered = profiles.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterLicense === "active") {
      const days = getDaysRemaining(p);
      if (p.license_status === "lifetime") return true;
      if (p.license_status !== "active") return false;
      if (days !== null && days <= 0) return false;
    }
    if (filterLicense === "expired") {
      const days = getDaysRemaining(p);
      if (days === null && p.license_status !== "expired") return false;
      if (days !== null && days > 0) return false;
    }
    if (filterLicense === "suspended" && p.license_status !== "suspended") return false;
    if (filterLicense === "lifetime" && p.license_status !== "lifetime") return false;
    if (filterLicense === "expiring") {
      const days = getDaysRemaining(p);
      if (days === null || days > 7 || days <= 0) return false;
    }
    if (filterLicense === "no_premium") {
      const usage = premiumUsage[p.user_id];
      if (!usage || usage.reviews_used < usage.quota_limit) return false;
    }
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      if (!(p.full_name || "").toLowerCase().includes(s) && !p.user_id.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Stats
  const totalActive = profiles.filter(p => {
    const d = getDaysRemaining(p);
    return p.status === "approved" && (p.license_status === "lifetime" || p.license_status === "active") && (d === null || d > 0);
  }).length;
  const totalExpired = profiles.filter(p => { const d = getDaysRemaining(p); return d !== null && d <= 0; }).length;
  const totalExpiring = profiles.filter(p => { const d = getDaysRemaining(p); return d !== null && d > 0 && d <= 7; }).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Totale utenti</p>
          <p className="text-xl font-bold text-foreground">{profiles.length}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Licenze attive</p>
          <p className="text-xl font-bold text-success">{totalActive}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">In scadenza (7g)</p>
          <p className={cn("text-xl font-bold", totalExpiring > 0 ? "text-amber-500" : "text-foreground")}>{totalExpiring}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Scadute</p>
          <p className={cn("text-xl font-bold", totalExpired > 0 ? "text-destructive" : "text-foreground")}>{totalExpired}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cerca utente..." className="h-8 text-xs w-[200px]" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="approved">Approvati</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Sospesi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLicense} onValueChange={setFilterLicense}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Licenza" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            <SelectItem value="active">Attive</SelectItem>
            <SelectItem value="expired">Scadute</SelectItem>
            <SelectItem value="expiring">In scadenza</SelectItem>
            <SelectItem value="suspended">Sospese</SelectItem>
            <SelectItem value="lifetime">Lifetime</SelectItem>
            <SelectItem value="no_premium">Quota esaurita</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} utenti</p>

      {/* User list */}
      {filtered.map((p) => {
        const days = getDaysRemaining(p);
        const usage = premiumUsage[p.user_id];
        const isExpanded = expandedUser === p.user_id;

        return (
          <div key={p.id} className={cn("card-premium transition-all", isExpanded && "border-primary/30")}>
            {/* Summary row */}
            <button className="w-full p-4 text-left" onClick={() => setExpandedUser(isExpanded ? null : p.user_id)}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{p.full_name || "N/A"}</p>
                    <Badge className={statusColor(p.status)} >{p.status}</Badge>
                    <Badge className={getLicenseColor(p)}>{getLicenseLabel(p)}</Badge>
                    {usage && (
                      <Badge variant="outline" className="text-[10px]">
                        <Crown className="h-2.5 w-2.5 mr-0.5 text-amber-500" />
                        {usage.reviews_used}/{usage.quota_limit}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.user_id.slice(0, 12)}...
                    {p.access_expires_at && ` · Scade: ${new Date(p.access_expires_at).toLocaleDateString("it-IT")}`}
                  </p>
                </div>
                <ChevronLeft className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "-rotate-90")} />
              </div>
            </button>

            {/* Expanded management panel */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4 animate-fade-in">
                {/* Account status */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Stato Account</Label>
                  <div className="flex flex-wrap gap-2">
                    {p.status !== "approved" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(p.user_id, "approved")}>
                        <Check className="h-3 w-3 mr-1" /> Approva
                      </Button>
                    )}
                    {p.status !== "suspended" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(p.user_id, "suspended")}>
                        <Pause className="h-3 w-3 mr-1" /> Sospendi Account
                      </Button>
                    )}
                    {p.status === "suspended" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(p.user_id, "approved")}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Riattiva Account
                      </Button>
                    )}
                  </div>
                </div>

                {/* License management */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Gestione Licenza</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="card-premium p-2">
                      <p className="text-[10px] text-muted-foreground">Stato</p>
                      <p className="text-xs font-medium text-foreground">{p.license_status || "active"}</p>
                    </div>
                    <div className="card-premium p-2">
                      <p className="text-[10px] text-muted-foreground">Inizio</p>
                      <p className="text-xs font-medium text-foreground">
                        {p.access_started_at ? new Date(p.access_started_at).toLocaleDateString("it-IT") : "—"}
                      </p>
                    </div>
                    <div className="card-premium p-2">
                      <p className="text-[10px] text-muted-foreground">Scadenza</p>
                      <p className="text-xs font-medium text-foreground">
                        {p.access_expires_at ? new Date(p.access_expires_at).toLocaleDateString("it-IT") : "∞"}
                      </p>
                    </div>
                    <div className="card-premium p-2">
                      <p className="text-[10px] text-muted-foreground">Giorni rimasti</p>
                      <p className={cn("text-xs font-medium", days !== null && days <= 0 ? "text-destructive" : days !== null && days <= 7 ? "text-amber-500" : "text-foreground")}>
                        {days !== null ? (days <= 0 ? "Scaduta" : days) : "∞"}
                      </p>
                    </div>
                  </div>

                  {/* Duration presets */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Label className="text-xs text-muted-foreground w-full">Imposta durata:</Label>
                    {[7, 14, 30, 60, 90].map(d => (
                      <Button key={d} size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLicenseDuration(p.user_id, d)}>
                        {d}g
                      </Button>
                    ))}
                    <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary" onClick={() => setLifetime(p.user_id)}>
                      <Infinity className="h-3 w-3 mr-1" />Lifetime
                    </Button>
                  </div>

                  {/* Extend */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Label className="text-xs text-muted-foreground w-full">Estendi licenza:</Label>
                    {[7, 30].map(d => (
                      <Button key={d} size="sm" variant="outline" className="h-7 text-xs" onClick={() => extendLicense(p.user_id, d)}>
                        +{d}g
                      </Button>
                    ))}
                  </div>

                  {/* Custom date */}
                  <div className="flex items-center gap-2 mb-3">
                    <Label className="text-xs text-muted-foreground">Scadenza manuale:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Calendar className="h-3 w-3 mr-1" />Seleziona data
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={p.access_expires_at ? new Date(p.access_expires_at) : undefined}
                          onSelect={(date) => { if (date) setCustomExpiry(p.user_id, date); }}
                          disabled={(date) => date < new Date()}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Suspend / reactivate license */}
                  <div className="flex gap-2">
                    {p.license_status !== "suspended" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => suspendLicense(p.user_id)}>
                        <Pause className="h-3 w-3 mr-1" />Sospendi licenza
                      </Button>
                    )}
                    {p.license_status === "suspended" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-success" onClick={() => reactivateLicense(p.user_id)}>
                        <RefreshCw className="h-3 w-3 mr-1" />Riattiva licenza
                      </Button>
                    )}
                  </div>
                </div>

                {/* Premium quota management */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                    <Crown className="h-3 w-3 inline mr-1 text-amber-500" />Quota Premium Review
                  </Label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="card-premium p-2">
                      <p className="text-[10px] text-muted-foreground">Usate</p>
                      <p className="text-xs font-bold text-foreground">{usage?.reviews_used ?? 0}</p>
                    </div>
                    <div className="card-premium p-2">
                      <p className="text-[10px] text-muted-foreground">Quota</p>
                      <p className="text-xs font-bold text-foreground">{usage?.quota_limit ?? 3}</p>
                    </div>
                    <div className="card-premium p-2">
                      <p className="text-[10px] text-muted-foreground">Residue</p>
                      <p className={cn("text-xs font-bold", (usage && usage.reviews_used >= usage.quota_limit) ? "text-destructive" : "text-success")}>
                        {usage ? Math.max(0, usage.quota_limit - usage.reviews_used) : 3}
                      </p>
                    </div>
                  </div>

                  {/* Quota presets */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Label className="text-xs text-muted-foreground w-full">Imposta quota mensile:</Label>
                    {[0, 3, 5, 10, 20].map(q => (
                      <Button key={q} size="sm" variant="outline" className="h-7 text-xs" onClick={() => updatePremiumQuota(p.user_id, q)}>
                        {q}
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resetPremiumUsage(p.user_id)}>
                      <RefreshCw className="h-3 w-3 mr-1" />Reset utilizzo
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addExtraReviews(p.user_id, 3)}>
                      <Plus className="h-3 w-3 mr-1" />+3 extra
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addExtraReviews(p.user_id, 5)}>
                      <Plus className="h-3 w-3 mr-1" />+5 extra
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Courses Tab ----
function AdminCourses() {
  const [categories, setCategories] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatTitle, setNewCatTitle] = useState("");
  const [newModTitle, setNewModTitle] = useState("");
  const [newModCat, setNewModCat] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonMod, setNewLessonMod] = useState("");
  const [newLessonVideo, setNewLessonVideo] = useState("");

  const load = async () => {
    const [c, m, l] = await Promise.all([
      supabase.from("course_categories").select("*").order("sort_order"),
      supabase.from("course_modules").select("*").order("sort_order"),
      supabase.from("course_lessons").select("*").order("sort_order"),
    ]);
    if (c.data) setCategories(c.data);
    if (m.data) setModules(m.data);
    if (l.data) setLessons(l.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    if (!newCatTitle.trim()) return;
    await supabase.from("course_categories").insert({ title: newCatTitle.trim(), sort_order: categories.length });
    setNewCatTitle("");
    toast.success("Categoria creata");
    load();
  };

  const addModule = async () => {
    if (!newModTitle.trim() || !newModCat) return;
    const catModules = modules.filter(m => m.category_id === newModCat);
    await supabase.from("course_modules").insert({ title: newModTitle.trim(), category_id: newModCat, sort_order: catModules.length });
    setNewModTitle("");
    toast.success("Modulo creato");
    load();
  };

  const addLesson = async () => {
    if (!newLessonTitle.trim() || !newLessonMod) return;
    const modLessons = lessons.filter(l => l.module_id === newLessonMod);
    await supabase.from("course_lessons").insert({
      title: newLessonTitle.trim(),
      module_id: newLessonMod,
      video_url: newLessonVideo.trim() || null,
      sort_order: modLessons.length,
    });
    setNewLessonTitle("");
    setNewLessonVideo("");
    toast.success("Lezione creata");
    load();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("course_categories").delete().eq("id", id);
    toast.success("Categoria eliminata");
    load();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      {/* Add category */}
      <div className="card-premium p-4">
        <h3 className="font-medium text-foreground mb-3">Nuova categoria</h3>
        <div className="flex gap-2">
          <Input value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} placeholder="Nome categoria" />
          <Button onClick={addCategory} size="sm"><Plus className="h-4 w-4 mr-1" />Aggiungi</Button>
        </div>
      </div>

      {/* Add module */}
      {categories.length > 0 && (
        <div className="card-premium p-4">
          <h3 className="font-medium text-foreground mb-3">Nuovo modulo</h3>
          <div className="flex gap-2 flex-wrap">
            <Select value={newModCat} onValueChange={setNewModCat}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={newModTitle} onChange={(e) => setNewModTitle(e.target.value)} placeholder="Nome modulo" className="flex-1" />
            <Button onClick={addModule} size="sm"><Plus className="h-4 w-4 mr-1" />Aggiungi</Button>
          </div>
        </div>
      )}

      {/* Add lesson */}
      {modules.length > 0 && (
        <div className="card-premium p-4">
          <h3 className="font-medium text-foreground mb-3">Nuova lezione</h3>
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Select value={newLessonMod} onValueChange={setNewLessonMod}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Modulo" /></SelectTrigger>
                <SelectContent>
                  {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} placeholder="Titolo lezione" className="flex-1" />
            </div>
            <div className="flex gap-2">
              <Input value={newLessonVideo} onChange={(e) => setNewLessonVideo(e.target.value)} placeholder="URL video (opzionale)" className="flex-1" />
              <Button onClick={addLesson} size="sm"><Plus className="h-4 w-4 mr-1" />Aggiungi</Button>
            </div>
          </div>
        </div>
      )}

      {/* Existing categories/modules/lessons */}
      {categories.map(cat => (
        <div key={cat.id} className="card-premium p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground">{cat.title}</h3>
            <Button size="sm" variant="ghost" onClick={() => deleteCategory(cat.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
          {modules.filter(m => m.category_id === cat.id).map(mod => (
            <div key={mod.id} className="ml-4 mb-3">
              <p className="text-sm font-medium text-foreground mb-1">📁 {mod.title}</p>
              {lessons.filter(l => l.module_id === mod.id).map(les => (
                <p key={les.id} className="ml-4 text-sm text-muted-foreground">📄 {les.title}</p>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---- Support Tab ----
function AdminSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");

  const load = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const viewTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", ticket.id).order("created_at");
    if (data) setMessages(data);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    await supabase.from("support_messages").insert({
      ticket_id: selectedTicket.id,
      user_id: user!.id,
      message: reply.trim(),
      is_admin: true,
    });
    setReply("");
    viewTicket(selectedTicket);
  };

  const updateStatus = async (ticketId: string, status: string) => {
    await supabase.from("support_tickets").update({ status: status as any }).eq("id", ticketId);
    toast.success("Stato aggiornato");
    load();
    if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, status });
  };

  if (selectedTicket) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => setSelectedTicket(null)} className="text-sm text-primary hover:underline mb-4">← Torna ai ticket</button>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">{selectedTicket.subject}</h3>
          <Select value={selectedTicket.status} onValueChange={(v) => updateStatus(selectedTicket.id, v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aperto</SelectItem>
              <SelectItem value="pending">In attesa</SelectItem>
              <SelectItem value="resolved">Risolto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3 mb-4">
          {messages.map(msg => (
            <div key={msg.id} className={cn("card-premium p-3", msg.is_admin && "border-primary/20")}>
              <p className="text-xs font-medium text-muted-foreground mb-1">{msg.is_admin ? "Admin" : "Utente"} · {new Date(msg.created_at).toLocaleString("it-IT")}</p>
              <p className="text-sm text-foreground">{msg.message}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Rispondi..." onKeyDown={(e) => e.key === "Enter" && sendReply()} />
          <Button onClick={sendReply} size="sm">Invia</Button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-2">
      {tickets.length === 0 ? (
        <p className="text-muted-foreground text-center p-8">Nessun ticket</p>
      ) : tickets.map(t => (
        <button key={t.id} onClick={() => viewTicket(t)} className="w-full card-premium p-4 text-left hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t.subject}</p>
              <p className="text-xs text-muted-foreground">{t.category} · {new Date(t.created_at).toLocaleDateString("it-IT")}</p>
            </div>
            <Badge className={t.status === "resolved" ? "bg-success/10 text-success" : t.status === "open" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"}>
              {t.status}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

// ---- Reviews Tab (Enhanced) ----
function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, { useful: number; notUseful: number }>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [linkedReviews, setLinkedReviews] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAsset, setFilterAsset] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterRating, setFilterRating] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [premiumStats, setPremiumStats] = useState<{ total: number; byUser: Record<string, number> }>({ total: 0, byUser: {} });

  // Didactic form
  const [didacticTitle, setDidacticTitle] = useState("");
  const [didacticDesc, setDidacticDesc] = useState("");
  const [didacticTags, setDidacticTags] = useState("");

  const load = async () => {
    const { data } = await supabase.from("ai_chart_reviews").select("*").order("created_at", { ascending: false });
    if (data) {
      setReviews(data);
      // Compute premium stats
      const premiumReviews = data.filter((r: any) => r.review_tier === "premium");
      const byUser: Record<string, number> = {};
      premiumReviews.forEach((r: any) => { byUser[r.user_id] = (byUser[r.user_id] || 0) + 1; });
      setPremiumStats({ total: premiumReviews.length, byUser });

      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.full_name || "N/A"; });
          setProfiles(map);
        }
      }
      const reviewIds = data.map((r: any) => r.id);
      if (reviewIds.length > 0) {
        const { data: allRatings } = await supabase.from("ai_review_ratings" as any).select("*").in("review_id", reviewIds);
        if (allRatings) {
          const map: Record<string, { useful: number; notUseful: number }> = {};
          (allRatings as any[]).forEach((rt: any) => {
            if (!map[rt.review_id]) map[rt.review_id] = { useful: 0, notUseful: 0 };
            if (rt.is_useful) map[rt.review_id].useful++;
            else map[rt.review_id].notUseful++;
          });
          setRatings(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleDidactic = async (review: any) => {
    if (review.is_didactic_example) {
      // Remove didactic
      await supabase.from("ai_chart_reviews").update({
        is_didactic_example: false, didactic_title: null, didactic_description: null, didactic_tags: null, didactic_visible: false,
      } as any).eq("id", review.id);
      toast.success("Esempio didattico rimosso");
    } else {
      setSelectedReview(review);
      setDidacticTitle("");
      setDidacticDesc("");
      setDidacticTags("");
      return;
    }
    load();
  };

  const saveDidactic = async () => {
    if (!selectedReview || !didacticTitle.trim()) return;
    await supabase.from("ai_chart_reviews").update({
      is_didactic_example: true,
      didactic_title: didacticTitle.trim(),
      didactic_description: didacticDesc.trim() || null,
      didactic_tags: didacticTags.trim() ? didacticTags.split(",").map(t => t.trim()) : null,
      didactic_visible: true,
    } as any).eq("id", selectedReview.id);
    toast.success("Salvato come esempio didattico");
    setSelectedReview(null);
    load();
  };

  const viewLinked = async (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;
    setSelectedReview(review);
    const { data: children } = await supabase.from("ai_chart_reviews").select("*").eq("parent_review_id", reviewId);
    const linked: any[] = [];
    if (review.parent_review_id) {
      const { data: parent } = await supabase.from("ai_chart_reviews").select("*").eq("id", review.parent_review_id).single();
      if (parent) linked.push(parent);
    }
    if (children) linked.push(...children);
    setLinkedReviews(linked);
  };

  const filtered = reviews.filter(r => {
    if (filterAsset !== "all" && r.asset !== filterAsset) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterMode !== "all" && (r.review_mode || "pro") !== filterMode) return false;
    if (filterTier !== "all" && (r.review_tier || "standard") !== filterTier) return false;
    if (filterRating === "useful" && (!ratings[r.id] || ratings[r.id].useful === 0)) return false;
    if (filterRating === "not_useful" && (!ratings[r.id] || ratings[r.id].notUseful === 0)) return false;
    if (filterRating === "didactic" && !r.is_didactic_example) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!r.asset.toLowerCase().includes(s) && !r.request_type.toLowerCase().includes(s) &&
          !(r.user_note || "").toLowerCase().includes(s) && !(profiles[r.user_id] || "").toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortOrder === "desc" ? -d : d;
  });

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Didactic form modal
  if (selectedReview && !selectedReview.is_didactic_example && !linkedReviews.length) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => setSelectedReview(null)} className="text-sm text-primary hover:underline mb-4">← Indietro</button>
        <div className="card-premium p-6">
          <h3 className="font-medium text-foreground mb-4">
            <GraduationCap className="h-4 w-4 inline mr-1" /> Salva come esempio didattico
          </h3>
          <p className="text-xs text-muted-foreground mb-4">{selectedReview.asset} - {selectedReview.timeframe} · {selectedReview.request_type}</p>
          <div className="space-y-3">
            <div>
              <Label className="text-foreground">Titolo personalizzato *</Label>
              <Input value={didacticTitle} onChange={(e) => setDidacticTitle(e.target.value)} placeholder="Es: Setup SMC su EUR/USD H4" className="mt-1" />
            </div>
            <div>
              <Label className="text-foreground">Descrizione breve</Label>
              <Textarea value={didacticDesc} onChange={(e) => setDidacticDesc(e.target.value)} placeholder="Perché è un buon esempio..." className="mt-1" rows={3} />
            </div>
            <div>
              <Label className="text-foreground">Tag/Categoria (separati da virgola)</Label>
              <Input value={didacticTags} onChange={(e) => setDidacticTags(e.target.value)} placeholder="SMC, liquidity sweep, H4" className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedReview(null)}>Annulla</Button>
              <Button onClick={saveDidactic} disabled={!didacticTitle.trim()}>
                <Save className="h-4 w-4 mr-1" /> Salva
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detail view with linked reviews
  if (selectedReview && linkedReviews.length > 0) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => { setSelectedReview(null); setLinkedReviews([]); }} className="text-sm text-primary hover:underline mb-4">← Indietro</button>
        <h3 className="font-medium text-foreground mb-2">{selectedReview.asset} - {selectedReview.timeframe}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {profiles[selectedReview.user_id] || "N/A"} · {new Date(selectedReview.created_at).toLocaleString("it-IT")}
        </p>
        {selectedReview.user_note && (
          <div className="card-premium p-3 mb-4 border-primary/20">
            <p className="text-xs text-muted-foreground mb-1"><MessageSquare className="h-3 w-3 inline mr-1" />Nota utente</p>
            <p className="text-sm text-foreground">{selectedReview.user_note}</p>
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Review collegate ({linkedReviews.length})</h4>
        </div>
        <div className="space-y-2">
          {linkedReviews.map(lr => (
            <div key={lr.id} className="card-premium p-3">
              <p className="text-sm text-foreground">
                {lr.id === selectedReview.parent_review_id ? "⬆ Originale" : "⬇ Riesame"} · {lr.asset} - {lr.timeframe}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(lr.created_at).toLocaleDateString("it-IT")}</p>
              {lr.user_note && <p className="text-xs text-muted-foreground mt-1">📝 {lr.user_note}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Premium stats summary */}
      {premiumStats.total > 0 && (
        <div className="card-premium p-4 border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-foreground">📊 Statistiche Premium</span>
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
              {premiumStats.total} review premium totali
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(premiumStats.byUser).map(([uid, count]) => (
              <Badge key={uid} variant="secondary" className="text-[10px]">
                {profiles[uid] || uid.slice(0, 8)}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per asset, utente, nota..." className="h-8 text-xs" />
        </div>
        <Select value={filterAsset} onValueChange={setFilterAsset}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Asset" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {["EUR/USD","GBP/USD","USD/JPY","XAU/USD","BTC/USD","ETH/USD","US30","NAS100","SPX500"].map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="completed">Completata</SelectItem>
            <SelectItem value="pending">In attesa</SelectItem>
            <SelectItem value="failed">Fallita</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="useful">Più utili</SelectItem>
            <SelectItem value="not_useful">Meno utili</SelectItem>
            <SelectItem value="didactic">Didattici</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMode} onValueChange={setFilterMode}>
          <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}>
          <ArrowUpDown className="h-3 w-3 mr-1" />{sortOrder === "desc" ? "Recenti" : "Vecchie"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} review trovate</p>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center p-8">Nessuna review</p>
      ) : filtered.map(r => (
        <div key={r.id} className="card-premium p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{r.asset} - {r.timeframe}</p>
                {(r.review_tier || "standard") === "premium" && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">👑 Premium</Badge>}
                {(r.review_mode || "pro") === "easy" && <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">⚡ Easy</Badge>}
                {(r.review_mode || "pro") === "pro" && <Badge variant="outline" className="text-[10px]">Pro</Badge>}
                {r.is_didactic_example && <Badge className="bg-primary/10 text-primary text-[10px]"><GraduationCap className="h-2.5 w-2.5 mr-0.5" />Didattico</Badge>}
                {r.parent_review_id && <Badge variant="secondary" className="text-[10px]">🔗 Riesame</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {profiles[r.user_id] || r.user_id.slice(0, 8)} · {r.request_type} · {new Date(r.created_at).toLocaleDateString("it-IT")}
              </p>
              {r.user_note && <p className="text-xs text-muted-foreground mt-1 italic">📝 {r.user_note.slice(0, 80)}{r.user_note.length > 80 ? "..." : ""}</p>}
            </div>
            <div className="flex items-center gap-2">
              {ratings[r.id] && (
                <div className="flex items-center gap-1 text-[10px]">
                  <ThumbsUp className="h-2.5 w-2.5 text-success" />{ratings[r.id].useful}
                  <ThumbsDown className="h-2.5 w-2.5 text-destructive ml-1" />{ratings[r.id].notUseful}
                </div>
              )}
              {r.analysis?.qualita_setup != null && (
                <Badge variant="secondary" className="text-[10px]"><Star className="h-2.5 w-2.5 mr-0.5" />{r.analysis.qualita_setup}/10</Badge>
              )}
              <Badge className={r.status === "completed" ? "bg-success/10 text-success" : r.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}>
                {r.status}
              </Badge>
              {(r.parent_review_id || reviews.some(x => x.parent_review_id === r.id)) && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => viewLinked(r.id)}>
                  <Link2 className="h-3 w-3" />
                </Button>
              )}
              <Button size="sm" variant={r.is_didactic_example ? "default" : "outline"} className="h-7 text-xs" onClick={() => toggleDidactic(r)}>
                <GraduationCap className="h-3 w-3" />
              </Button>
              {r.is_didactic_example && (
                <Button
                  size="sm"
                  variant={r.didactic_visible ? "default" : "outline"}
                  className={cn("h-7 text-xs", r.didactic_visible ? "bg-success hover:bg-success/90" : "")}
                  onClick={async () => {
                    await supabase.from("ai_chart_reviews").update({ didactic_visible: !r.didactic_visible } as any).eq("id", r.id);
                    toast.success(r.didactic_visible ? "Nascosto dalla libreria" : "Visibile nella libreria");
                    load();
                  }}
                >
                  {r.didactic_visible ? "Visibile" : "Nascosto"}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Announcements Tab ----
function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (data) setAnnouncements(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim() || !content.trim()) return;
    await supabase.from("announcements").insert({ title: title.trim(), content: content.trim() });
    setTitle("");
    setContent("");
    toast.success("Annuncio creato");
    load();
  };

  const toggle = async (id: string, current: boolean) => {
    await supabase.from("announcements").update({ is_active: !current }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    toast.success("Annuncio eliminato");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="card-premium p-4">
        <h3 className="font-medium text-foreground mb-3">Nuovo annuncio</h3>
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" />
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenuto" />
          <Button onClick={create} size="sm"><Plus className="h-4 w-4 mr-1" />Pubblica</Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : announcements.map(a => (
        <div key={a.id} className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{a.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{a.content}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={a.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}>
              {a.is_active ? "Attivo" : "Inattivo"}
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => toggle(a.id, a.is_active)}>
              {a.is_active ? <Pause className="h-3 w-3" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- AI Chat Tab ----
function AdminAIChat() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<string>("all");

  const load = async () => {
    const { data } = await supabase
      .from("ai_chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) {
      setConversations(data);
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.full_name || "N/A"; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const viewConv = async (conv: any) => {
    setSelectedConv(conv);
    const { data } = await supabase
      .from("ai_chat_messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at");
    if (data) setMessages(data);
  };

  const modeLabel = (m: string) => {
    switch (m) {
      case "trading_questions": return "Trading";
      case "setup_evaluation": return "Setup";
      case "method_support": return "Metodo";
      default: return m;
    }
  };

  const filtered = filterMode === "all" ? conversations : conversations.filter(c => c.mode === filterMode);

  if (selectedConv) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => setSelectedConv(null)} className="text-sm text-primary hover:underline mb-4 flex items-center gap-1">
          <ChevronLeft className="h-3 w-3" /> Torna alle conversazioni
        </button>
        <div className="mb-4">
          <h3 className="font-medium text-foreground">{selectedConv.title}</h3>
          <p className="text-xs text-muted-foreground">
            {profiles[selectedConv.user_id] || "N/A"} · {modeLabel(selectedConv.mode)} · {new Date(selectedConv.created_at).toLocaleString("it-IT")}
          </p>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {messages.map((msg: any) => (
            <div key={msg.id} className={cn("card-premium p-3", msg.role === "assistant" && "border-primary/20")}>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {msg.role === "assistant" ? "🤖 AI" : "👤 Utente"} · {new Date(msg.created_at).toLocaleString("it-IT")}
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["all", "trading_questions", "setup_evaluation", "method_support"].map(m => (
          <Button key={m} size="sm" variant={filterMode === m ? "default" : "outline"} onClick={() => setFilterMode(m)}>
            {m === "all" ? "Tutte" : modeLabel(m)}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center p-8">Nessuna conversazione AI</p>
      ) : filtered.map(c => (
        <button key={c.id} onClick={() => viewConv(c)} className="w-full card-premium p-4 text-left hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {profiles[c.user_id] || c.user_id.slice(0, 8)} · {modeLabel(c.mode)} · {new Date(c.updated_at).toLocaleDateString("it-IT")}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px]">{modeLabel(c.mode)}</Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

// ---- Admin Trading Accounts Tab ----
function AdminAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [journalCount, setJournalCount] = useState<Record<string, number>>({});
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("trading_accounts").select("*").order("created_at", { ascending: false });
    if (data) {
      setAccounts(data);
      const userIds = [...new Set(data.map((a: any) => a.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.full_name || "N/A"; });
          setProfiles(map);
        }
      }
      const accIds = data.map((a: any) => a.id);
      if (accIds.length > 0) {
        const { data: journals } = await supabase.from("trade_journal_entries").select("account_id").in("account_id", accIds);
        if (journals) {
          const counts: Record<string, number> = {};
          journals.forEach((j: any) => { counts[j.account_id] = (counts[j.account_id] || 0) + 1; });
          setJournalCount(counts);
        }
        const { data: logs } = await supabase.from("account_sync_logs").select("*").in("account_id", accIds).order("started_at", { ascending: false }).limit(10);
        if (logs) setSyncLogs(logs);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case "connected": return "bg-success/10 text-success";
      case "syncing": return "bg-info/10 text-info";
      case "pending": return "bg-warning/10 text-warning";
      case "failed": return "bg-destructive/10 text-destructive";
      default: return "bg-secondary text-muted-foreground";
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const userCounts: Record<string, number> = {};
  accounts.forEach((a) => { userCounts[a.user_id] = (userCounts[a.user_id] || 0) + 1; });
  const failedSyncs = syncLogs.filter(l => l.status === "failed").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Conti totali</p>
          <p className="text-xl font-bold text-foreground">{accounts.length}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Utenti con conti</p>
          <p className="text-xl font-bold text-foreground">{Object.keys(userCounts).length}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Connessi</p>
          <p className="text-xl font-bold text-success">{accounts.filter(a => a.connection_status === "connected").length}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Errori sync</p>
          <p className={cn("text-xl font-bold", failedSyncs > 0 ? "text-destructive" : "text-foreground")}>{failedSyncs}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Journaling totali</p>
          <p className="text-xl font-bold text-foreground">{Object.values(journalCount).reduce((a, b) => a + b, 0)}</p>
        </div>
      </div>

      {/* Recent sync logs */}
      {syncLogs.length > 0 && (
        <div className="card-premium p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Ultimi sync</h4>
          <div className="space-y-1">
            {syncLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[10px]",
                    log.status === "completed" ? "bg-success/10 text-success" :
                    log.status === "running" ? "bg-info/10 text-info" :
                    "bg-destructive/10 text-destructive"
                  )}>{log.status}</Badge>
                  <span className="text-muted-foreground">{log.sync_type}</span>
                </div>
                <div className="text-muted-foreground">
                  {new Date(log.started_at).toLocaleString("it-IT")}
                  {log.trades_synced > 0 && <span className="text-success ml-1">+{log.trades_synced}</span>}
                  {log.error_message && <span className="text-destructive ml-1">⚠</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-center p-8">Nessun conto collegato</p>
      ) : accounts.map(a => (
        <div key={a.id} className="card-premium p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{a.account_name}</p>
                <Badge className={statusColor(a.connection_status)}>{a.connection_status}</Badge>
                <Badge variant="outline" className="text-[10px]">{a.platform}</Badge>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">{a.provider_type || "mock"}</Badge>
                {a.sync_status === "error" && <Badge className="bg-destructive/10 text-destructive text-[10px]">Sync error</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {profiles[a.user_id] || a.user_id.slice(0, 8)} · {a.broker || "—"} · {a.account_number || "—"}
              </p>
              {a.last_sync_error && <p className="text-[10px] text-destructive mt-0.5">⚠ {a.last_sync_error}</p>}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Balance: ${Number(a.balance).toLocaleString()}</p>
              {a.last_sync_at && <p>Ultimo sync: {new Date(a.last_sync_at).toLocaleString("it-IT")}</p>}
              {a.last_successful_sync_at && <p className="text-success">OK: {new Date(a.last_successful_sync_at).toLocaleDateString("it-IT")}</p>}
              {journalCount[a.id] && <p>{journalCount[a.id]} journal</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- AI Costs & Limits Tab ----
function AdminAICosts() {
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [limits, setLimits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"month" | "week" | "today">("month");

  const getPeriodStart = () => {
    const now = new Date();
    if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    if (period === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  };

  const load = async () => {
    setLoading(true);
    const since = getPeriodStart();

    const { data: logs } = await supabase
      .from("ai_usage_log")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (logs) {
      setUsageLogs(logs);
      const userIds = [...new Set(logs.map((l: any) => l.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.full_name || "N/A"; });
          setProfiles(map);
        }
      }
    }

    const { data: limitsData } = await supabase.from("ai_usage_limits").select("*").order("limit_type");
    if (limitsData) setLimits(limitsData);

    setLoading(false);
  };

  useEffect(() => { load(); }, [period]);

  // Computed stats
  const totalRequests = usageLogs.length;
  const totalCost = usageLogs.reduce((sum, l) => sum + Number(l.estimated_cost || 0), 0);

  const byFunction: Record<string, { count: number; cost: number }> = {};
  const byModel: Record<string, { count: number; cost: number }> = {};
  const byUser: Record<string, { count: number; cost: number }> = {};

  usageLogs.forEach((l) => {
    const fn = l.function_type;
    if (!byFunction[fn]) byFunction[fn] = { count: 0, cost: 0 };
    byFunction[fn].count++;
    byFunction[fn].cost += Number(l.estimated_cost || 0);

    const m = l.model;
    if (!byModel[m]) byModel[m] = { count: 0, cost: 0 };
    byModel[m].count++;
    byModel[m].cost += Number(l.estimated_cost || 0);

    const u = l.user_id;
    if (!byUser[u]) byUser[u] = { count: 0, cost: 0 };
    byUser[u].count++;
    byUser[u].cost += Number(l.estimated_cost || 0);
  });

  const topUsers = Object.entries(byUser)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .slice(0, 10);

  const functionLabels: Record<string, string> = {
    chat: "AI Assistant",
    chart_review_standard: "Chart Review Standard",
    chart_review_premium: "Chart Review Premium",
  };

  const modelShort = (m: string) => m.replace("google/", "").replace("openai/", "");

  // Limits management
  const globalLimits = limits.filter(l => !l.user_id);
  const userLimits = limits.filter(l => l.user_id);

  const updateLimit = async (id: string, value: number) => {
    await supabase.from("ai_usage_limits").update({ limit_value: value, updated_at: new Date().toISOString() } as any).eq("id", id);
    toast.success("Limite aggiornato");
    load();
  };

  const toggleLimit = async (id: string, active: boolean) => {
    await supabase.from("ai_usage_limits").update({ is_active: !active, updated_at: new Date().toISOString() } as any).eq("id", id);
    toast.success(active ? "Limite disattivato" : "Limite attivato");
    load();
  };

  const limitTypeLabels: Record<string, string> = {
    chat_daily: "Chat AI / giorno",
    chart_review_standard_daily: "Review Standard / giorno",
    chart_review_standard_monthly: "Review Standard / mese",
    chart_review_premium_monthly: "Review Premium / mese",
  };

  // Check which users hit limits today
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayLogs = usageLogs.filter(l => l.created_at >= todayStart);
  const todayByUser: Record<string, Record<string, number>> = {};
  todayLogs.forEach(l => {
    if (!todayByUser[l.user_id]) todayByUser[l.user_id] = {};
    todayByUser[l.user_id][l.function_type] = (todayByUser[l.user_id][l.function_type] || 0) + 1;
  });

  const usersAtLimit: { userId: string; limitType: string; used: number; max: number }[] = [];
  globalLimits.forEach(gl => {
    if (!gl.is_active) return;
    Object.entries(todayByUser).forEach(([uid, fns]) => {
      if (gl.limit_type === "chat_daily" && (fns["chat"] || 0) >= gl.limit_value) {
        usersAtLimit.push({ userId: uid, limitType: gl.limit_type, used: fns["chat"], max: gl.limit_value });
      }
      if (gl.limit_type === "chart_review_standard_daily" && (fns["chart_review_standard"] || 0) >= gl.limit_value) {
        usersAtLimit.push({ userId: uid, limitType: gl.limit_type, used: fns["chart_review_standard"], max: gl.limit_value });
      }
    });
  });

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(["today", "week", "month"] as const).map(p => (
          <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
            {p === "today" ? "Oggi" : p === "week" ? "7 giorni" : "Mese"}
          </Button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Richieste totali</p>
          <p className="text-xl font-bold text-foreground">{totalRequests}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Costo stimato</p>
          <p className="text-xl font-bold text-primary">${totalCost.toFixed(4)}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Utenti attivi</p>
          <p className="text-xl font-bold text-foreground">{Object.keys(byUser).length}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Costo medio/utente</p>
          <p className="text-xl font-bold text-foreground">
            ${Object.keys(byUser).length > 0 ? (totalCost / Object.keys(byUser).length).toFixed(4) : "0"}
          </p>
        </div>
      </div>

      {/* By function */}
      <div className="card-premium p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">📊 Per funzione</h4>
        <div className="space-y-2">
          {Object.entries(byFunction).map(([fn, stats]) => (
            <div key={fn} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{functionLabels[fn] || fn}</Badge>
              </div>
              <div className="text-right text-xs">
                <span className="text-foreground font-medium">{stats.count} richieste</span>
                <span className="text-muted-foreground ml-2">${stats.cost.toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By model */}
      <div className="card-premium p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">🤖 Per modello</h4>
        <div className="space-y-2">
          {Object.entries(byModel).map(([model, stats]) => (
            <div key={model} className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">{modelShort(model)}</Badge>
              <div className="text-right text-xs">
                <span className="text-foreground font-medium">{stats.count} richieste</span>
                <span className="text-muted-foreground ml-2">${stats.cost.toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top users */}
      <div className="card-premium p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">👤 Top utenti per costo</h4>
        <div className="space-y-2">
          {topUsers.map(([uid, stats], i) => (
            <div key={uid} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <span className="text-sm text-foreground">{profiles[uid] || uid.slice(0, 12)}</span>
              </div>
              <div className="text-right text-xs">
                <span className="text-foreground font-medium">{stats.count} req</span>
                <span className="text-muted-foreground ml-2">${stats.cost.toFixed(4)}</span>
              </div>
            </div>
          ))}
          {topUsers.length === 0 && <p className="text-xs text-muted-foreground">Nessun dato</p>}
        </div>
      </div>

      {/* Users at limit */}
      {usersAtLimit.length > 0 && (
        <div className="card-premium p-4 border-amber-500/20">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Utenti al limite (oggi)
          </h4>
          <div className="space-y-2">
            {usersAtLimit.map((ul, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{profiles[ul.userId] || ul.userId.slice(0, 12)}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{limitTypeLabels[ul.limitType] || ul.limitType}</Badge>
                  <span className="text-destructive font-medium">{ul.used}/{ul.max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global limits management */}
      <div className="card-premium p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">⚙️ Limiti globali</h4>
        <div className="space-y-3">
          {globalLimits.map(gl => (
            <div key={gl.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Badge className={gl.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"} >
                  {gl.is_active ? "ON" : "OFF"}
                </Badge>
                <span className="text-sm text-foreground">{limitTypeLabels[gl.limit_type] || gl.limit_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-20 h-8 text-xs"
                  defaultValue={gl.limit_value}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value);
                    if (v > 0 && v !== gl.limit_value) updateLimit(gl.id, v);
                  }}
                />
                <Button size="sm" variant="ghost" className="h-8" onClick={() => toggleLimit(gl.id, gl.is_active)}>
                  {gl.is_active ? <Pause className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-user limit overrides */}
      <div className="card-premium p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">👤 Limiti personalizzati per utente</h4>
        {userLimits.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun limite personalizzato. I limiti globali si applicano a tutti.</p>
        ) : (
          <div className="space-y-2">
            {userLimits.map(ul => (
              <div key={ul.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-foreground">{profiles[ul.user_id] || ul.user_id.slice(0, 12)}</span>
                  <Badge variant="outline" className="text-[10px]">{limitTypeLabels[ul.limit_type] || ul.limit_type}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20 h-7 text-xs"
                    defaultValue={ul.limit_value}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value);
                      if (v > 0 && v !== ul.limit_value) updateLimit(ul.id, v);
                    }}
                  />
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => toggleLimit(ul.id, ul.is_active)}>
                    {ul.is_active ? <Pause className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={async () => {
                    await supabase.from("ai_usage_limits").delete().eq("id", ul.id);
                    toast.success("Limite rimosso");
                    load();
                  }}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Requests Management Tab ----
function AdminRequests() {
  const [accountRequests, setAccountRequests] = useState<any[]>([]);
  const [brokerRequests, setBrokerRequests] = useState<any[]>([]);
  const [supportedBrokers, setSupportedBrokers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const [ar, br, sb, pr] = await Promise.all([
      supabase.from("account_connection_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("broker_support_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("supported_brokers").select("*").order("name"),
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    if (ar.data) setAccountRequests(ar.data);
    if (br.data) setBrokerRequests(br.data);
    if (sb.data) setSupportedBrokers(sb.data);
    if (pr.data) {
      const map: Record<string, string> = {};
      pr.data.forEach((p: any) => { map[p.user_id] = p.full_name || p.user_id.slice(0, 12); });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAccountRequest = async (id: string, status: string, userId: string) => {
    const note = adminNotes[id] || null;
    await supabase.from("account_connection_requests").update({
      status,
      admin_note: note,
      reviewed_at: new Date().toISOString(),
    } as any).eq("id", id);

    if (status === "approved") {
      // Increase user's account limit
      const { data: existing } = await supabase.from("user_account_limits").select("*").eq("user_id", userId).single();
      if (existing) {
        await supabase.from("user_account_limits").update({ max_accounts: (existing as any).max_accounts + 1 } as any).eq("id", (existing as any).id);
      } else {
        await supabase.from("user_account_limits").insert({ user_id: userId, max_accounts: 2 } as any);
      }
      toast.success("Richiesta approvata. Limite conti utente aumentato.");
    } else {
      toast.success("Richiesta rifiutata.");
    }
    load();
  };

  const handleBrokerRequest = async (id: string, status: string, action: "global" | "user_only", userId: string, brokerName: string) => {
    const note = adminNotes[id] || null;
    
    if (status === "approved" && action === "global") {
      // Add broker globally
      const { data: newBroker } = await supabase.from("supported_brokers").insert({
        name: brokerName,
        platforms: ["MT4", "MT5"],
      } as any).select().single();
      
      await supabase.from("broker_support_requests").update({
        status,
        admin_note: note,
        approved_broker_id: newBroker ? (newBroker as any).id : null,
        reviewed_at: new Date().toISOString(),
      } as any).eq("id", id);
      toast.success(`Broker "${brokerName}" aggiunto come supportato globalmente.`);
    } else if (status === "approved" && action === "user_only") {
      // Add user-specific override
      await supabase.from("user_broker_overrides").insert({
        user_id: userId,
        broker_name: brokerName,
      } as any);
      await supabase.from("broker_support_requests").update({
        status,
        admin_note: note,
        reviewed_at: new Date().toISOString(),
      } as any).eq("id", id);
      toast.success(`Broker "${brokerName}" autorizzato solo per questo utente.`);
    } else {
      await supabase.from("broker_support_requests").update({
        status,
        admin_note: note,
        reviewed_at: new Date().toISOString(),
      } as any).eq("id", id);
      toast.success("Richiesta rifiutata.");
    }
    load();
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-success/10 text-success text-[10px]">Approvata</Badge>;
    if (s === "rejected") return <Badge className="bg-destructive/10 text-destructive text-[10px]">Rifiutata</Badge>;
    return <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">In attesa</Badge>;
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const pendingAccountReqs = accountRequests.filter(r => r.status === "pending").length;
  const pendingBrokerReqs = brokerRequests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Richieste conti</p>
          <p className="text-xl font-bold text-foreground">{accountRequests.length}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Conti in attesa</p>
          <p className={cn("text-xl font-bold", pendingAccountReqs > 0 ? "text-amber-500" : "text-foreground")}>{pendingAccountReqs}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Richieste broker</p>
          <p className="text-xl font-bold text-foreground">{brokerRequests.length}</p>
        </div>
        <div className="card-premium p-3">
          <p className="text-xs text-muted-foreground">Broker in attesa</p>
          <p className={cn("text-xl font-bold", pendingBrokerReqs > 0 ? "text-amber-500" : "text-foreground")}>{pendingBrokerReqs}</p>
        </div>
      </div>

      {/* Supported Brokers Management */}
      <div className="card-premium p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">🏦 Broker supportati</h4>
        <div className="space-y-2">
          {supportedBrokers.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge className={b.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}>
                  {b.is_active ? "Attivo" : "Disattivato"}
                </Badge>
                <span className="text-foreground font-medium">{b.name}</span>
                <span className="text-xs text-muted-foreground">{(b.platforms || []).join(", ")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Connection Requests */}
      <div className="card-premium p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">📋 Richieste conti aggiuntivi</h4>
        {accountRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessuna richiesta.</p>
        ) : (
          <div className="space-y-3">
            {accountRequests.map((r: any) => (
              <div key={r.id} className={cn("card-premium p-3", r.status === "pending" && "border-amber-500/30")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{profiles[r.user_id] || r.user_id.slice(0, 12)}</span>
                    {statusBadge(r.status)}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("it-IT")}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2">
                  <div><span className="text-muted-foreground">Broker:</span> <span className="text-foreground">{r.broker}</span></div>
                  <div><span className="text-muted-foreground">Piattaforma:</span> <span className="text-foreground">{r.platform}</span></div>
                  <div><span className="text-muted-foreground">Server:</span> <span className="text-foreground">{r.server || "—"}</span></div>
                  <div><span className="text-muted-foreground">Tipo:</span> <span className="text-foreground">{r.account_type || "—"}</span></div>
                </div>
                {r.note && <p className="text-xs text-muted-foreground mb-2">📝 {r.note}</p>}
                {r.admin_note && <p className="text-xs text-primary mb-2">💬 Admin: {r.admin_note}</p>}
                {r.status === "pending" && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Input
                      placeholder="Nota admin (opzionale)"
                      className="h-7 text-xs flex-1 min-w-[150px]"
                      value={adminNotes[r.id] || ""}
                      onChange={(e) => setAdminNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleAccountRequest(r.id, "approved", r.user_id)}>
                      <Check className="h-3 w-3 mr-1" />Approva
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleAccountRequest(r.id, "rejected", r.user_id)}>
                      <X className="h-3 w-3 mr-1" />Rifiuta
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broker Support Requests */}
      <div className="card-premium p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">🆕 Richieste nuovi broker</h4>
        {brokerRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessuna richiesta.</p>
        ) : (
          <div className="space-y-3">
            {brokerRequests.map((r: any) => (
              <div key={r.id} className={cn("card-premium p-3", r.status === "pending" && "border-amber-500/30")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{profiles[r.user_id] || r.user_id.slice(0, 12)}</span>
                    {statusBadge(r.status)}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("it-IT")}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2">
                  <div><span className="text-muted-foreground">Broker:</span> <span className="text-foreground font-medium">{r.broker_name}</span></div>
                  <div><span className="text-muted-foreground">Piattaforma:</span> <span className="text-foreground">{r.platform}</span></div>
                  <div><span className="text-muted-foreground">Server:</span> <span className="text-foreground">{r.server || "—"}</span></div>
                  <div><span className="text-muted-foreground">Link:</span> <span className="text-foreground">{r.reference_link ? "✅" : "—"}</span></div>
                </div>
                {r.note && <p className="text-xs text-muted-foreground mb-2">📝 {r.note}</p>}
                {r.admin_note && <p className="text-xs text-primary mb-2">💬 Admin: {r.admin_note}</p>}
                {r.status === "pending" && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Input
                      placeholder="Nota admin (opzionale)"
                      className="h-7 text-xs flex-1 min-w-[150px]"
                      value={adminNotes[r.id] || ""}
                      onChange={(e) => setAdminNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleBrokerRequest(r.id, "approved", "global", r.user_id, r.broker_name)}>
                      <Check className="h-3 w-3 mr-1" />Approva globale
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBrokerRequest(r.id, "approved", "user_only", r.user_id, r.broker_name)}>
                      <Check className="h-3 w-3 mr-1" />Solo utente
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleBrokerRequest(r.id, "rejected", "global", r.user_id, r.broker_name)}>
                      <X className="h-3 w-3 mr-1" />Rifiuta
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main Admin Page ----
export default function Admin() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Admin EasyProp</h1>
            <p className="text-sm text-muted-foreground">Gestione utenti, contenuti e richieste</p>
          </div>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-6 w-full flex flex-wrap gap-1 h-auto bg-secondary/50 p-1 rounded-lg">
            <TabsTrigger value="users" className="flex-1 min-w-[80px]"><Users className="h-3 w-3 mr-1" />Utenti</TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 min-w-[80px]"><Link2 className="h-3 w-3 mr-1" />Richieste</TabsTrigger>
            <TabsTrigger value="ai-costs" className="flex-1 min-w-[80px]"><BarChart3 className="h-3 w-3 mr-1" />Costi AI</TabsTrigger>
            <TabsTrigger value="courses" className="flex-1 min-w-[80px]"><BookOpen className="h-3 w-3 mr-1" />Corsi</TabsTrigger>
            <TabsTrigger value="support" className="flex-1 min-w-[80px]"><HeadphonesIcon className="h-3 w-3 mr-1" />Supporto</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 min-w-[80px]"><Star className="h-3 w-3 mr-1" />Reviews</TabsTrigger>
            <TabsTrigger value="ai-chat" className="flex-1 min-w-[80px]"><Bot className="h-3 w-3 mr-1" />AI Chat</TabsTrigger>
            <TabsTrigger value="accounts" className="flex-1 min-w-[80px]"><Wallet className="h-3 w-3 mr-1" />Conti</TabsTrigger>
            <TabsTrigger value="announcements" className="flex-1 min-w-[80px]"><Megaphone className="h-3 w-3 mr-1" />Annunci</TabsTrigger>
          </TabsList>

          <TabsContent value="users"><AdminUsers /></TabsContent>
          <TabsContent value="requests"><AdminRequests /></TabsContent>
          <TabsContent value="ai-costs"><AdminAICosts /></TabsContent>
          <TabsContent value="courses"><AdminCourses /></TabsContent>
          <TabsContent value="support"><AdminSupport /></TabsContent>
          <TabsContent value="reviews"><AdminReviews /></TabsContent>
          <TabsContent value="ai-chat"><AdminAIChat /></TabsContent>
          <TabsContent value="accounts"><AdminAccounts /></TabsContent>
          <TabsContent value="announcements"><AdminAnnouncements /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
