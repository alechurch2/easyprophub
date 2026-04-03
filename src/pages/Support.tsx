import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HeadphonesIcon, Plus, MessageSquare, Loader2, ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
}

interface Message {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const FAQ_ITEMS = [
  { q: "Come posso accedere ai corsi?", a: "Dalla dashboard, clicca su 'Formazione' per accedere a tutti i moduli disponibili." },
  { q: "Come funziona l'AI Chart Review?", a: "Carica uno screenshot del tuo grafico, seleziona asset e timeframe, e riceverai un'analisi strutturata." },
  { q: "Come posso contattare il supporto?", a: "Puoi aprire un ticket direttamente da questa pagina compilando il form sottostante." },
  { q: "I miei dati sono al sicuro?", a: "Sì, tutti i dati sono protetti con crittografia e policy di accesso rigorose." },
];

const CATEGORIES = ["Generale", "Tecnico", "Formazione", "Fatturazione", "Altro"];

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Generale");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    loadTickets();
    trackEvent("support_opened", { page: "support", section: "support" });
  }, []);

  const loadTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setTickets(data);
    setLoading(false);
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setCreating(true);

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: user!.id, subject: subject.trim(), category })
      .select()
      .single();

    if (ticket) {
      await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        user_id: user!.id,
        message: message.trim(),
      });
      toast.success("Ticket creato con successo");
      setShowForm(false);
      setSubject("");
      setMessage("");
      loadTickets();
    } else {
      toast.error("Errore nella creazione del ticket");
    }
    setCreating(false);
  };

  const loadMessages = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at");
    if (data) setMessages(data);
    setLoadingMessages(false);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    await supabase.from("support_messages").insert({
      ticket_id: selectedTicket.id,
      user_id: user!.id,
      message: reply.trim(),
    });
    setReply("");
    loadMessages(selectedTicket);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-info/10 text-info border-info/20";
      case "pending": return "bg-warning/10 text-warning border-warning/20";
      case "resolved": return "bg-success/10 text-success border-success/20";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "open": return "Aperto";
      case "pending": return "In attesa";
      case "resolved": return "Risolto";
      default: return status;
    }
  };

  if (selectedTicket) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in">
          <button onClick={() => setSelectedTicket(null)} className="text-[11px] uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors mb-6">
            ← Torna ai ticket
          </button>

          <div className="card-elevated p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-xl font-bold text-foreground">{selectedTicket.subject}</h1>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/50 mt-2">
                  {selectedTicket.category} · {new Date(selectedTicket.created_at).toLocaleDateString("it-IT")}
                </p>
              </div>
              <Badge className={cn("border", statusColor(selectedTicket.status))}>{statusLabel(selectedTicket.status)}</Badge>
            </div>
          </div>

          {loadingMessages ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "rounded-xl p-4 transition-all",
                  msg.is_admin ? "card-elevated border-primary/10" : "panel-inset"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-[10px] uppercase tracking-widest font-medium", msg.is_admin ? "text-primary" : "text-muted-foreground/60")}>
                      {msg.is_admin ? "Supporto" : "Tu"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/40">
                      {new Date(msg.created_at).toLocaleString("it-IT")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
              ))}
            </div>
          )}

          {selectedTicket.status !== "resolved" && (
            <div className="flex gap-2">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Scrivi una risposta..."
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                className="flex-1"
              />
              <Button onClick={sendReply} size="icon" className="h-10 w-10">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                <HeadphonesIcon className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Help Center</p>
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Supporto</h1>
              </div>
            </div>
            <Button onClick={() => setShowForm(!showForm)} size="sm" variant="premium">
              <Plus className="h-4 w-4 mr-1.5" />
              Nuovo ticket
            </Button>
          </div>
          <div className="divider-fade mb-0 mt-4" />
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium mb-4">Domande frequenti</p>
          <div className="space-y-2">
            {FAQ_ITEMS.map((faq, i) => (
              <div key={i} className={cn("card-premium overflow-hidden transition-all duration-200", expandedFaq === i && "ring-1 ring-primary/20")}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left group"
                >
                  <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors">{faq.q}</span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground/40 transition-transform duration-200", expandedFaq === i && "rotate-180 text-primary")} />
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground/70 leading-relaxed border-t border-border/30 pt-3 mx-4">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* New ticket form */}
        {showForm && (
          <div className="card-elevated p-6 sm:p-8 mb-10 animate-fade-in">
            <div className="accent-line-top" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium mb-1">Nuovo ticket</p>
            <h2 className="font-heading font-semibold text-foreground mb-6">Apri una richiesta di supporto</h2>
            <form onSubmit={createTicket} className="space-y-5">
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/60">Oggetto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Descrivi brevemente il problema" className="mt-2" required />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/60">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/60">Messaggio</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descrivi il tuo problema nel dettaglio..." className="mt-2 min-h-[120px]" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
                <Button type="submit" variant="premium" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Invia ticket
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Ticket list */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium mb-4">I tuoi ticket</p>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground/60">Nessun ticket aperto</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => loadMessages(t)}
                  className="w-full card-premium p-4 sm:p-5 text-left hover:border-primary/20 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{t.subject}</h3>
                      <p className="text-[10px] font-mono text-muted-foreground/40 mt-1.5">
                        {t.category} · {new Date(t.created_at).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <Badge className={cn("border", statusColor(t.status))}>{statusLabel(t.status)}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
