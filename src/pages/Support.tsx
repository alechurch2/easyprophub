import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HeadphonesIcon, Plus, MessageSquare, Loader2, ChevronDown, Send, Paperclip } from "lucide-react";
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
      case "open": return "bg-info/10 text-info";
      case "pending": return "bg-warning/10 text-warning";
      case "resolved": return "bg-success/10 text-success";
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
        <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in">
          <button onClick={() => setSelectedTicket(null)} className="text-sm text-primary hover:underline mb-4">
            ← Torna ai ticket
          </button>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">{selectedTicket.subject}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTicket.category} · {new Date(selectedTicket.created_at).toLocaleDateString("it-IT")}
              </p>
            </div>
            <Badge className={statusColor(selectedTicket.status)}>{statusLabel(selectedTicket.status)}</Badge>
          </div>

          {loadingMessages ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("card-premium p-4", msg.is_admin && "border-primary/20")}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">
                      {msg.is_admin ? "Supporto" : "Tu"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString("it-IT")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
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
              />
              <Button onClick={sendReply} size="icon">
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
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <HeadphonesIcon className="h-5 w-5 text-info" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Supporto</h1>
              <p className="text-sm text-muted-foreground">Assistenza dedicata EasyProp — FAQ e ticket</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nuovo ticket
          </Button>
        </div>

        {/* FAQ */}
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Domande frequenti</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((faq, i) => (
              <div key={i} className="card-premium overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium text-foreground">{faq.q}</span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedFaq === i && "rotate-180")} />
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* New ticket form */}
        {showForm && (
          <div className="card-premium p-6 mb-8 animate-fade-in">
            <h2 className="font-heading font-semibold text-foreground mb-4">Apri un nuovo ticket</h2>
            <form onSubmit={createTicket} className="space-y-4">
              <div>
                <Label className="text-foreground">Oggetto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Descrivi brevemente il problema" className="mt-1.5" required />
              </div>
              <div>
                <Label className="text-foreground">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Messaggio</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descrivi il tuo problema nel dettaglio..." className="mt-1.5 min-h-[100px]" required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Invia ticket
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Ticket list */}
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">I tuoi ticket</h2>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="card-premium p-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nessun ticket aperto</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => loadMessages(t)}
                  className="w-full card-premium p-4 text-left hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{t.subject}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.category} · {new Date(t.created_at).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <Badge className={statusColor(t.status)}>{statusLabel(t.status)}</Badge>
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
