import { useState, useEffect, useRef, useCallback } from "react";
import { trackEvent } from "@/lib/analytics";
import AppLayout from "@/components/AppLayout";
import { useLicenseSettings } from "@/hooks/useLicenseSettings";
import LicenseGate from "@/components/LicenseGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare, Plus, Trash2, Send, Loader2, Bot, User,
  MessagesSquare, Target, BookMarked, ChevronLeft, Info, ImagePlus, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type ChatMode = "trading_questions" | "setup_evaluation" | "method_support";
type Msg = { role: "user" | "assistant"; content: string; image_url?: string };

interface Conversation {
  id: string;
  title: string;
  mode: string;
  created_at: string;
  updated_at: string;
}

const MODES: { value: ChatMode; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "trading_questions", label: "Domande di Trading", icon: MessagesSquare, desc: "Analisi tecnica, concetti SMC, ICT, Wyckoff" },
  { value: "setup_evaluation", label: "Valutazione Setup", icon: Target, desc: "Ragiona su un setup e valuta struttura e conferme" },
  { value: "method_support", label: "Metodo EasyProp", icon: BookMarked, desc: "Supporto sul metodo e applicazione pratica" },
];

const WELCOME_MSG = `Benvenuto nell'**AI Trading Assistant** di EasyProp.

Sono qui per aiutarti a ragionare sul mercato, valutare setup e approfondire concetti di trading basati su **Smart Money, ICT e Wyckoff**.

**Come posso aiutarti:**
- 📊 Risposte a domande di analisi tecnica
- 🎯 Valutazione di setup descritti a parole
- 📖 Supporto sul metodo EasyProp
- 🖼️ Analisi visiva di screenshot dei tuoi grafici

Scegli una modalità e inizia a scrivere!`;

const DISCLAIMER = "Questa chat ha finalità informative, educative e di supporto operativo. Non costituisce esecuzione automatica, consulenza finanziaria personalizzata o garanzia di risultato.";

export default function AIAssistant() {
  const { user } = useAuth();
  const { settings: licenseSettings } = useLicenseSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>("trading_questions");
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!user) return;
    trackEvent("chat_opened", { page: "ai-assistant", section: "ai-assistant" });
    supabase
      .from("ai_chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => { if (data) setConversations(data as Conversation[]); });
  }, [user]);

  useEffect(() => {
    if (!activeConv) { setMessages([]); return; }
    supabase
      .from("ai_chat_messages")
      .select("role, content, image_url")
      .eq("conversation_id", activeConv)
      .order("created_at")
      .then(({ data }) => {
        if (data) setMessages(data as Msg[]);
      });
  }, [activeConv]);

  const startNewConversation = () => {
    setActiveConv(null);
    setMessages([]);
    setShowModeSelect(true);
    clearPendingImage();
  };

  const selectMode = (m: ChatMode) => {
    setMode(m);
    setShowModeSelect(false);
  };

  const openConversation = (conv: Conversation) => {
    setActiveConv(conv.id);
    setMode(conv.mode as ChatMode);
    setShowModeSelect(false);
    clearPendingImage();
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("ai_chat_conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConv === id) { setActiveConv(null); setMessages([]); }
    toast.success("Conversazione eliminata");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo immagini sono supportate"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("L'immagine deve essere inferiore a 10MB"); return; }
    setPendingImage(file);
    const url = URL.createObjectURL(file);
    setPendingImagePreview(url);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearPendingImage = () => {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImage(null);
    setPendingImagePreview(null);
  };

  const uploadImage = async (file: File, userId: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file, { contentType: file.type });
    if (error) throw new Error("Errore upload immagine: " + error.message);
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 3600);
    if (signedUrlError || !signedUrlData?.signedUrl) throw new Error("Errore nel generare l'URL dell'immagine");
    return signedUrlData.signedUrl;
  };

  const sendMessage = async () => {
    if ((!input.trim() && !pendingImage) || isLoading || !user) return;
    const userMsg = input.trim();
    setInput("");

    let imageUrl: string | undefined;
    if (pendingImage) {
      setIsUploading(true);
      try { imageUrl = await uploadImage(pendingImage, user.id); }
      catch (e: any) { toast.error(e.message || "Errore upload immagine"); setIsUploading(false); return; }
      setIsUploading(false);
      clearPendingImage();
    }

    let convId = activeConv;
    if (!convId) {
      const title = userMsg ? (userMsg.length > 60 ? userMsg.slice(0, 57) + "..." : userMsg) : "Analisi screenshot";
      const { data: newConv, error } = await supabase.from("ai_chat_conversations").insert({ user_id: user.id, title, mode }).select().single();
      if (error || !newConv) { toast.error("Errore nella creazione della conversazione"); return; }
      convId = newConv.id;
      setActiveConv(convId);
      setConversations((prev) => [newConv as Conversation, ...prev]);
    }

    await supabase.from("ai_chat_messages").insert({
      conversation_id: convId, role: "user",
      content: userMsg || (imageUrl ? "Analizza questo grafico" : ""),
      image_url: imageUrl || null,
    });

    const userMsgObj: Msg = { role: "user", content: userMsg || (imageUrl ? "Analizza questo grafico" : ""), image_url: imageUrl };
    const newMessages: Msg[] = [...messages, userMsgObj];
    setMessages(newMessages);
    setIsLoading(true);

    let assistantContent = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-trading-chat`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content, ...(m.image_url ? { image_url: m.image_url } : {}) })), conversation_id: convId, mode }) }
      );
      if (!resp.ok) { const err = await resp.json().catch(() => ({ error: "Errore di rete" })); throw new Error(err.error || `Errore ${resp.status}`); }
      if (!resp.body) throw new Error("Nessuna risposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) { assistantContent += content; setMessages([...newMessages, { role: "assistant", content: assistantContent }]); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) { assistantContent += content; setMessages([...newMessages, { role: "assistant", content: assistantContent }]); }
          } catch { /* ignore */ }
        }
      }

      if (assistantContent) {
        await supabase.from("ai_chat_messages").insert({ conversation_id: convId, role: "assistant", content: assistantContent });
        await supabase.from("ai_chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
      }
    } catch (e: any) {
      const msg = e.message === "Failed to fetch" ? "Impossibile raggiungere il server AI. Verifica la connessione e riprova." : e.message || "Errore nella risposta AI";
      toast.error(msg);
      if (!assistantContent) setMessages(newMessages);
    } finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const currentMode = MODES.find((m) => m.value === mode);
  const isNewChat = !activeConv && messages.length === 0;
  const canSend = (input.trim() || pendingImage) && !isLoading && !(isNewChat && showModeSelect);

  if (!licenseSettings.ai_assistant_enabled) {
    return (
      <AppLayout>
        <LicenseGate allowed={false} featureKey="ai_assistant" requiredLevel="pro" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
        {/* Desktop Sidebar */}
        <div className={cn(
          "border-r border-border/50 bg-card/50 backdrop-blur-sm flex-col transition-all duration-300",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden",
          "hidden md:flex"
        )}>
          <div className="p-3 border-b border-border/30">
            <Button onClick={startNewConversation} className="w-full" size="sm" variant="premium">
              <Plus className="h-4 w-4 mr-2" /> Nuova conversazione
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group flex items-start justify-between gap-2",
                  activeConv === conv.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/20"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-xs">{conv.title}</p>
                  <p className="text-[10px] mt-0.5 opacity-50 font-mono">
                    {MODES.find(m => m.value === conv.mode)?.label} · {new Date(conv.updated_at).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-[10px] text-muted-foreground/40 text-center p-6">Nessuna conversazione</p>
            )}
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <aside className="relative w-72 h-full bg-card border-r border-border/50 flex flex-col shadow-2xl">
              <div className="flex h-14 items-center justify-between px-4 border-b border-border/30">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Conversazioni</span>
                <button onClick={() => setMobileSidebarOpen(false)} className="text-muted-foreground/40 p-1 hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-3 border-b border-border/30">
                <Button onClick={() => { startNewConversation(); setMobileSidebarOpen(false); }} className="w-full" size="sm" variant="premium">
                  <Plus className="h-4 w-4 mr-2" /> Nuova conversazione
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => { openConversation(conv); setMobileSidebarOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex items-start justify-between gap-2",
                      activeConv === conv.id ? "bg-primary/10 text-primary" : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/20"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-xs">{conv.title}</p>
                      <p className="text-[10px] mt-0.5 opacity-50 font-mono">
                        {MODES.find(m => m.value === conv.mode)?.label} · {new Date(conv.updated_at).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <button onClick={(e) => deleteConversation(conv.id, e)} className="p-1 text-muted-foreground/40 hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))}
                {conversations.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/40 text-center p-6">Nessuna conversazione</p>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 border-b border-border/30 flex items-center px-4 gap-3 bg-card/30 backdrop-blur-sm">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block text-muted-foreground/40 hover:text-foreground transition-colors">
              <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", !sidebarOpen && "rotate-180")} />
            </button>
            <div className="flex items-center gap-2 md:hidden">
              <button onClick={() => setMobileSidebarOpen(true)} className="text-muted-foreground/40 hover:text-foreground p-1 transition-colors">
                <MessageSquare className="h-5 w-5" />
              </button>
              <button onClick={startNewConversation} className="text-muted-foreground/40 hover:text-foreground p-1 transition-colors">
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-semibold text-sm text-foreground">AI Trading Assistant</h2>
              {currentMode && (
                <p className="text-[10px] font-mono text-muted-foreground/40">{currentMode.label}</p>
              )}
            </div>
            {activeConv && (
              <Badge variant="secondary" className="text-[10px] font-mono hidden sm:inline-flex">{currentMode?.label}</Badge>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Mode selection for new chat */}
              {isNewChat && showModeSelect && (
                <div className="animate-fade-in space-y-6">
                  <div className="text-center mb-8">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Bot className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="font-heading text-xl font-bold text-foreground">AI Trading Assistant</h2>
                    <p className="text-sm text-muted-foreground/50 mt-1">Scegli la modalità per iniziare</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {MODES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => selectMode(m.value)}
                        className="card-premium p-5 text-left hover:border-primary/30 transition-all duration-200 group"
                      >
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                          <m.icon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-heading font-semibold text-sm text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground/50 mt-1 leading-relaxed">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Welcome message */}
              {isNewChat && !showModeSelect && (
                <div className="animate-fade-in">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="card-premium p-5 flex-1 prose prose-sm max-w-none text-foreground">
                      <ReactMarkdown>{WELCOME_MSG}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat messages */}
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3 animate-fade-in", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                    msg.role === "user" ? "bg-muted/30" : "bg-primary/10"
                  )}>
                    {msg.role === "user" ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[85%] rounded-xl p-4",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "card-premium"
                  )}>
                    {msg.image_url && (
                      <div className="mb-2">
                        <img
                          src={msg.image_url}
                          alt="Screenshot allegato"
                          className="rounded-lg max-h-64 w-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.image_url, "_blank")}
                        />
                      </div>
                    )}
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading */}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="card-premium p-4">
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Sto elaborando...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="px-4 py-1">
            <div className="max-w-3xl mx-auto flex items-start gap-1.5 text-[10px] text-muted-foreground/40">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{DISCLAIMER}</span>
            </div>
          </div>

          {/* Image Preview */}
          {pendingImagePreview && (
            <div className="px-4 pb-1">
              <div className="max-w-3xl mx-auto">
                <div className="inline-flex items-start gap-2 p-2 rounded-xl panel-inset">
                  <img src={pendingImagePreview} alt="Anteprima" className="h-16 w-auto rounded-lg" />
                  <button onClick={clearPendingImage} className="p-1 rounded-full hover:bg-muted/30 text-muted-foreground/40 hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border/30 bg-card/30 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2 items-end">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 flex-shrink-0 text-muted-foreground/40 hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || (isNewChat && showModeSelect)}
                  title="Allega screenshot"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                </Button>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={showModeSelect ? "Seleziona una modalità per iniziare..." : pendingImage ? "Aggiungi un commento all'immagine (opzionale)..." : "Scrivi un messaggio..."}
                  disabled={isLoading || (isNewChat && showModeSelect)}
                  className="min-h-[44px] max-h-32 resize-none"
                  rows={1}
                />
                <Button onClick={sendMessage} disabled={!canSend} size="icon" className="h-11 w-11 flex-shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
