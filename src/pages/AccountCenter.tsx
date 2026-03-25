import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Wallet, Plus, TrendingUp, TrendingDown, Activity, BarChart3, BookOpen,
  Loader2, Eye, ArrowUpRight, ArrowDownRight, Clock, Filter, ChevronLeft,
  Save, Trash2, X, Image, RefreshCw, AlertTriangle, Shield
} from "lucide-react";

// ---- Types ----
interface TradingAccount {
  id: string;
  user_id: string;
  account_name: string;
  platform: string;
  broker: string | null;
  server: string | null;
  account_number: string | null;
  connection_status: string;
  read_only_mode: boolean;
  balance: number;
  equity: number;
  profit_loss: number;
  drawdown: number;
  daily_pnl: number;
  weekly_pnl: number;
  win_rate: number;
  profit_factor: number;
  open_positions_count: number;
  user_note: string | null;
  last_sync_at: string | null;
  created_at: string;
}

interface Trade {
  id: string;
  account_id: string;
  asset: string;
  direction: string;
  lot_size: number;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  profit_loss: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  duration_minutes: number | null;
}

interface JournalEntry {
  id: string;
  trade_id: string | null;
  account_id: string | null;
  initial_idea: string | null;
  motivation: string | null;
  emotion: string | null;
  mistakes: string | null;
  did_well: string | null;
  lesson_learned: string | null;
  free_note: string | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Connect Account Dialog ----
function ConnectAccountForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("MT5");
  const [broker, setBroker] = useState("");
  const [server, setServer] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("trading_accounts").insert({
      user_id: user.id,
      account_name: name.trim(),
      platform,
      broker: broker.trim() || null,
      server: server.trim() || null,
      account_number: accountNumber.trim() || null,
      connection_status: "pending",
      user_note: note.trim() || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Errore nel salvataggio"); return; }
    toast.success("Conto collegato con successo");
    onSaved();
  };

  return (
    <div className="card-premium p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading font-semibold text-foreground text-lg">Collega nuovo conto</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-foreground">Nome conto *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es: Conto Principale" className="mt-1" />
        </div>

        <div>
          <Label className="text-foreground">Piattaforma</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MT4">MetaTrader 4</SelectItem>
              <SelectItem value="MT5">MetaTrader 5</SelectItem>
              <SelectItem value="other">Altro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-foreground">Broker</Label>
            <Input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="Es: ICMarkets" className="mt-1" />
          </div>
          <div>
            <Label className="text-foreground">Server</Label>
            <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Es: ICMarkets-Live" className="mt-1" />
          </div>
        </div>

        <div>
          <Label className="text-foreground">Numero conto</Label>
          <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Es: 12345678" className="mt-1" />
        </div>

        <div>
          <Label className="text-foreground">Nota interna (opzionale)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Informazioni aggiuntive..." className="mt-1" rows={2} />
        </div>

        <div className="card-premium p-3 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Il conto verrà collegato in <strong>modalità sola lettura</strong>. Non sarà possibile aprire, chiudere o modificare ordini dalla piattaforma.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Collega conto
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Status Badge ----
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { class: string; label: string }> = {
    connected: { class: "bg-success/10 text-success", label: "Connesso" },
    pending: { class: "bg-warning/10 text-warning", label: "In attesa" },
    failed: { class: "bg-destructive/10 text-destructive", label: "Errore" },
    disconnected: { class: "bg-secondary text-muted-foreground", label: "Disconnesso" },
  };
  const c = config[status] || config.disconnected;
  return <Badge className={c.class}>{c.label}</Badge>;
}

// ---- PnL Display ----
function PnLValue({ value, prefix = "" }: { value: number; prefix?: string }) {
  return (
    <span className={cn("font-semibold", value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-foreground")}>
      {prefix}{value > 0 ? "+" : ""}{value.toFixed(2)}
    </span>
  );
}

// ---- Account Overview Cards ----
function AccountOverview({ accounts }: { accounts: TradingAccount[] }) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-16">
        <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading font-semibold text-foreground mb-2">Nessun conto collegato</h3>
        <p className="text-sm text-muted-foreground">Collega il tuo primo conto trading per iniziare il monitoraggio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((acc) => (
        <div key={acc.id} className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">{acc.account_name}</h3>
                <p className="text-xs text-muted-foreground">{acc.platform} · {acc.broker || "—"} · {acc.server || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                <Eye className="h-2.5 w-2.5 mr-1" />Read-only
              </Badge>
              <StatusBadge status={acc.connection_status} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            <MetricCard label="Balance" value={`$${acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
            <MetricCard label="Equity" value={`$${acc.equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
            <MetricCard label="P/L Attuale" value={<PnLValue value={acc.profit_loss} prefix="$" />} />
            <MetricCard label="Drawdown" value={`${acc.drawdown.toFixed(2)}%`} warn={acc.drawdown > 5} />
            <MetricCard label="Win Rate" value={`${acc.win_rate.toFixed(1)}%`} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            <MetricCard label="P/L Giornaliero" value={<PnLValue value={acc.daily_pnl} prefix="$" />} small />
            <MetricCard label="P/L Settimanale" value={<PnLValue value={acc.weekly_pnl} prefix="$" />} small />
            <MetricCard label="Posizioni aperte" value={String(acc.open_positions_count)} small />
            <MetricCard label="Profit Factor" value={acc.profit_factor > 0 ? acc.profit_factor.toFixed(2) : "—"} small />
          </div>

          {acc.last_sync_at && (
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5" />
              Ultimo aggiornamento: {new Date(acc.last_sync_at).toLocaleString("it-IT")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, warn, small }: { label: string; value: React.ReactNode; warn?: boolean; small?: boolean }) {
  return (
    <div className={cn("rounded-lg bg-secondary/50 p-3", small && "p-2")}>
      <p className={cn("text-muted-foreground mb-1", small ? "text-[10px]" : "text-xs")}>{label}</p>
      <p className={cn("font-semibold text-foreground", small ? "text-sm" : "text-base", warn && "text-destructive")}>
        {value}
      </p>
    </div>
  );
}

// ---- Open Positions ----
function OpenPositions({ trades }: { trades: Trade[] }) {
  const open = trades.filter((t) => t.status === "open");

  if (open.length === 0) {
    return (
      <div className="text-center py-16">
        <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading font-semibold text-foreground mb-2">Nessuna posizione aperta</h3>
        <p className="text-sm text-muted-foreground">Le posizioni aperte appariranno qui una volta sincronizzate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {open.map((t) => (
        <div key={t.id} className="card-premium p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center",
                t.direction === "buy" ? "bg-success/10" : "bg-destructive/10"
              )}>
                {t.direction === "buy" ?
                  <ArrowUpRight className="h-4 w-4 text-success" /> :
                  <ArrowDownRight className="h-4 w-4 text-destructive" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{t.asset}</span>
                  <Badge variant="outline" className={cn("text-[10px]",
                    t.direction === "buy" ? "text-success border-success/30" : "text-destructive border-destructive/30"
                  )}>
                    {t.direction.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.lot_size} lot · Entry: {t.entry_price}
                  {t.stop_loss ? ` · SL: ${t.stop_loss}` : ""}
                  {t.take_profit ? ` · TP: ${t.take_profit}` : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <PnLValue value={t.profit_loss} prefix="$" />
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                <Clock className="h-2.5 w-2.5" />
                {new Date(t.opened_at).toLocaleString("it-IT")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Trade History ----
function TradeHistory({ trades, onSelectTrade }: { trades: Trade[]; onSelectTrade: (t: Trade) => void }) {
  const [filterAsset, setFilterAsset] = useState("all");
  const [filterDir, setFilterDir] = useState("all");
  const [filterResult, setFilterResult] = useState("all");

  const closed = trades.filter((t) => t.status === "closed");
  const assets = [...new Set(closed.map((t) => t.asset))];

  const filtered = closed.filter((t) => {
    if (filterAsset !== "all" && t.asset !== filterAsset) return false;
    if (filterDir !== "all" && t.direction !== filterDir) return false;
    if (filterResult === "profit" && t.profit_loss <= 0) return false;
    if (filterResult === "loss" && t.profit_loss >= 0) return false;
    return true;
  }).sort((a, b) => new Date(b.closed_at || b.opened_at).getTime() - new Date(a.closed_at || a.opened_at).getTime());

  if (closed.length === 0) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading font-semibold text-foreground mb-2">Nessuna operazione nello storico</h3>
        <p className="text-sm text-muted-foreground">Le operazioni chiuse appariranno qui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={filterAsset} onValueChange={setFilterAsset}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Asset" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {assets.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDir} onValueChange={setFilterDir}>
          <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="profit">Profit</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} operazioni</p>

      <div className="space-y-2">
        {filtered.map((t) => (
          <button key={t.id} onClick={() => onSelectTrade(t)} className="w-full card-premium p-4 text-left hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center",
                  t.direction === "buy" ? "bg-success/10" : "bg-destructive/10"
                )}>
                  {t.direction === "buy" ?
                    <ArrowUpRight className="h-4 w-4 text-success" /> :
                    <ArrowDownRight className="h-4 w-4 text-destructive" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{t.asset}</span>
                    <Badge variant="outline" className="text-[10px]">{t.direction.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.lot_size} lot · {t.entry_price} → {t.exit_price || "—"}
                    {t.duration_minutes ? ` · ${formatDuration(t.duration_minutes)}` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <PnLValue value={t.profit_loss} prefix="$" />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t.closed_at ? new Date(t.closed_at).toLocaleDateString("it-IT") : ""}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}g ${Math.floor((mins % 1440) / 60)}h`;
}

// ---- Trade Detail ----
function TradeDetail({ trade, onBack }: { trade: Trade; onBack: () => void }) {
  const { user } = useAuth();
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    initial_idea: "", motivation: "", emotion: "", mistakes: "", did_well: "", lesson_learned: "", free_note: ""
  });

  useEffect(() => {
    loadJournal();
  }, [trade.id]);

  const loadJournal = async () => {
    const { data } = await supabase.from("trade_journal_entries").select("*").eq("trade_id", trade.id).maybeSingle();
    if (data) {
      setJournal(data as any);
      setForm({
        initial_idea: (data as any).initial_idea || "",
        motivation: (data as any).motivation || "",
        emotion: (data as any).emotion || "",
        mistakes: (data as any).mistakes || "",
        did_well: (data as any).did_well || "",
        lesson_learned: (data as any).lesson_learned || "",
        free_note: (data as any).free_note || "",
      });
    }
    setLoading(false);
  };

  const saveJournal = async () => {
    if (!user) return;
    const payload = {
      trade_id: trade.id,
      account_id: trade.account_id,
      user_id: user.id,
      ...form,
    };

    if (journal) {
      await supabase.from("trade_journal_entries").update(payload as any).eq("id", journal.id);
    } else {
      await supabase.from("trade_journal_entries").insert(payload as any);
    }
    toast.success("Journaling salvato");
    setEditing(false);
    loadJournal();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <button onClick={onBack} className="text-sm text-primary hover:underline flex items-center gap-1">
        <ChevronLeft className="h-3 w-3" /> Torna allo storico
      </button>

      {/* Trade info */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center",
            trade.direction === "buy" ? "bg-success/10" : "bg-destructive/10"
          )}>
            {trade.direction === "buy" ?
              <ArrowUpRight className="h-5 w-5 text-success" /> :
              <ArrowDownRight className="h-5 w-5 text-destructive" />}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground text-lg">
              {trade.asset} <Badge variant="outline" className="ml-1">{trade.direction.toUpperCase()}</Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              {trade.status === "open" ? "Posizione aperta" : "Posizione chiusa"}
            </p>
          </div>
          <div className="ml-auto text-right">
            <PnLValue value={trade.profit_loss} prefix="$" />
            <Badge className={cn("ml-2",
              trade.status === "open" ? "bg-info/10 text-info" : trade.profit_loss >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trade.status === "open" ? "Aperta" : trade.profit_loss >= 0 ? "Profit" : "Loss"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Lotto" value={String(trade.lot_size)} small />
          <MetricCard label="Entry" value={String(trade.entry_price)} small />
          <MetricCard label="Exit" value={trade.exit_price ? String(trade.exit_price) : "—"} small />
          <MetricCard label="SL" value={trade.stop_loss ? String(trade.stop_loss) : "—"} small />
          <MetricCard label="TP" value={trade.take_profit ? String(trade.take_profit) : "—"} small />
          <MetricCard label="Apertura" value={new Date(trade.opened_at).toLocaleString("it-IT")} small />
          <MetricCard label="Chiusura" value={trade.closed_at ? new Date(trade.closed_at).toLocaleString("it-IT") : "—"} small />
          <MetricCard label="Durata" value={trade.duration_minutes ? formatDuration(trade.duration_minutes) : "—"} small />
        </div>
      </div>

      {/* Journaling */}
      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h4 className="font-heading font-semibold text-foreground">Journaling</h4>
          </div>
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Save className="h-3 w-3 mr-1" /> {journal ? "Modifica" : "Aggiungi"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : editing ? (
          <div className="space-y-3">
            {[
              { key: "initial_idea", label: "Idea iniziale", placeholder: "Qual era la tua idea prima di entrare?" },
              { key: "motivation", label: "Motivazione", placeholder: "Perché hai aperto questo trade?" },
              { key: "emotion", label: "Emozione / stato mentale", placeholder: "Come ti sentivi?" },
              { key: "mistakes", label: "Errori commessi", placeholder: "Cosa avresti fatto diversamente?" },
              { key: "did_well", label: "Cosa hai fatto bene", placeholder: "Cosa ha funzionato?" },
              { key: "lesson_learned", label: "Lezione imparata", placeholder: "Cosa porti a casa da questo trade?" },
              { key: "free_note", label: "Nota libera", placeholder: "Qualsiasi altra osservazione..." },
            ].map((field) => (
              <div key={field.key}>
                <Label className="text-foreground text-xs">{field.label}</Label>
                <Textarea
                  value={(form as any)[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="mt-1"
                  rows={2}
                />
              </div>
            ))}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Annulla</Button>
              <Button size="sm" onClick={saveJournal}><Save className="h-3 w-3 mr-1" /> Salva</Button>
            </div>
          </div>
        ) : journal ? (
          <div className="space-y-3">
            {[
              { key: "initial_idea", label: "💡 Idea iniziale" },
              { key: "motivation", label: "🎯 Motivazione" },
              { key: "emotion", label: "🧠 Emozione" },
              { key: "mistakes", label: "⚠️ Errori" },
              { key: "did_well", label: "✅ Fatto bene" },
              { key: "lesson_learned", label: "📚 Lezione" },
              { key: "free_note", label: "📝 Note" },
            ].map((field) => {
              const val = (journal as any)[field.key];
              if (!val) return null;
              return (
                <div key={field.key}>
                  <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                  <p className="text-sm text-foreground mt-0.5">{val}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nessun journaling ancora. Clicca "Aggiungi" per iniziare.</p>
        )}
      </div>
    </div>
  );
}

// ---- Journaling Overview ----
function JournalingOverview({ journalEntries, trades }: { journalEntries: JournalEntry[]; trades: Trade[] }) {
  if (journalEntries.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading font-semibold text-foreground mb-2">Nessun journaling</h3>
        <p className="text-sm text-muted-foreground">Aggiungi note di journaling dalle singole operazioni per rivederle qui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {journalEntries.map((j) => {
        const trade = trades.find((t) => t.id === j.trade_id);
        return (
          <div key={j.id} className="card-premium p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {trade && (
                  <>
                    <Badge variant="outline" className={cn("text-[10px]",
                      trade.direction === "buy" ? "text-success border-success/30" : "text-destructive border-destructive/30"
                    )}>
                      {trade.direction.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">{trade.asset}</span>
                    <PnLValue value={trade.profit_loss} prefix="$" />
                  </>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{new Date(j.created_at).toLocaleDateString("it-IT")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {j.initial_idea && <div><span className="text-muted-foreground">💡 </span><span className="text-foreground">{j.initial_idea}</span></div>}
              {j.emotion && <div><span className="text-muted-foreground">🧠 </span><span className="text-foreground">{j.emotion}</span></div>}
              {j.lesson_learned && <div><span className="text-muted-foreground">📚 </span><span className="text-foreground">{j.lesson_learned}</span></div>}
              {j.mistakes && <div><span className="text-muted-foreground">⚠️ </span><span className="text-foreground">{j.mistakes}</span></div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Metrics ----
function AccountMetrics({ trades }: { trades: Trade[] }) {
  const closed = trades.filter((t) => t.status === "closed");

  if (closed.length === 0) {
    return (
      <div className="text-center py-16">
        <TrendingUp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading font-semibold text-foreground mb-2">Metriche non disponibili</h3>
        <p className="text-sm text-muted-foreground">Servono operazioni chiuse per calcolare le metriche.</p>
      </div>
    );
  }

  const wins = closed.filter((t) => t.profit_loss > 0);
  const losses = closed.filter((t) => t.profit_loss < 0);
  const totalPnl = closed.reduce((sum, t) => sum + t.profit_loss, 0);
  const avgPnl = totalPnl / closed.length;
  const winRate = (wins.length / closed.length) * 100;
  const grossProfit = wins.reduce((sum, t) => sum + t.profit_loss, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit_loss, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const durations = closed.filter((t) => t.duration_minutes).map((t) => t.duration_minutes!);
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const bestTrade = closed.reduce((best, t) => t.profit_loss > best.profit_loss ? t : best, closed[0]);
  const worstTrade = closed.reduce((worst, t) => t.profit_loss < worst.profit_loss ? t : worst, closed[0]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <MetricCard label="Trade totali" value={String(closed.length)} />
      <MetricCard label="Vincenti" value={String(wins.length)} />
      <MetricCard label="Perdenti" value={String(losses.length)} />
      <MetricCard label="Win Rate" value={`${winRate.toFixed(1)}%`} />
      <MetricCard label="P/L Totale" value={<PnLValue value={totalPnl} prefix="$" />} />
      <MetricCard label="P/L Medio" value={<PnLValue value={avgPnl} prefix="$" />} />
      <MetricCard label="Profit Factor" value={profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)} />
      <MetricCard label="Durata media" value={avgDuration > 0 ? formatDuration(Math.round(avgDuration)) : "—"} />
      <MetricCard label="Miglior trade" value={<><span className="text-foreground text-xs">{bestTrade.asset}</span> <PnLValue value={bestTrade.profit_loss} prefix="$" /></>} />
      <MetricCard label="Peggior trade" value={<><span className="text-foreground text-xs">{worstTrade.asset}</span> <PnLValue value={worstTrade.profit_loss} prefix="$" /></>} />
    </div>
  );
}

// ---- Main Page ----
export default function AccountCenter() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const loadData = async () => {
    if (!user) return;
    const [accRes, tradeRes, journalRes] = await Promise.all([
      supabase.from("trading_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("account_trade_history").select("*").order("opened_at", { ascending: false }),
      supabase.from("trade_journal_entries").select("*").order("created_at", { ascending: false }),
    ]);
    if (accRes.data) setAccounts(accRes.data as any);
    if (tradeRes.data) setTrades(tradeRes.data as any);
    if (journalRes.data) setJournalEntries(journalRes.data as any);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (selectedTrade) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <TradeDetail trade={selectedTrade} onBack={() => setSelectedTrade(null)} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Account Center</h1>
              <p className="text-sm text-muted-foreground">Monitora i tuoi conti trading in sola lettura</p>
            </div>
          </div>
          <Button onClick={() => setShowConnect(true)}>
            <Plus className="h-4 w-4 mr-1" /> Collega conto
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="card-premium p-3 mb-6 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Modalità sola lettura.</strong> Questa sezione è dedicata esclusivamente al monitoraggio. Non è possibile aprire, chiudere o modificare ordini dalla piattaforma.
            </p>
          </div>
        </div>

        {/* Connect Form */}
        {showConnect && (
          <div className="mb-6">
            <ConnectAccountForm onClose={() => setShowConnect(false)} onSaved={() => { setShowConnect(false); loadData(); }} />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-6 w-full flex flex-wrap gap-1 h-auto bg-secondary/50 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex-1 min-w-[100px]"><Wallet className="h-3 w-3 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="positions" className="flex-1 min-w-[100px]"><Activity className="h-3 w-3 mr-1" />Posizioni</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 min-w-[100px]"><BarChart3 className="h-3 w-3 mr-1" />Storico</TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 min-w-[100px]"><BookOpen className="h-3 w-3 mr-1" />Journaling</TabsTrigger>
            <TabsTrigger value="metrics" className="flex-1 min-w-[100px]"><TrendingUp className="h-3 w-3 mr-1" />Metriche</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><AccountOverview accounts={accounts} /></TabsContent>
          <TabsContent value="positions"><OpenPositions trades={trades} /></TabsContent>
          <TabsContent value="history"><TradeHistory trades={trades} onSelectTrade={setSelectedTrade} /></TabsContent>
          <TabsContent value="journal"><JournalingOverview journalEntries={journalEntries} trades={trades} /></TabsContent>
          <TabsContent value="metrics"><AccountMetrics trades={trades} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
