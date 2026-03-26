import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TradeDetails {
  asset: string;
  direction: string;
  orderType: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  signalQuality: string;
}

interface TradingAccount {
  id: string;
  account_name: string;
  broker: string | null;
  platform: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  trade: TradeDetails;
  account: TradingAccount;
  reviewId?: string;
}

export function TradeExecutionModal({ open, onClose, trade, account, reviewId }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const isBuy = trade.direction.toLowerCase().includes("buy");

  const handleExecute = async () => {
    if (!confirmed) return;
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
            account_id: account.id,
            review_id: reviewId || null,
            asset: trade.asset,
            direction: trade.direction,
            order_type: trade.orderType,
            lot_size: trade.lotSize,
            entry_price: trade.entryPrice,
            stop_loss: trade.stopLoss,
            take_profit: trade.takeProfit,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: "Ordine inviato con successo al conto collegato!" });
        toast.success("Ordine inviato con successo!");
      } else {
        setResult({ success: false, message: data.error || "Errore nell'invio dell'ordine" });
        toast.error(data.error || "Errore nell'invio dell'ordine");
      }
    } catch {
      setResult({ success: false, message: "Errore di connessione" });
      toast.error("Errore di connessione");
    }

    setExecuting(false);
  };

  const handleClose = () => {
    setConfirmed(false);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBuy ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
            Conferma ordine
          </DialogTitle>
          <DialogDescription>
            Verifica i dettagli prima di inviare l'ordine al conto collegato.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className={cn(
              "rounded-xl border p-5 text-center",
              result.success ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
            )}>
              {result.success ? (
                <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
              ) : (
                <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
              )}
              <p className="text-sm font-medium text-foreground">{result.message}</p>
            </div>
            <Button onClick={handleClose} className="w-full">Chiudi</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Account info */}
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Conto</p>
              <p className="text-sm font-medium text-foreground">{account.account_name}</p>
              <p className="text-xs text-muted-foreground">{account.broker} · {account.platform}</p>
            </div>

            {/* Order details grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Asset</p>
                <p className="text-sm font-semibold text-foreground">{trade.asset}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Direzione</p>
                <p className={cn("text-sm font-semibold", isBuy ? "text-success" : "text-destructive")}>
                  {trade.direction}
                </p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Tipo ordine</p>
                <p className="text-sm font-semibold text-foreground">{trade.orderType}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Lotto</p>
                <p className="text-sm font-semibold text-foreground">{trade.lotSize}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Entry</p>
                <p className="text-sm font-semibold text-foreground">{trade.entryPrice}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Qualità</p>
                <p className="text-sm font-semibold text-foreground">{trade.signalQuality}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Stop Loss</p>
                <p className="text-sm font-semibold text-destructive">{trade.stopLoss}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Take Profit</p>
                <p className="text-sm font-semibold text-success">{trade.takeProfit}</p>
              </div>
            </div>

            {/* Warning */}
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                L'operazione verrà inviata direttamente al tuo conto di trading.
                Questa azione è irreversibile e comporta rischi finanziari.
              </p>
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Checkbox
                id="confirm-trade"
                checked={confirmed}
                onCheckedChange={(c) => setConfirmed(c === true)}
                className="mt-0.5"
              />
              <Label htmlFor="confirm-trade" className="text-xs text-foreground leading-relaxed cursor-pointer">
                Comprendo che l'operazione verrà inviata al conto collegato e accetto la responsabilità delle conseguenze finanziarie.
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">Annulla</Button>
              <Button
                onClick={handleExecute}
                disabled={!confirmed || executing}
                className={cn("flex-1", isBuy ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90")}
              >
                {executing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Invio in corso...</>
                ) : (
                  `Invia ordine ${isBuy ? "BUY" : "SELL"}`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
