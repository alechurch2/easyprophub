import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield, Users, BookOpen, HeadphonesIcon, BarChart3, Megaphone, Bot,
  Loader2, Check, X, Pause, Plus, Trash2, Edit2, Save, ChevronLeft,
  ThumbsUp, ThumbsDown, Star, MessageSquare, Link2, GraduationCap, Search, ArrowUpDown, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---- Users Tab ----
function AdminUsers() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (userId: string, status: string) => {
    await supabase.from("profiles").update({ status: status as any }).eq("user_id", userId);
    toast.success("Stato aggiornato");
    load();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-success/10 text-success";
      case "pending": return "bg-warning/10 text-warning";
      case "suspended": return "bg-destructive/10 text-destructive";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-2">
      {profiles.map((p) => (
        <div key={p.id} className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{p.full_name || "N/A"}</p>
            <p className="text-xs text-muted-foreground">{p.user_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor(p.status)}>{p.status}</Badge>
            {p.status !== "approved" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus(p.user_id, "approved")}>
                <Check className="h-3 w-3 mr-1" /> Approva
              </Button>
            )}
            {p.status !== "suspended" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus(p.user_id, "suspended")}>
                <Pause className="h-3 w-3 mr-1" /> Sospendi
              </Button>
            )}
            {p.status === "suspended" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus(p.user_id, "pending")}>
                Riattiva
              </Button>
            )}
          </div>
        </div>
      ))}
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
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.full_name || "N/A"; });
          setProfiles(map);
        }
      }
      // Load all ratings
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

// ---- Main Admin Page ----
export default function Admin() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
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
            <TabsTrigger value="courses" className="flex-1 min-w-[80px]"><BookOpen className="h-3 w-3 mr-1" />Corsi</TabsTrigger>
            <TabsTrigger value="support" className="flex-1 min-w-[80px]"><HeadphonesIcon className="h-3 w-3 mr-1" />Supporto</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 min-w-[80px]"><BarChart3 className="h-3 w-3 mr-1" />Reviews</TabsTrigger>
            <TabsTrigger value="ai-chat" className="flex-1 min-w-[80px]"><Bot className="h-3 w-3 mr-1" />AI Chat</TabsTrigger>
            <TabsTrigger value="accounts" className="flex-1 min-w-[80px]"><Wallet className="h-3 w-3 mr-1" />Conti</TabsTrigger>
            <TabsTrigger value="announcements" className="flex-1 min-w-[80px]"><Megaphone className="h-3 w-3 mr-1" />Annunci</TabsTrigger>
          </TabsList>

          <TabsContent value="users"><AdminUsers /></TabsContent>
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
