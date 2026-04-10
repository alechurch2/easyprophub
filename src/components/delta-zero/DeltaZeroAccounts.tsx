import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Wallet, Loader2, Wifi, WifiOff, RefreshCw, Trash2, Settings2,
  Shield, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DZAccount {
  id: string;
  account_name: string;
  platform: string;
  broker: string | null;
  server: string | null;
  account_number: string | null;
  connection_status: string;
  sync_status: string;
  balance: number;
  equity: number;
  last_sync_at: string | null;
  last_sync_error: string | null;
  provider_account_id: string | null;
}

interface DZSettings {
  id: string;
  account_id: string;
  role: string;
  default_risk_percent: number;
  default_sl_pips: number;
  default_tp_pips: number;
  default_lot_size: number;
}

interface Props {
  brokerAccount: DZAccount | null;
  hedgeAccount: DZAccount | null;
  brokerSettings: DZSettings | null;
  hedgeSettings: DZSettings | null;
  onRefresh: () => void;
}

function useSupportedBrokers() {
  const [brokers, setBrokers] = useState<{ id: string; name: string; platforms: string[] }[]>([]);
  useEffect(() => {
    supabase.from("supported_brokers").select("id, name, platforms").eq("is_active", true).then(({ data }) => {
      if (data) setBrokers(data as any);
    });
  }, []);
  return brokers;
}

// ---- Connect Form ----
function ConnectDZAccountForm({ role, onClose, onSaved }: { role: "broker" | "hedge"; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const brokers = useSupportedBrokers();
  const [name, setName] = useState(role === "broker" ? "DZ Broker" : "DZ Hedge");
  const [platform, setPlatform] = useState("MT5");
  const [broker, setBroker] = useState("");
  const [server, setServer] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState("");

  // Settings
  const [riskPercent, setRiskPercent] = useState("0.5");
  const [slPips, setSlPips] = useState("20");
  const [tpPips, setTpPips] = useState("40");
  const [lotSize, setLotSize] = useState("0.01");

  const handleSave = async () => {
    if (!name.trim() || !accountNumber.trim() || !server.trim() || !investorPassword.trim() || !broker || !user) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    setSaving(true);
    setStep("Creazione account…");

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
      scope: "delta_zero",
      credential_mode: "master",
    } as any).select().single();

    if (error || !account) {
      toast.error("Errore nel salvataggio");
      setSaving(false);
      setStep("");
      return;
    }

    // Create DZ settings
    await supabase.from("delta_zero_account_settings").insert({
      user_id: user.id,
      account_id: (account as any).id,
      role,
      default_risk_percent: parseFloat(riskPercent) || 0.5,
      default_sl_pips: parseFloat(slPips) || 20,
      default_tp_pips: parseFloat(tpPips) || 40,
      default_lot_size: parseFloat(lotSize) || 0.01,
    } as any);

    setStep("Connessione a MetaApi…");
    toast.info("Connessione al broker in corso. Può richiedere fino a 90 secondi…");

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
        const raw = await res.text();
        result = raw ? JSON.parse(raw) : { success: false, error: `Status ${res.status}` };
      } catch {
        result = { success: false, error: `Risposta non valida (status ${res.status})` };
      }

      if (result.success) {
        connectSuccess = true;
        toast.success(`Conto ${role} collegato!`);
      } else if (result.can_retry) {
        connectSuccess = true;
        toast.warning("Deploy in corso. Usa 'Verifica stato' per controllare.");
      } else {
        toast.error(`Errore: ${result.error || "Sconosciuto"}`);
      }
    } catch (err: any) {
      toast.error(`Errore connessione: ${err.message}`);
    }

    if (!connectSuccess) {
      await supabase.from("delta_zero_account_settings").delete().eq("account_id", (account as any).id);
      await supabase.from("trading_accounts").delete().eq("id", (account as any).id);
    }

    setSaving(false);
    setStep("");
    onSaved();
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">
          Collega conto {role === "broker" ? "Broker" : "Hedge"}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">Annulla</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Piattaforma</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MT4">MT4</SelectItem>
              <SelectItem value="MT5">MT5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Broker *</Label>
        <Select value={broker} onValueChange={setBroker}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Seleziona broker" /></SelectTrigger>
          <SelectContent>
            {brokers.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Server *</Label>
          <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Es: TMGM-MT5" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Numero conto *</Label>
          <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Password Master *</Label>
        <Input type="password" value={investorPassword} onChange={(e) => setInvestorPassword(e.target.value)} className="mt-1" />
      </div>

      {/* Settings */}
      <div className="border-t border-border/40 pt-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parametri predefiniti</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Rischio %</Label>
            <Input type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Lot size</Label>
            <Input type="number" step="0.01" value={lotSize} onChange={(e) => setLotSize(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">SL (pips)</Label>
            <Input type="number" value={slPips} onChange={(e) => setSlPips(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">TP (pips)</Label>
            <Input type="number" value={tpPips} onChange={(e) => setTpPips(e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {step}
          </span>
        ) : (
          `Collega conto ${role}`
        )}
      </Button>
    </div>
  );
}

// ---- Account Card ----
function AccountCard({
  role, account, settings, onRefresh
}: {
  role: "broker" | "hedge";
  account: DZAccount | null;
  settings: DZSettings | null;
  onRefresh: () => void;
}) {
  const [showConnect, setShowConnect] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isConnected = account?.connection_status === "connected";
  const isError = account?.connection_status && ["failed", "sync_error_tls"].includes(account.connection_status);
  const isPending = account && !isConnected && !isError;

  const handleCheckStatus = async () => {
    if (!account) return;
    setChecking(true);
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
          body: JSON.stringify({ action: "recheck_status", account_id: account.id }),
        }
      );
      const result = await res.json().catch(() => ({ success: false }));
      if (result.success && result.new_status === "connected") {
        toast.success(`Conto ${role} connesso!`);
      } else if (result.new_status) {
        toast.info(`Stato: ${result.new_status}`);
      } else {
        toast.warning("Stato invariato");
      }
    } catch {
      toast.error("Errore verifica stato");
    }
    setChecking(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!account) return;
    setDeleting(true);
    await supabase.from("delta_zero_account_settings").delete().eq("account_id", account.id);
    await supabase.from("trading_accounts").delete().eq("id", account.id);
    toast.success(`Conto ${role} rimosso`);
    setDeleting(false);
    onRefresh();
  };

  if (showConnect) {
    return <ConnectDZAccountForm role={role} onClose={() => setShowConnect(false)} onSaved={() => { setShowConnect(false); onRefresh(); }} />;
  }

  return (
    <div className={cn(
      "rounded-2xl border bg-card p-4 space-y-3 transition-all",
      isConnected ? "border-emerald-500/30" : isError ? "border-red-500/30" : "border-border/60"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            role === "broker" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
          )}>
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{role === "broker" ? "Broker" : "Hedge"}</p>
            {account && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {account.broker} · {account.platform}
              </p>
            )}
          </div>
        </div>
        {account ? (
          <Badge variant="outline" className={cn(
            "text-[10px]",
            isConnected ? "border-emerald-500/40 text-emerald-500" :
            isError ? "border-red-500/40 text-red-500" :
            "border-amber-500/40 text-amber-500"
          )}>
            {isConnected ? <><Wifi className="h-3 w-3 mr-1" /> Connesso</> :
             isError ? <><WifiOff className="h-3 w-3 mr-1" /> Errore</> :
             <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> {account.connection_status}</>}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
            Non collegato
          </Badge>
        )}
      </div>

      {account && isConnected && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Balance</p>
            {account.balance > 0 ? (
              <p className="font-mono font-bold text-foreground">${account.balance.toFixed(2)}</p>
            ) : (
              <p className="font-mono text-muted-foreground/50 text-[10px]">In attesa di sync…</p>
            )}
          </div>
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground">Equity</p>
            {account.equity > 0 ? (
              <p className="font-mono font-bold text-foreground">${account.equity.toFixed(2)}</p>
            ) : (
              <p className="font-mono text-muted-foreground/50 text-[10px]">In attesa di sync…</p>
            )}
          </div>
        </div>
      )}

      {account && isError && account.last_sync_error && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/15">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-500">{account.last_sync_error}</p>
        </div>
      )}

      {settings && (
        <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="h-3 w-3" />
          Parametri
          {showSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}

      {showSettings && settings && (
        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
          <span>Rischio: <span className="text-foreground font-mono">{settings.default_risk_percent}%</span></span>
          <span>Lot: <span className="text-foreground font-mono">{settings.default_lot_size}</span></span>
          <span>SL: <span className="text-foreground font-mono">{settings.default_sl_pips} pips</span></span>
          <span>TP: <span className="text-foreground font-mono">{settings.default_tp_pips} pips</span></span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!account ? (
          <Button size="sm" onClick={() => setShowConnect(true)} className="w-full text-xs">
            <Wallet className="h-3.5 w-3.5 mr-1" /> Collega conto
          </Button>
        ) : (
          <>
            {(isPending || isError) && (
              <Button size="sm" variant="outline" onClick={handleCheckStatus} disabled={checking} className="flex-1 text-xs">
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span className="ml-1">Verifica</span>
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rimuovi conto {role}?</AlertDialogTitle>
                  <AlertDialogDescription>Il conto verrà scollegato da Delta-Zero.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rimuovi"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Main Component ----
export default function DeltaZeroAccounts({ brokerAccount, hedgeAccount, brokerSettings, hedgeSettings, onRefresh }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Conti Delta-Zero</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AccountCard role="broker" account={brokerAccount} settings={brokerSettings} onRefresh={onRefresh} />
        <AccountCard role="hedge" account={hedgeAccount} settings={hedgeSettings} onRefresh={onRefresh} />
      </div>
    </div>
  );
}
