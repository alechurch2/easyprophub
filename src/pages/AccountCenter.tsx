import { useState, useEffect, useCallback, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { useLicenseSettings } from "@/hooks/useLicenseSettings";
import LicenseGate from "@/components/LicenseGate";
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
  CheckCircle2, XCircle, Zap, Link2, Unlink, Brain, Star, FileText
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      } else if (result.can_retry && result.status && result.status !== "failed") {
        // Account saved with intermediate state — do NOT delete
        connectSuccess = true; // prevent deletion
        const statusLabel = result.status === "deploying" ? "Deploy in corso"
          : result.status === "disconnected" ? "Deploy completato, in attesa connessione broker"
          : result.status === "disconnected_from_broker" ? "Disconnesso dal broker"
          : "In attesa connessione";
        toast.warning(`${statusLabel}. Usa "Verifica stato" per controllare quando il conto sarà connesso.`);
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
    awaiting_connection: { class: "bg-warning/10 text-warning", label: "In attesa connessione", icon: <Clock className="h-2.5 w-2.5" /> },
    pending: { class: "bg-warning/10 text-warning", label: "In attesa", icon: <Clock className="h-2.5 w-2.5" /> },
    failed: { class: "bg-destructive/10 text-destructive", label: "Errore", icon: <XCircle className="h-2.5 w-2.5" /> },
    disconnected: { class: "bg-warning/10 text-warning", label: "Deploy OK, attesa broker", icon: <Clock className="h-2.5 w-2.5" /> },
    disconnected_from_broker: { class: "bg-destructive/10 text-destructive", label: "Disconnesso dal broker", icon: <WifiOff className="h-2.5 w-2.5" /> },
    deploy_failed: { class: "bg-destructive/10 text-destructive", label: "Deploy fallito", icon: <XCircle className="h-2.5 w-2.5" /> },
  };
  const c = config[status] || config.disconnected;
  const isIntermediate = ["deploying", "awaiting_connection", "disconnected_from_broker", "disconnected"].includes(status);
  const errorHint = lastError && (status === "failed" || isIntermediate) ? ` — ${lastError.substring(0, 80)}` : "";
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
    <span className={cn("font-mono-data font-bold", value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-foreground")}>
      {prefix}{value > 0 ? "+" : ""}{value.toFixed(2)}
    </span>
  );
}

function MetricCard({ label, value, warn, small, accent }: { label: string; value: React.ReactNode; warn?: boolean; small?: boolean; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl p-3.5 transition-colors",
      accent ? "card-elevated accent-line-top" : "panel-inset",
      small && "p-2.5"
    )}>
      <p className={cn("text-label font-semibold uppercase text-muted-foreground/50 mb-1.5", small ? "text-[9px]" : "text-[10px]")}>{label}</p>
      <p className={cn("font-semibold text-foreground", small ? "text-sm" : "text-base", warn && "text-destructive")}>
        {value}
      </p>
    </div>
  );
}

// ---- Account Overview Cards ----
function AccountOverview({ accounts, onSync, syncing, onDelete, deleting, onRecheck, rechecking }: { accounts: TradingAccount[]; onSync: (id: string) => void; syncing: string | null; onDelete: (id: string) => void; deleting: string | null; onRecheck: (id: string) => void; rechecking: string | null }) {
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
    <div className="space-y-3 sm:space-y-4">
      {accounts.map((acc) => (
        <div key={acc.id} className="card-premium p-3.5 sm:p-5">
          <div className="flex flex-col gap-2.5 sm:gap-3 mb-3 sm:mb-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading font-semibold text-foreground truncate text-sm sm:text-base">{acc.account_name}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{acc.platform} · {acc.broker || "—"} · {acc.server || "—"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              {acc.read_only_mode && (
                <Badge variant="outline" className="text-[10px]">
                  <Eye className="h-2.5 w-2.5 mr-1" />Read-only
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {acc.provider_type === "metaapi" ? "⚡ MetaApi" : acc.provider_type === "mock" ? "📊 Demo" : acc.provider_type}
              </Badge>
              <SyncStatusBadge status={acc.sync_status} />
              <StatusBadge status={acc.connection_status} lastError={acc.last_sync_error} />
              {["deploying", "awaiting_connection", "disconnected_from_broker", "disconnected"].includes(acc.connection_status) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-warning/50 text-warning hover:bg-warning/10"
                  onClick={() => onRecheck(acc.id)}
                  disabled={rechecking === acc.id}
                >
                  <Wifi className={cn("h-3 w-3 mr-1", rechecking === acc.id && "animate-pulse")} />
                  Verifica stato
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSync(acc.id)}
                disabled={syncing === acc.id || acc.sync_status === "running" || !acc.provider_account_id || acc.connection_status !== "connected"}
                title={!acc.provider_account_id ? "Connessione MetaApi non completata" : acc.connection_status !== "connected" ? "Conto non ancora connesso" : "Aggiorna dati"}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <MetricCard label="Balance" value={<span className="font-mono-data text-xs sm:text-base">${acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>} accent />
            <MetricCard label="Equity" value={<span className="font-mono-data text-xs sm:text-base">${acc.equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>} accent />
            <MetricCard label="P/L Attuale" value={<PnLValue value={acc.profit_loss} prefix="$" />} />
            <MetricCard label="Drawdown" value={<span className="font-mono-data">{acc.drawdown.toFixed(2)}%</span>} warn={acc.drawdown > 5} />
            <MetricCard label="Win Rate" value={<span className="font-mono-data">{acc.win_rate.toFixed(1)}%</span>} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-2 sm:mt-3">
            <MetricCard label="P/L Giornaliero" value={<PnLValue value={acc.daily_pnl} prefix="$" />} small />
            <MetricCard label="P/L Settimanale" value={<PnLValue value={acc.weekly_pnl} prefix="$" />} small />
            <MetricCard label="Posizioni" value={<span className="font-mono-data">{acc.open_positions_count}</span>} small />
            <MetricCard label="Profit Factor" value={<span className="font-mono-data">{acc.profit_factor > 0 ? acc.profit_factor.toFixed(2) : "—"}</span>} small />
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
                    {t.source_type === "review" && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20"><FileText className="h-2 w-2 mr-0.5" />Review</Badge>}
                    {t.source_type === "signal" && <Badge className="text-[9px] bg-warning/10 text-warning border-warning/20"><Zap className="h-2 w-2 mr-0.5" />Segnale</Badge>}
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

// ---- Link Source Modal ----
function LinkSourceModal({ open, onClose, trade, onLinked }: { open: boolean; onClose: () => void; trade: Trade; onLinked: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"reviews" | "signals">("reviews");
  const [reviews, setReviews] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    Promise.all([
      supabase.from("ai_chart_reviews").select("id, asset, timeframe, review_mode, review_tier, created_at, status")
        .eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(50),
      supabase.from("shared_signals").select("id, asset, direction, order_type, entry_price, stop_loss, take_profit, signal_strength, published_at")
        .eq("is_published", true).eq("is_archived", false).order("published_at", { ascending: false }).limit(50),
    ]).then(([revRes, sigRes]) => {
      if (revRes.data) setReviews(revRes.data);
      if (sigRes.data) setSignals(sigRes.data);
      setLoading(false);
    });
  }, [open, user]);

  const linkToReview = async (reviewId: string) => {
    setLinking(true);
    const { error } = await supabase.from("account_trade_history").update({
      source_type: "review",
      source_review_id: reviewId,
      source_signal_id: null,
    } as any).eq("id", trade.id);
    if (error) toast.error("Errore nel collegamento");
    else { toast.success("Trade collegato alla review!"); onLinked(); onClose(); }
    setLinking(false);
  };

  const linkToSignal = async (signalId: string) => {
    setLinking(true);
    const { error } = await supabase.from("account_trade_history").update({
      source_type: "signal",
      source_review_id: null,
      source_signal_id: signalId,
    } as any).eq("id", trade.id);
    if (error) toast.error("Errore nel collegamento");
    else { toast.success("Trade collegato al segnale!"); onLinked(); onClose(); }
    setLinking(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" />Collega a fonte</DialogTitle>
          <DialogDescription>Seleziona la review o il segnale che ha generato questo trade</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="reviews" className="text-xs">AI Chart Review</TabsTrigger>
            <TabsTrigger value="signals" className="text-xs">Segnali condivisi</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[300px] mt-3">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : tab === "reviews" ? (
              reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nessuna review disponibile</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((r) => (
                    <button key={r.id} onClick={() => linkToReview(r.id)} disabled={linking}
                      className="w-full card-premium p-3 text-left hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-foreground">{r.asset}</span>
                          <span className="text-xs text-muted-foreground ml-2">{r.timeframe}</span>
                          <Badge variant="outline" className="ml-2 text-[9px]">{r.review_mode === "easy" ? "Easy" : "Pro"}</Badge>
                          <Badge variant="outline" className="ml-1 text-[9px]">{r.review_tier === "premium" ? "Premium" : "Standard"}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("it-IT")}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              signals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nessun segnale disponibile</p>
              ) : (
                <div className="space-y-2">
                  {signals.map((s) => (
                    <button key={s.id} onClick={() => linkToSignal(s.id)} disabled={linking}
                      className="w-full card-premium p-3 text-left hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-foreground">{s.asset}</span>
                          <Badge variant="outline" className={cn("ml-2 text-[9px]", s.direction?.toLowerCase().includes("buy") ? "text-success border-success/30" : "text-destructive border-destructive/30")}>
                            {s.direction} {s.order_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">Entry: {s.entry_price}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{s.published_at ? new Date(s.published_at).toLocaleDateString("it-IT") : ""}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ---- Trade AI Review Display ----
function TradeAiReviewDisplay({ review }: { review: TradeAiReview }) {
  if (review.status === "pending") {
    return (
      <div className="card-premium p-5 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analisi AI in corso...</p>
      </div>
    );
  }
  if (review.status === "failed" || !review.analysis) {
    return (
      <div className="card-premium p-5 border-destructive/20">
        <p className="text-sm text-destructive">Analisi AI fallita. Riprova più tardi.</p>
      </div>
    );
  }

  const a = review.analysis;
  const verdictColor = a.verdict === "POSITIVO" ? "text-success border-success/20 bg-success/5" :
    a.verdict === "NEGATIVO" ? "text-destructive border-destructive/20 bg-destructive/5" :
    "text-warning border-warning/20 bg-warning/5";

  return (
    <div className="card-premium p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h4 className="font-heading font-semibold text-foreground">Review AI del trade</h4>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", verdictColor)}>{a.verdict || "N/A"}</Badge>
          {a.voto_complessivo && (
            <Badge variant="outline" className="text-xs"><Star className="h-3 w-3 mr-1" />{a.voto_complessivo}/10</Badge>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {[
          { key: "coerenza_setup", label: "🎯 Coerenza con il setup" },
          { key: "qualita_ingresso", label: "📍 Qualità dell'ingresso" },
          { key: "qualita_gestione", label: "⚙️ Gestione del trade" },
          { key: "timing", label: "⏱️ Timing" },
          { key: "risultato_vs_idea", label: "📊 Risultato vs idea" },
          { key: "cosa_ha_funzionato", label: "✅ Cosa ha funzionato" },
          { key: "errori_principali", label: "⚠️ Errori principali" },
          { key: "lezione_finale", label: "📚 Lezione finale" },
        ].map(({ key, label }) => {
          const val = a[key];
          if (!val) return null;
          return (
            <div key={key}>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-sm text-foreground mt-0.5">{val}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">Analizzato il {new Date(review.created_at).toLocaleString("it-IT")}</p>
    </div>
  );
}

// ---- Trade Detail ----
function TradeDetail({ trade, onBack, onTradeUpdated }: { trade: Trade; onBack: () => void; onTradeUpdated?: () => void }) {
  const { user } = useAuth();
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    initial_idea: "", motivation: "", emotion: "", mistakes: "", did_well: "", lesson_learned: "", free_note: ""
  });
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [tradeReview, setTradeReview] = useState<TradeAiReview | null>(null);
  const [requestingReview, setRequestingReview] = useState(false);
  const [currentTrade, setCurrentTrade] = useState(trade);

  useEffect(() => {
    loadJournal();
    loadTradeReview();
  }, [currentTrade.id]);

  const loadJournal = async () => {
    const { data } = await supabase.from("trade_journal_entries").select("*").eq("trade_id", currentTrade.id).maybeSingle();
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

  const loadTradeReview = async () => {
    const { data } = await supabase.from("trade_ai_reviews").select("*")
      .eq("trade_id", currentTrade.id).order("created_at", { ascending: false }).limit(1);
    if (data && data.length > 0) setTradeReview(data[0] as any);
  };

  const saveJournal = async () => {
    if (!user) return;
    const payload = {
      trade_id: currentTrade.id,
      account_id: currentTrade.account_id,
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

  const handleLinked = async () => {
    // Reload trade data
    const { data } = await supabase.from("account_trade_history").select("*").eq("id", currentTrade.id).single();
    if (data) setCurrentTrade(data as any);
    onTradeUpdated?.();
  };

  const unlinkSource = async () => {
    const { error } = await supabase.from("account_trade_history").update({
      source_type: "manual",
      source_review_id: null,
      source_signal_id: null,
    } as any).eq("id", currentTrade.id);
    if (error) toast.error("Errore");
    else {
      toast.success("Collegamento rimosso");
      handleLinked();
    }
  };

  const requestAiReview = async () => {
    if (!user) return;
    setRequestingReview(true);
    
    // Create review record
    const { data: reviewRecord, error } = await supabase.from("trade_ai_reviews").insert({
      trade_id: currentTrade.id,
      user_id: user.id,
      source_review_id: currentTrade.source_review_id || null,
      source_signal_id: currentTrade.source_signal_id || null,
      status: "pending",
    } as any).select("id").single();

    if (error || !reviewRecord) {
      toast.error("Errore nella creazione della review");
      setRequestingReview(false);
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai-trade-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ trade_id: currentTrade.id, review_record_id: (reviewRecord as any).id }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast.success("Review AI completata!");
      } else {
        toast.error(result.error || "Errore nella review AI");
      }
    } catch {
      toast.error("Errore di connessione");
    }
    
    setRequestingReview(false);
    loadTradeReview();
  };

  const sourceLabel = currentTrade.source_type === "review" ? "AI Chart Review" :
    currentTrade.source_type === "signal" ? "Segnale condiviso" : "Trade manuale";
  const sourceIcon = currentTrade.source_type === "review" ? <FileText className="h-3.5 w-3.5 text-primary" /> :
    currentTrade.source_type === "signal" ? <Zap className="h-3.5 w-3.5 text-warning" /> :
    <Unlink className="h-3.5 w-3.5 text-muted-foreground" />;

  return (
    <div className="animate-fade-in space-y-6">
      <button onClick={onBack} className="text-sm text-primary hover:underline flex items-center gap-1">
        <ChevronLeft className="h-3 w-3" /> Torna allo storico
      </button>

      <div className="card-premium p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center",
            currentTrade.direction === "buy" ? "bg-success/10" : "bg-destructive/10"
          )}>
            {currentTrade.direction === "buy" ?
              <ArrowUpRight className="h-5 w-5 text-success" /> :
              <ArrowDownRight className="h-5 w-5 text-destructive" />}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground text-lg">
              {currentTrade.asset} <Badge variant="outline" className="ml-1">{currentTrade.direction.toUpperCase()}</Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              {currentTrade.status === "open" ? "Posizione aperta" : "Posizione chiusa"}
              {currentTrade.external_trade_id && <span className="ml-2">· ID: {currentTrade.external_trade_id}</span>}
            </p>
          </div>
          <div className="ml-auto text-right">
            <PnLValue value={currentTrade.profit_loss} prefix="$" />
            <Badge className={cn("ml-2",
              currentTrade.status === "open" ? "bg-info/10 text-info" : currentTrade.profit_loss >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {currentTrade.status === "open" ? "Aperta" : currentTrade.profit_loss >= 0 ? "Profit" : "Loss"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Lotto" value={String(currentTrade.lot_size)} small />
          <MetricCard label="Entry" value={String(currentTrade.entry_price)} small />
          <MetricCard label="Exit" value={currentTrade.exit_price ? String(currentTrade.exit_price) : "—"} small />
          <MetricCard label="SL" value={currentTrade.stop_loss ? String(currentTrade.stop_loss) : "—"} small />
          <MetricCard label="TP" value={currentTrade.take_profit ? String(currentTrade.take_profit) : "—"} small />
          <MetricCard label="Apertura" value={new Date(currentTrade.opened_at).toLocaleString("it-IT")} small />
          <MetricCard label="Chiusura" value={currentTrade.closed_at ? new Date(currentTrade.closed_at).toLocaleString("it-IT") : "—"} small />
          <MetricCard label="Durata" value={currentTrade.duration_minutes ? formatDuration(currentTrade.duration_minutes) : "—"} small />
        </div>
      </div>

      {/* Source Linking */}
      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h4 className="font-heading font-semibold text-foreground">Fonte del trade</h4>
          </div>
          <div className="flex items-center gap-2">
            {sourceIcon}
            <span className="text-xs text-muted-foreground">{sourceLabel}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setLinkModalOpen(true)}>
            <Link2 className="h-3 w-3 mr-1" />
            {currentTrade.source_type && currentTrade.source_type !== "manual" ? "Cambia collegamento" : "Collega ad analisi"}
          </Button>
          {currentTrade.source_type && currentTrade.source_type !== "manual" && (
            <Button size="sm" variant="outline" onClick={unlinkSource} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Unlink className="h-3 w-3 mr-1" />Scollega
            </Button>
          )}
        </div>
      </div>

      {/* AI Trade Review */}
      <div className="space-y-3">
        {tradeReview ? (
          <TradeAiReviewDisplay review={tradeReview} />
        ) : currentTrade.status === "closed" ? (
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-primary" />
              <h4 className="font-heading font-semibold text-foreground">Review AI del trade</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {currentTrade.source_type && currentTrade.source_type !== "manual"
                ? "Analizza questo trade confrontandolo con l'analisi originale."
                : "Analizza questo trade con l'AI per ottenere feedback sulla qualità dell'esecuzione."}
            </p>
            <Button size="sm" onClick={requestAiReview} disabled={requestingReview}>
              {requestingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Brain className="h-3.5 w-3.5 mr-1.5" />}
              Richiedi review AI del trade
            </Button>
          </div>
        ) : null}
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

      {/* Link Modal */}
      <LinkSourceModal open={linkModalOpen} onClose={() => setLinkModalOpen(false)} trade={currentTrade} onLinked={handleLinked} />
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
  const { user, isAdmin } = useAuth();
  const { settings: licenseSettings, loading: licenseLoading } = useLicenseSettings();
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
  const [rechecking, setRechecking] = useState<string | null>(null);
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
      supabase.from("trading_accounts").select("id, user_id, account_name, platform, broker, server, account_number, connection_status, sync_status, read_only_mode, balance, equity, profit_loss, drawdown, daily_pnl, weekly_pnl, win_rate, profit_factor, open_positions_count, user_note, last_sync_at, last_sync_error, last_successful_sync_at, provider_type, provider_account_id, created_at, updated_at, credential_mode, trading_execution_enabled, metadata").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("account_trade_history").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }),
      supabase.from("trade_journal_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
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
      a => a.provider_account_id && a.connection_status === 'connected' && a.user_id === user.id
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

  const handleRecheck = async (accountId: string) => {
    setRechecking(accountId);
    toast.info("Verifica stato connessione...");
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
          body: JSON.stringify({ action: "recheck_connection", account_id: accountId }),
        }
      );
      let result: any;
      try {
        const rawText = await res.text();
        result = rawText ? JSON.parse(rawText) : { success: false, error: "Empty response" };
      } catch {
        result = { success: false, error: `Risposta non valida (status ${res.status})` };
      }
      if (result.success && result.status === "connected") {
        toast.success("Conto ora connesso!");
      } else if (result.can_retry) {
        toast.warning(result.error || "Conto non ancora connesso. Riprova tra qualche minuto.");
      } else {
        toast.error(result.error || "Connessione fallita.");
      }
    } catch (err: any) {
      toast.error(`Errore: ${err.message || "Sconosciuto"}`);
    }
    setRechecking(null);
    loadData();
  };

  if (licenseLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin && !licenseSettings.account_center_enabled) {
    return (
      <AppLayout>
        <LicenseGate allowed={false} featureKey="account_center" requiredLevel="live" />
      </AppLayout>
    );
  }

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
          <TradeDetail trade={selectedTrade} onBack={() => setSelectedTrade(null)} onTradeUpdated={loadData} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* ═══ PAGE HEADER ═══ */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-background to-card" />
          <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-primary/[0.03] rounded-full blur-[100px] -translate-y-1/2" />
          
        <div className="relative px-4 sm:px-8 lg:px-10 py-5 sm:py-6 lg:py-8">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-label uppercase text-muted-foreground/50 font-semibold mb-1 sm:mb-2 text-[9px] sm:text-[10px]">Trading Intelligence</p>
                <h1 className="font-heading text-xl sm:text-display-sm font-bold text-foreground">Account Center</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Monitora i tuoi conti trading in tempo reale</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <LiveStatusIndicator mode={liveMode} lastUpdate={lastRealtimeUpdate} />
                <Button onClick={() => setShowConnect(true)} size="sm" className="h-8 text-xs sm:h-9 sm:text-sm">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Collega conto
                </Button>
              </div>
            </div>
          </div>
          <div className="divider-fade" />
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="px-4 sm:px-8 lg:px-10 py-4 sm:py-6 lg:py-8 max-w-5xl mx-auto">

        {/* Disclaimer */}
        <div className="panel-inset p-3 sm:p-3.5 mb-4 sm:mb-6">
          <div className="flex items-start gap-2">
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground/60">Disclaimer.</strong> I dati vengono sincronizzati dal provider esterno. Il portale non può aprire, chiudere o modificare operazioni.
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
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="w-max sm:w-full grid grid-cols-6 gap-0.5 sm:gap-1 h-auto bg-muted/30 p-0.5 sm:p-1 rounded-xl min-w-[420px] sm:min-w-0">
              <TabsTrigger value="overview" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="positions" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg">Posizioni</TabsTrigger>
              <TabsTrigger value="history" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg">Storico</TabsTrigger>
              <TabsTrigger value="journal" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg">Journal</TabsTrigger>
              <TabsTrigger value="metrics" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg">Metriche</TabsTrigger>
              <TabsTrigger value="sync-logs" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg">Sync</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview"><AccountOverview accounts={accounts} onSync={handleSync} syncing={syncing} onDelete={handleDelete} deleting={deleting} onRecheck={handleRecheck} rechecking={rechecking} /></TabsContent>
          <TabsContent value="positions"><OpenPositions trades={trades} /></TabsContent>
          <TabsContent value="history"><TradeHistory trades={trades} onSelectTrade={setSelectedTrade} /></TabsContent>
          <TabsContent value="journal"><JournalingOverview journalEntries={journalEntries} trades={trades} /></TabsContent>
          <TabsContent value="metrics"><AccountMetrics trades={trades} /></TabsContent>
          <TabsContent value="sync-logs"><SyncLogs accountIds={accounts.map(a => a.id)} /></TabsContent>
        </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}