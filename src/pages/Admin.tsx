import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield, Users, BookOpen, HeadphonesIcon, BarChart3, Megaphone, Bot,
  Loader2, Check, X, Pause, Plus, Trash2, Edit2, Save, ChevronLeft
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

// ---- Reviews Tab ----
function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("ai_chart_reviews").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setReviews(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-2">
      {reviews.length === 0 ? (
        <p className="text-muted-foreground text-center p-8">Nessuna review</p>
      ) : reviews.map(r => (
        <div key={r.id} className="card-premium p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{r.asset} - {r.timeframe}</p>
              <p className="text-xs text-muted-foreground">{r.request_type} · {new Date(r.created_at).toLocaleDateString("it-IT")}</p>
            </div>
            <Badge className={r.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{r.status}</Badge>
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
            <TabsTrigger value="users" className="flex-1 min-w-[100px]"><Users className="h-3 w-3 mr-1" />Utenti</TabsTrigger>
            <TabsTrigger value="courses" className="flex-1 min-w-[100px]"><BookOpen className="h-3 w-3 mr-1" />Corsi</TabsTrigger>
            <TabsTrigger value="support" className="flex-1 min-w-[100px]"><HeadphonesIcon className="h-3 w-3 mr-1" />Supporto</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 min-w-[100px]"><BarChart3 className="h-3 w-3 mr-1" />Reviews</TabsTrigger>
            <TabsTrigger value="ai-chat" className="flex-1 min-w-[100px]"><Bot className="h-3 w-3 mr-1" />AI Chat</TabsTrigger>
            <TabsTrigger value="announcements" className="flex-1 min-w-[100px]"><Megaphone className="h-3 w-3 mr-1" />Annunci</TabsTrigger>
          </TabsList>

          <TabsContent value="users"><AdminUsers /></TabsContent>
          <TabsContent value="courses"><AdminCourses /></TabsContent>
          <TabsContent value="support"><AdminSupport /></TabsContent>
          <TabsContent value="reviews"><AdminReviews /></TabsContent>
          <TabsContent value="ai-chat"><AdminAIChat /></TabsContent>
          <TabsContent value="announcements"><AdminAnnouncements /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
