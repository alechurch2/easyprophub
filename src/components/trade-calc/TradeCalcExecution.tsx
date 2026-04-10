import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, CheckCircle2, XCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CalcOutput } from "./TradeCalcEngine";

interface TradingAccount {
  id: string;
  account_name: string;
  broker: string | null;
  platform: string;
  connection_status: string;
  trading_execution_enabled: boolean;
  credential_mode: string;
  scope: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  output: CalcOutput;
}

export function TradeCalcExecution({ open, onClose, output }: Props) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const isBuy = output.direction === "buy";

  useEffect(() => {
    if (!open || !user) return;
    setConfirmed(false);
    setResult(null);
    setLoading(true);

    supabase
      .from("trading_accounts")
      .select("id, account_name, broker, platform, connection_status, trading_execution_enabled, credential_mode, scope")
      .eq("user_id", user.id)
      .eq("connection_status", "connected")
      .eq("trading_execution_enabled", true)
      .eq("scope", "standard")
      .then(({ data }) => {
        const eligible = (data || []).filter((a) => a.credential_mode === "master") as TradingAccount[];
        setAccounts(eligible);
        if (eligible.length === 1) setSelectedAccountId(eligible[0].id);
        setLoading(false);
      });
  }, [open, user]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handleExecute = async () => {
    if (!confirmed || !selectedAccount) return;
    setExecuting(true);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-trade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            account_id: selectedAccount.id,
            asset: output.asset,
            direction: output.direction,
            order_type: "market",
            lot_size: output.lotSize,
            entry_price: output.entryPrice,
            stop_loss: output.slPrice || undefined,
            take_profit: output.tpPrice || undefined,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setResult({ success: true, message: "Ordine inviato con successo!" });
        toast.success("Ordine inviato!");
      } else {
        setResult({ success: false, message: data.error || "Errore nell'invio" });
        toast.error(data.error || "Errore");
      }
    } catch {
      setResult({ success: false, message: "Errore di connessione" });
      toast.error("Errore di connessione");
    }
    setExecuting(false);
  };

  const handleClose = () => {
    setResult(null);
    setConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBuy ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
            Invia ordine
          </DialogTitle>
          <DialogDescription>Seleziona il conto e conferma l'operazione.</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className={cn("rounded-xl border p-5 text-center", result.success ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
              {result.success ? <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" /> : <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />}
              <p className="text-sm font-medium text-foreground">{result.message}</p>
            </div>
            <Button onClick={handleClose} className="w-full">Chiudi</Button>
          </div>
        ) : loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : accounts.length === 0 ? (
          <div className="py-6 text-center space-y-3">
            <Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">Nessun conto idoneo trovato.</p>
            <p className="text-xs text-muted-foreground/70">Serve un conto connesso con credenziali Master e trading abilitato.</p>
            <Button variant="outline" onClick={handleClose}>Chiudi</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Account selector */}
            {accounts.length > 1 && (
              <div>
                <Label className="text-xs">Conto</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger><SelectValue placeholder="Seleziona conto" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.broker}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedAccount && (
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Conto selezionato</p>
                <p className="text-sm font-medium text-foreground">{selectedAccount.account_name}</p>
                <p className="text-xs text-muted-foreground">{selectedAccount.broker} · {selectedAccount.platform}</p>
              </div>
            )}

            {/* Order summary */}
            <div className="grid grid-cols-2 gap-3">
              <SummaryCell label="Asset" value={output.asset} />
              <SummaryCell label="Direzione" value={output.direction.toUpperCase()} color={isBuy ? "success" : "destructive"} />
              <SummaryCell label="Lotto" value={output.lotSize.toString()} />
              <SummaryCell label="Entry" value={output.entryPrice.toString()} />
              <SummaryCell label="Stop Loss" value={output.slPrice > 0 ? output.slPrice.toString() : "—"} color="destructive" />
              <SummaryCell label="Take Profit" value={output.tpPrice > 0 ? output.tpPrice.toString() : "—"} color="success" />
            </div>

            {/* Warning */}
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">L'operazione verrà inviata direttamente al conto. Azione irreversibile con rischi finanziari.</p>
            </div>

            {/* Confirm */}
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Checkbox id="calc-confirm" checked={confirmed} onCheckedChange={(c) => setConfirmed(c === true)} className="mt-0.5" />
              <Label htmlFor="calc-confirm" className="text-xs text-foreground leading-relaxed cursor-pointer">
                Comprendo i rischi e confermo l'invio dell'operazione.
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">Annulla</Button>
              <Button
                onClick={handleExecute}
                disabled={!confirmed || !selectedAccount || executing}
                className={cn("flex-1", isBuy ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90")}
              >
                {executing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Invio...</> : `Invia ${isBuy ? "BUY" : "SELL"}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color?: "success" | "destructive" }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-sm font-semibold", color === "success" ? "text-success" : color === "destructive" ? "text-destructive" : "text-foreground")}>{value}</p>
    </div>
  );
}
