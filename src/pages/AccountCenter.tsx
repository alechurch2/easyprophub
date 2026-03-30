import { useState, useEffect, useCallback, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Wallet, Plus, TrendingUp, TrendingDown, Activity, BarChart3, BookOpen,
  Loader2, Eye, ArrowUpRight, ArrowDownRight, Clock, Filter, ChevronLeft,
  Save, Trash2, X, Image, RefreshCw, AlertTriangle, Shield, Wifi, WifiOff,
  CheckCircle2, XCircle, Zap
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
  sync_status: string;
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
  last_sync_error: string | null;
  last_successful_sync_at: string | null;
  provider_type: string;
  provider_account_id: string | null;
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
  external_trade_id: string | null;
  source_type: string | null;
  source_review_id: string | null;
  source_signal_id: string | null;
}

interface TradeAiReview {
  id: string;
  trade_id: string;
  analysis: any;
  status: string;
  created_at: string;
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

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  trades_synced: number;
}

// ---- Supported Brokers Hook ----
function useSupportedBrokers() {
  const [brokers, setBrokers] = useState<{ id: string; name: string; platforms: string[] }[]>([]);
  useEffect(() => {
    supabase.from("supported_brokers").select("id, name, platforms").eq("is_active", true).then(({ data }) => {
      if (data) setBrokers(data as any);
    });
  }, []);
  return brokers;
}

// ---- Account Limit Hook ----
function useAccountLimit(userId: string | undefined) {
  const [limitInfo, setLimitInfo] = useState<{ current_count: number; max_allowed: number; can_connect: boolean } | null>(null);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.rpc("check_account_limit", { _user_id: userId });
    if (data) setLimitInfo(data as any);
  }, [userId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { limitInfo, refresh };
}

// ---- Request Extra Account Form ----
function RequestExtraAccountForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const brokers = useSupportedBrokers();
  const [broker, setBroker] = useState("");
  const [platform, setPlatform] = useState("MT5");
  const [server, setServer] = useState("");
  const [accountType, setAccountType] = useState("live");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!broker.trim() || !user) { toast.error("Seleziona un broker"); return; }
    setSaving(true);
    const { error } = await supabase.from("account_connection_requests").insert({
      user_id: user.id,
      broker: broker.trim(),
      platform,
      server: server.trim() || null,
      account_type: accountType,
      note: note.trim() || null,
    } as any);
    if (error) { toast.error("Errore nell'invio della richiesta"); }
    else { toast.success("Richiesta conto aggiuntivo inviata! L'admin la valuterà."); onSaved(); }
    setSaving(false);
  };

  return (
    <div className="card-premium p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-foreground text-lg">Richiedi conto aggiuntivo</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Hai già raggiunto il limite di conti collegabili. Compila i dettagli per richiedere l'attivazione di un conto aggiuntivo.</p>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground">Broker *</Label>
          <Select value={broker} onValueChange={setBroker}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Seleziona broker" /></SelectTrigger>
            <SelectContent>
              {brokers.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-foreground">Piattaforma</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MT4">MT4</SelectItem>
                <SelectItem value="MT5">MT5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-foreground">Tipo conto</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-foreground">Server (opzionale)</Label>
          <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Es: TMGM-MT5" className="mt-1" />
        </div>
        <div>
          <Label className="text-foreground">Nota / Motivazione</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Perché hai bisogno di un conto aggiuntivo?" className="mt-1" rows={2} />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={!broker.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Invia richiesta
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Request New Broker Form ----
function RequestNewBrokerForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [brokerName, setBrokerName] = useState("");
  const [platform, setPlatform] = useState("MT5");
  const [server, setServer] = useState("");
  const [note, setNote] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!brokerName.trim() || !user) { toast.error("Inserisci il nome del broker"); return; }
    setSaving(true);
    const { error } = await supabase.from("broker_support_requests").insert({
      user_id: user.id,
      broker_name: brokerName.trim(),
      platform,
      server: server.trim() || null,
      note: note.trim() || null,
      reference_link: referenceLink.trim() || null,
    } as any);
    if (error) { toast.error("Errore nell'invio della richiesta"); }
    else { toast.success("Richiesta nuovo broker inviata! L'admin la valuterà."); onSaved(); }
    setSaving(false);
  };

  return (
    <div className="card-premium p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-foreground text-lg">Richiedi supporto nuovo broker</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Il broker che vuoi usare non è ancora supportato? Invia una richiesta e l'admin valuterà l'attivazione.</p>
      <div className="space-y-3">
        <div>
          <Label className="text-foreground">Nome broker *</Label>
          <Input value={brokerName} onChange={(e) => setBrokerName(e.target.value)} placeholder="Es: ICMarkets" className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-foreground">Piattaforma</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MT4">MT4</SelectItem>
                <SelectItem value="MT5">MT5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-foreground">Server (opzionale)</Label>
            <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Es: ICMarketsSC-MT5" className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-foreground">Link o referenza (opzionale)</Label>
          <Input value={referenceLink} onChange={(e) => setReferenceLink(e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
        <div>
          <Label className="text-foreground">Nota aggiuntiva</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dettagli aggiuntivi..." className="mt-1" rows={2} />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={!brokerName.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Invia richiesta
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Connect Account Dialog (updated with broker selector) ----
function ConnectAccountForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const brokers = useSupportedBrokers();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("MT5");
  const [broker, setBroker] = useState("");
  const [showBrokerRequest, setShowBrokerRequest] = useState(false);
  const [server, setServer] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [connectionStep, setConnectionStep] = useState("");

  if (showBrokerRequest) {
    return <RequestNewBrokerForm onClose={() => setShowBrokerRequest(false)} onSaved={() => { setShowBrokerRequest(false); onSaved(); }} />;
  }

  const handleSave = async () => {
    if (!name.trim() || !accountNumber.trim() || !server.trim() || !investorPassword.trim() || !broker || !user) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    setSaving(true);
    setConnectionStep("Creazione account...");

    const { data: account, error } = await supabase.from("trading_accounts").insert({
      user_id: user.id,
      account_name: name.trim(),
      platform,
      broker: broker.trim() || null,
      server: server.trim() || null,
      account_number: accountNumber.trim() || null,
      investor_password: investorPassword.trim() || null,
      connection_status: "pending",
      sync_status: "idle",
      provider_type: "metaapi",
      user_note: note.trim() || null,
    } as any).select().single();

    if (error || !account) {
      toast.error("Errore nel salvataggio");
      setSaving(false);
      setConnectionStep("");
      return;
    }

    setConnectionStep("Connessione a MetaApi in corso...");
    toast.info("Connessione al broker in corso. Può richiedere fino a 90 secondi...");
    let connectSuccess = false;
    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/account-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ action: "connect_metaapi", account_id: (account as any).id }),
        }
      );

      let result: any;
      try {
        const rawText = await res.text();
        result = rawText ? JSON.parse(rawText) : { success: false, error: `Server returned ${res.status} with empty body` };
      } catch (parseErr) {
        result = { success: false, error: `Risposta non valida dal server (status ${res.status})` };
      }

      if (!res.ok && result.success === undefined) {
        result.success = false;
      }

      if (result.code === "ACCOUNT_LIMIT_REACHED" || result.code === "BROKER_NOT_SUPPORTED") {
        toast.error(result.error);
        setSaving(false);
        setConnectionStep("");
        return;
      }

      if (result.success) {
        connectSuccess = true;
        setConnectionStep("Sincronizzazione dati...");
        toast.success("Conto collegato! Avvio prima sincronizzazione...");
        const syncRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/account-sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.session?.access_token}`,
            },
            body: JSON.stringify({ action: "sync", account_id: (account as any).id }),
          }
        );
        let syncResult: any;
        try {
          const syncRaw = await syncRes.text();
          syncResult = syncRaw ? JSON.parse(syncRaw) : { success: false, error: "Empty response" };
        } catch {
          syncResult = { success: false, error: "Invalid response" };
        }
        if (syncResult.success) {
          toast.success(`Sincronizzazione completata! ${syncResult.trades_synced} trade importati.`);
        } else {
          toast.warning(`Conto collegato ma errore sync: ${syncResult.error || "Riprova manualmente"}`);
        }
      } else {
        toast.error(`Errore connessione: ${result.error || "Sconosciuto"}`);
      }
    } catch (err: any) {
      toast.error(`Errore durante la connessione al broker: ${err.message || "Sconosciuto"}`);
    }

    if (!connectSuccess) {
      await supabase.from("trading_accounts").delete().eq("id", (account as any).id);
    }

    setSaving(false);
    setConnectionStep("");
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
          <Label className="text-foreground">Broker *</Label>
          <Select value={broker} onValueChange={setBroker}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Seleziona broker supportato" /></SelectTrigger>
            <SelectContent>
              {brokers.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => setShowBrokerRequest(true)}
            className="text-xs text-primary hover:underline mt-1 inline-block"
          >
            Il tuo broker non è nella lista? Richiedi supporto →
          </button>
        </div>

        <div>
          <Label className="text-foreground">Piattaforma</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MT4">MetaTrader 4</SelectItem>
              <SelectItem value="MT5">MetaTrader 5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-foreground">Server *</Label>
            <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Es: TMGM-MT5" className="mt-1" />
          </div>
          <div>
            <Label className="text-foreground">Login (numero conto) *</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Es: 12345678" className="mt-1" />
          </div>
        </div>

        <div>
          <Label className="text-foreground">Investor Password *</Label>
          <Input type="password" value={investorPassword} onChange={(e) => setInvestorPassword(e.target.value)} placeholder="Password read-only" className="mt-1" />
        </div>

        <div>
          <Label className="text-foreground">Nota interna (opzionale)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Informazioni aggiuntive..." className="mt-1" rows={2} />
        </div>

        <div className="card-premium p-3 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p><strong>Modalità sola lettura.</strong> Usa la tua <strong>investor password</strong> (non la master password). Il portale non può aprire, chiudere o modificare ordini.</p>
              <p className="mt-1 text-[10px]">Il collegamento avviene tramite MetaApi. La connessione iniziale può richiedere fino a 90 secondi.</p>
            </div>
          </div>
        </div>

        {connectionStep && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{connectionStep}</span>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Annulla</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !accountNumber.trim() || !server.trim() || !investorPassword.trim() || !broker || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Collega conto
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Status Badge ----
function StatusBadge({ status, lastError }: { status: string; lastError?: string | null }) {
  const config: Record<string, { class: string; label: string; icon: React.ReactNode }> = {
    connected: { class: "bg-success/10 text-success", label: "Connesso", icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
    syncing: { class: "bg-info/10 text-info", label: "Connessione...", icon: <RefreshCw className="h-2.5 w-2.5 animate-spin" /> },
    deploying: { class: "bg-info/10 text-info", label: "Deploy in corso...", icon: <Loader2 className="h-2.5 w-2.5 animate-spin" /> },
    pending: { class: "bg-warning/10 text-warning", label: "In attesa", icon: <Clock className="h-2.5 w-2.5" /> },
    failed: { class: "bg-destructive/10 text-destructive", label: "Errore", icon: <XCircle className="h-2.5 w-2.5" /> },
    disconnected: { class: "bg-secondary text-muted-foreground", label: "Disconnesso", icon: <WifiOff className="h-2.5 w-2.5" /> },
    disconnected_from_broker: { class: "bg-destructive/10 text-destructive", label: "Disconnesso dal broker", icon: <WifiOff className="h-2.5 w-2.5" /> },
    deploy_failed: { class: "bg-destructive/10 text-destructive", label: "Deploy fallito", icon: <XCircle className="h-2.5 w-2.5" /> },
  };
  const c = config[status] || config.disconnected;
  const errorHint = lastError && (status === "failed" || status === "pending") ? ` — ${lastError.substring(0, 60)}` : "";
  return (
    <Badge className={cn(c.class, "flex items-center gap-1")} title={lastError || undefined}>
      {c.icon}{c.label}{errorHint && <span className="text-[9px] opacity-70 max-w-[150px] truncate">{errorHint}</span>}
    </Badge>
  );
}

function SyncStatusBadge({ status }: { status: string }) {
  if (status === "running") return <Badge className="bg-info/10 text-info text-[10px]"><RefreshCw className="h-2 w-2 animate-spin mr-0.5" />Sync in corso</Badge>;
  if (status === "error") return <Badge className="bg-destructive/10 text-destructive text-[10px]">Errore sync</Badge>;
  return null;
}

// ---- PnL Display ----
function PnLValue({ value, prefix = "" }: { value: number; prefix?: string }) {
  return (
    <span className={cn("font-semibold", value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-foreground")}>
      {prefix}{value > 0 ? "+" : ""}{value.toFixed(2)}
    </span>
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

// ---- Account Overview Cards ----
function AccountOverview({ accounts, onSync, syncing, onDelete, deleting }: { accounts: TradingAccount[]; onSync: (id: string) => void; syncing: string | null; onDelete: (id: string) => void; deleting: string | null }) {
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
        <div key={acc.id} className="card-premium p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-foreground truncate">{acc.account_name}</h3>
                <p className="text-xs text-muted-foreground truncate">{acc.platform} · {acc.broker || "—"} · {acc.server || "—"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                <Eye className="h-2.5 w-2.5 mr-1" />Read-only
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {acc.provider_type === "metaapi" ? "⚡ MetaApi" : acc.provider_type === "mock" ? "📊 Demo" : acc.provider_type}
              </Badge>
              <SyncStatusBadge status={acc.sync_status} />
              <StatusBadge status={acc.connection_status} lastError={acc.last_sync_error} />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSync(acc.id)}
                disabled={syncing === acc.id || acc.sync_status === "running" || !acc.provider_account_id}
                title={!acc.provider_account_id ? "Connessione MetaApi non completata" : "Aggiorna dati"}
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", syncing === acc.id && "animate-spin")} />
                Aggiorna
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={deleting === acc.id}
                  >
                    {deleting === acc.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                    Elimina
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminare questo conto?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>Stai per eliminare <strong>{acc.account_name}</strong>. Questa azione è irreversibile.</p>
                      <ul className="list-disc pl-4 text-xs space-y-1">
                        <li>Il conto verrà rimosso dall'Account Center</li>
                        <li>Tutti i trade sincronizzati verranno eliminati</li>
                        <li>Le note del journal collegate verranno eliminate</li>
                        <li>I log di sincronizzazione verranno rimossi</li>
                        {acc.provider_type === "metaapi" && acc.provider_account_id && (
                          <li>L'account MetaApi verrà disconnesso e rimosso</li>
                        )}
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(acc.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Elimina definitivamente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Error banner */}
          {acc.last_sync_error && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-2 mb-3 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-destructive">{acc.last_sync_error}</p>
            </div>
          )}

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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-3">
            {acc.last_sync_at ? (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-2.5 w-2.5 shrink-0" />
                Ultimo aggiornamento: {new Date(acc.last_sync_at).toLocaleString("it-IT")}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">Nessun sync effettuato</p>
            )}
            {acc.last_successful_sync_at && acc.last_successful_sync_at !== acc.last_sync_at && (
              <p className="text-[10px] text-success flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                Ultimo sync riuscito: {new Date(acc.last_successful_sync_at).toLocaleString("it-IT")}
              </p>
            )}
          </div>
        </div>
      ))}
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
        <p className="text-sm text-muted-foreground">Le posizioni aperte appariranno qui dopo la sincronizzazione.</p>
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
        <p className="text-sm text-muted-foreground">Le operazioni chiuse appariranno qui dopo la sincronizzazione.</p>
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
              {trade.external_trade_id && <span className="ml-2">· ID: {trade.external_trade_id}</span>}
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
          <p className="text-[10px] text-muted-foreground">I dati di journaling sono privati e non vengono alterati dal sync</p>
        </div>

        {!editing && (
          <div className="mb-3">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Save className="h-3 w-3 mr-1" /> {journal ? "Modifica" : "Aggiungi"}
            </Button>
          </div>
        )}

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
        <p className="text-sm text-muted-foreground">Servono operazioni chiuse sincronizzate per calcolare le metriche.</p>
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

// ---- Sync Logs ----
function SyncLogs({ accountIds }: { accountIds: string[] }) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountIds.length === 0) { setLoading(false); return; }
    supabase
      .from("account_sync_logs")
      .select("*")
      .in("account_id", accountIds)
      .order("started_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setLogs(data as any);
        setLoading(false);
      });
  }, [accountIds]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nessun log di sincronizzazione disponibile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground mb-2">Log sincronizzazione (ultimi 20)</h4>
      {logs.map((log) => (
        <div key={log.id} className="card-premium p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-[10px]",
              log.status === "completed" ? "bg-success/10 text-success" :
              log.status === "running" ? "bg-info/10 text-info" :
              "bg-destructive/10 text-destructive"
            )}>
              {log.status}
            </Badge>
            <span className="text-xs text-muted-foreground">{log.sync_type}</span>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{new Date(log.started_at).toLocaleString("it-IT")}</p>
            {log.trades_synced > 0 && <p className="text-success">{log.trades_synced} trade sincronizzati</p>}
            {log.error_message && <p className="text-destructive text-[10px]">{log.error_message.slice(0, 60)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Live Status Indicator ----
function LiveStatusIndicator({ mode, lastUpdate }: { mode: "live" | "syncing" | "fallback" | "offline"; lastUpdate: string | null }) {
  const config = {
    live: { class: "bg-success/20 text-success border-success/30", label: "Live", icon: <Zap className="h-2.5 w-2.5" /> },
    syncing: { class: "bg-info/20 text-info border-info/30", label: "Syncing", icon: <RefreshCw className="h-2.5 w-2.5 animate-spin" /> },
    fallback: { class: "bg-warning/20 text-warning border-warning/30", label: "Fallback", icon: <WifiOff className="h-2.5 w-2.5" /> },
    offline: { class: "bg-secondary text-muted-foreground border-border", label: "Offline", icon: <WifiOff className="h-2.5 w-2.5" /> },
  };
  const c = config[mode];
  return (
    <div className="flex items-center gap-2">
      <Badge className={cn(c.class, "flex items-center gap-1 border text-[10px]")}>{c.icon}{c.label}</Badge>
      {lastUpdate && (
        <span className="text-[10px] text-muted-foreground">
          Ultimo aggiornamento: {new Date(lastUpdate).toLocaleTimeString("it-IT")}
        </span>
      )}
    </div>
  );
}

// ---- Info Banner ----
function SyncDelayBanner() {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 mb-6 flex items-start gap-2">
      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <p className="text-xs text-muted-foreground">
        Balance ed equity si aggiornano rapidamente. Storico operazioni, PnL giornaliero/settimanale e metriche possono aggiornarsi con un leggero ritardo.
      </p>
    </div>
  );
}

// ---- Main Page ----
const SYNC_INTERVAL_ACTIVE = 30_000;   // 30s when page visible & user active
const SYNC_INTERVAL_INACTIVE = 90_000; // 90s when page hidden or user idle
const USER_IDLE_TIMEOUT = 60_000;      // 60s of no interaction = idle
const FAST_REFRESH_DEBOUNCE = 3_000;

export default function AccountCenter() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [showExtraRequest, setShowExtraRequest] = useState(false);
  const [showBrokerRequest, setShowBrokerRequest] = useState(false);
  const { limitInfo, refresh: refreshLimit } = useAccountLimit(user?.id);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState<"live" | "syncing" | "fallback" | "offline">("offline");
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const autoSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);
  const prevAccountSnapshotsRef = useRef<Map<string, { positions: number; balance: number }>>(new Map());
  const fastRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Smart sync: track page visibility & user activity
  const isPageVisibleRef = useRef(true);
  const isUserActiveRef = useRef(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track sync stats per account (for admin monitoring)
  const syncCountsRef = useRef<Map<string, number>>(new Map());

  const loadData = useCallback(async () => {
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
  }, [user]);

  // Initial load + populate snapshots
  useEffect(() => {
    loadData().then(() => {
      // Populate initial snapshots after first load
      setAccounts(prev => {
        prev.forEach(a => {
          prevAccountSnapshotsRef.current.set(a.id, {
            positions: a.open_positions_count,
            balance: a.balance,
          });
        });
        return prev;
      });
    });
  }, [loadData]);

  // Auto-select account if only one exists
  useEffect(() => {
    const syncable = accounts.filter(a => a.provider_account_id && a.connection_status === 'connected');
    if (syncable.length === 1) {
      setSelectedAccountId(syncable[0].id);
    } else if (syncable.length === 0) {
      setSelectedAccountId(null);
    }
  }, [accounts]);

  // ---- Fast Refresh: trigger immediate sync when position closure detected ----
  const triggerFastRefresh = useCallback(async (accountId: string, reason: string) => {
    if (!user || isSyncingRef.current) {
      console.log(`[FastRefresh] Skipped (syncing in progress), reason: ${reason}`);
      return;
    }
    console.log(`[FastRefresh] ⚡ Triggered for account ${accountId}, reason: ${reason}`);
    isSyncingRef.current = true;
    setLiveMode('syncing');

    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/account-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ action: "sync", account_id: accountId }),
        }
      );
      const rawText = await res.text();
      const result = rawText ? JSON.parse(rawText) : {};
      if (result.success) {
        console.log(`[FastRefresh] ✅ Completed: ${result.trades_synced} new trades synced`);
      } else {
        console.warn(`[FastRefresh] ⚠️ Error: ${result.error || 'Unknown'}`);
      }
    } catch (err) {
      console.warn('[FastRefresh] Fetch error', err);
    } finally {
      isSyncingRef.current = false;
      setLiveMode('live');
      setLastRealtimeUpdate(new Date().toISOString());
    }
  }, [user]);

  // Debounced fast refresh scheduler
  const scheduleFastRefresh = useCallback((accountId: string, reason: string) => {
    if (fastRefreshTimerRef.current) {
      clearTimeout(fastRefreshTimerRef.current);
    }
    fastRefreshTimerRef.current = setTimeout(() => {
      triggerFastRefresh(accountId, reason);
      fastRefreshTimerRef.current = null;
    }, FAST_REFRESH_DEBOUNCE);
  }, [triggerFastRefresh]);

  // ---- Supabase Realtime subscriptions with fast refresh detection ----
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('account-center-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trading_accounts' },
        (payload) => {
          console.log('[Realtime] trading_accounts change:', payload.eventType);
          setLastRealtimeUpdate(new Date().toISOString());
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as any;
            const accountId = updated.id;

            // Detect position closure: compare with previous snapshot
            const prev = prevAccountSnapshotsRef.current.get(accountId);
            if (prev) {
              const newPositions = updated.open_positions_count ?? 0;
              const newBalance = updated.balance ?? 0;
              const positionsDecreased = newPositions < prev.positions;
              const balanceChanged = Math.abs(newBalance - prev.balance) > 0.01 && newPositions < prev.positions;

              if (positionsDecreased) {
                const reason = `positions decreased ${prev.positions} → ${newPositions}` +
                  (balanceChanged ? `, balance changed ${prev.balance} → ${newBalance}` : '');
                console.log(`[FastRefresh] 🔍 Position closure detected: ${reason}`);
                scheduleFastRefresh(accountId, reason);
              }
            }

            // Update snapshot
            prevAccountSnapshotsRef.current.set(accountId, {
              positions: updated.open_positions_count ?? 0,
              balance: updated.balance ?? 0,
            });

            setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, ...updated } as TradingAccount : a));
          } else if (payload.eventType === 'INSERT' && payload.new) {
            const ins = payload.new as any;
            prevAccountSnapshotsRef.current.set(ins.id, {
              positions: ins.open_positions_count ?? 0,
              balance: ins.balance ?? 0,
            });
            setAccounts(prev => [payload.new as TradingAccount, ...prev]);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            prevAccountSnapshotsRef.current.delete((payload.old as any).id);
            setAccounts(prev => prev.filter(a => a.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account_trade_history' },
        (payload) => {
          console.log('[Realtime] account_trade_history change:', payload.eventType);
          setLastRealtimeUpdate(new Date().toISOString());
          if (payload.eventType === 'INSERT' && payload.new) {
            setTrades(prev => {
              const exists = prev.some(t => t.id === (payload.new as any).id);
              if (exists) return prev.map(t => t.id === (payload.new as any).id ? payload.new as Trade : t);
              return [payload.new as Trade, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setTrades(prev => prev.map(t => t.id === (payload.new as any).id ? { ...t, ...payload.new } as Trade : t));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setTrades(prev => prev.filter(t => t.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setLiveMode('live');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setLiveMode('fallback');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (fastRefreshTimerRef.current) clearTimeout(fastRefreshTimerRef.current);
    };
  }, [user, scheduleFastRefresh]);

  // ---- Page visibility & user activity tracking ----
  useEffect(() => {
    const handleVisibility = () => {
      isPageVisibleRef.current = !document.hidden;
      console.log(`[SmartSync] Page visibility: ${isPageVisibleRef.current ? 'visible' : 'hidden'}`);
    };
    const resetIdle = () => {
      isUserActiveRef.current = true;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        isUserActiveRef.current = false;
        console.log('[SmartSync] User idle');
      }, USER_IDLE_TIMEOUT);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('keydown', resetIdle, { passive: true });
    window.addEventListener('touchstart', resetIdle, { passive: true });
    resetIdle();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // ---- Smart auto-sync: interval based on visibility/activity, scoped to selected account ----
  const runAutoSync = useCallback(async () => {
    if (!user || isSyncingRef.current || accounts.length === 0) return;

    const syncableAccounts = accounts.filter(
      a => a.provider_account_id && a.connection_status === 'connected'
    );
    if (syncableAccounts.length === 0) return;

    // Scope: if user is looking at a specific account, sync only that one
    const toSync = selectedAccountId
      ? syncableAccounts.filter(a => a.id === selectedAccountId)
      : syncableAccounts;

    if (toSync.length === 0) return;

    isSyncingRef.current = true;
    setLiveMode('syncing');
    const mode = isPageVisibleRef.current && isUserActiveRef.current ? 'active' : 'inactive';
    console.log(`[AutoSync] Starting sync (${mode}), ${toSync.length}/${syncableAccounts.length} accounts`);

    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      for (const acc of toSync) {
        prevAccountSnapshotsRef.current.set(acc.id, {
          positions: acc.open_positions_count,
          balance: acc.balance,
        });

        try {
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/account-sync`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.session?.access_token}`,
              },
              body: JSON.stringify({ action: "sync", account_id: acc.id }),
            }
          );
          const rawText = await res.text();
          const result = rawText ? JSON.parse(rawText) : {};
          syncCountsRef.current.set(acc.id, (syncCountsRef.current.get(acc.id) || 0) + 1);
          if (result.success) {
            console.log(`[AutoSync] ${acc.account_name}: OK, ${result.trades_synced} new trades (total syncs: ${syncCountsRef.current.get(acc.id)})`);
          } else {
            console.warn(`[AutoSync] ${acc.account_name}: ${result.error || 'Unknown error'}`);
          }
        } catch (err) {
          console.warn(`[AutoSync] ${acc.account_name}: fetch error`, err);
        }
      }
    } catch (err) {
      console.warn('[AutoSync] Session error', err);
    } finally {
      isSyncingRef.current = false;
      setLiveMode('live');
      setLastRealtimeUpdate(new Date().toISOString());
    }
  }, [user, accounts, selectedAccountId]);

  // Dynamic interval based on visibility + activity
  useEffect(() => {
    if (accounts.length === 0) return;

    const scheduleNext = () => {
      const isActive = isPageVisibleRef.current && isUserActiveRef.current;
      const interval = isActive ? SYNC_INTERVAL_ACTIVE : SYNC_INTERVAL_INACTIVE;
      console.log(`[SmartSync] Next sync in ${interval / 1000}s (${isActive ? 'active' : 'inactive'})`);
      autoSyncRef.current = setTimeout(() => {
        runAutoSync().finally(scheduleNext);
      }, interval);
    };

    scheduleNext();
    return () => {
      if (autoSyncRef.current) clearTimeout(autoSyncRef.current);
    };
  }, [runAutoSync, accounts.length]);

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    setLiveMode('syncing');
    toast.info("Sincronizzazione in corso...");
    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/account-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ action: "sync", account_id: accountId }),
        }
      );
      let result: any;
      try {
        const rawText = await res.text();
        result = rawText ? JSON.parse(rawText) : { success: false, error: "Empty response" };
      } catch {
        result = { success: false, error: `Risposta non valida (status ${res.status})` };
      }
      if (result.success) {
        toast.success(`Sincronizzazione completata! ${result.trades_synced} nuovi trade importati.`);
      } else {
        toast.error(`Errore: ${result.error || "Sconosciuto"}`);
      }
    } catch (err: any) {
      toast.error(`Errore di connessione durante il sync: ${err.message || "Sconosciuto"}`);
    }
    setSyncing(null);
    setLiveMode('live');
    setLastRealtimeUpdate(new Date().toISOString());
  };

  const handleDelete = async (accountId: string) => {
    setDeleting(accountId);
    toast.info("Eliminazione conto in corso...");
    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/account-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ action: "delete_account", account_id: accountId }),
        }
      );
      let result: any;
      try {
        const rawText = await res.text();
        result = rawText ? JSON.parse(rawText) : { success: false, error: "Empty response" };
      } catch {
        result = { success: false, error: `Risposta non valida (status ${res.status})` };
      }
      if (result.success) {
        if (result.metaapi_cleanup === "partial") {
          toast.warning("Conto eliminato. Nota: la rimozione lato provider non è completa, ma il conto è stato rimosso localmente.");
        } else {
          toast.success("Conto eliminato con successo.");
        }
      } else {
        toast.error(`Errore eliminazione: ${result.error || "Sconosciuto"}`);
      }
    } catch (err: any) {
      toast.error(`Errore: ${err.message || "Sconosciuto"}`);
    }
    setDeleting(null);
    loadData();
  };

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
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          <TradeDetail trade={selectedTrade} onBack={() => setSelectedTrade(null)} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Account Center</h1>
              <p className="text-sm text-muted-foreground">Monitora i tuoi conti trading</p>
            </div>
          </div>
          <Button onClick={() => setShowConnect(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Collega conto
          </Button>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center justify-between mb-6">
          <LiveStatusIndicator mode={liveMode} lastUpdate={lastRealtimeUpdate} />
          <p className="text-[10px] text-muted-foreground">Auto-sync: 30s attivo · 90s inattivo</p>
        </div>

        {/* Disclaimer */}
        <div className="card-premium p-3 mb-6 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Modalità sola lettura.</strong> Conto collegato in sola lettura. Il portale non può aprire, chiudere o modificare operazioni. I dati vengono sincronizzati dal provider esterno.
            </p>
          </div>
        </div>

        {/* Sync Delay Info Banner */}
        <SyncDelayBanner />

        {/* Connect Form */}
        {showConnect && (
          <div className="mb-6">
            <ConnectAccountForm onClose={() => setShowConnect(false)} onSaved={() => { setShowConnect(false); refreshLimit(); loadData(); }} />
          </div>
        )}

        {/* Extra Account Request Form */}
        {showExtraRequest && (
          <div className="mb-6">
            <RequestExtraAccountForm onClose={() => setShowExtraRequest(false)} onSaved={() => { setShowExtraRequest(false); }} />
          </div>
        )}

        {/* New Broker Request Form */}
        {showBrokerRequest && (
          <div className="mb-6">
            <RequestNewBrokerForm onClose={() => setShowBrokerRequest(false)} onSaved={() => { setShowBrokerRequest(false); }} />
          </div>
        )}

        {/* Account limit info — TEMPORARILY DISABLED */}

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-6 w-full grid grid-cols-3 sm:grid-cols-6 gap-1 h-auto bg-secondary/50 p-1 rounded-lg">
            <TabsTrigger value="overview" className="text-xs px-2"><Wallet className="h-3 w-3 mr-1 hidden sm:inline" />Overview</TabsTrigger>
            <TabsTrigger value="positions" className="text-xs px-2"><Activity className="h-3 w-3 mr-1 hidden sm:inline" />Posizioni</TabsTrigger>
            <TabsTrigger value="history" className="text-xs px-2"><BarChart3 className="h-3 w-3 mr-1 hidden sm:inline" />Storico</TabsTrigger>
            <TabsTrigger value="journal" className="text-xs px-2"><BookOpen className="h-3 w-3 mr-1 hidden sm:inline" />Journal</TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs px-2"><TrendingUp className="h-3 w-3 mr-1 hidden sm:inline" />Metriche</TabsTrigger>
            <TabsTrigger value="sync-logs" className="text-xs px-2"><RefreshCw className="h-3 w-3 mr-1 hidden sm:inline" />Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><AccountOverview accounts={accounts} onSync={handleSync} syncing={syncing} onDelete={handleDelete} deleting={deleting} /></TabsContent>
          <TabsContent value="positions"><OpenPositions trades={trades} /></TabsContent>
          <TabsContent value="history"><TradeHistory trades={trades} onSelectTrade={setSelectedTrade} /></TabsContent>
          <TabsContent value="journal"><JournalingOverview journalEntries={journalEntries} trades={trades} /></TabsContent>
          <TabsContent value="metrics"><AccountMetrics trades={trades} /></TabsContent>
          <TabsContent value="sync-logs"><SyncLogs accountIds={accounts.map(a => a.id)} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}