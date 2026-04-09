import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, ArrowRightLeft, Loader2, CheckCircle2, Shield, AlertTriangle
} from "lucide-react";

interface DZAccount {
  id: string;
  account_name: string;
  broker: string | null;
  platform: string;
  connection_status: string;
}

interface DZSettings {
  default_lot_size: number;
  default_sl_pips: number;
  default_tp_pips: number;
  default_risk_percent: number;
}

interface Props {
  bias: "buy" | "sell";
  asset: string;
  timeframe: string;
  confidence: number;
  brokerAccount: DZAccount;
  hedgeAccount: DZAccount;
  brokerSettings: DZSettings;
  hedgeSettings: DZSettings;
  onClose: () => void;
}

export default function DeltaZeroTradeSetup({
  bias, asset, timeframe, confidence,
  brokerAccount, hedgeAccount,
  brokerSettings, hedgeSettings,
  onClose
}: Props) {
  const { user } = useAuth();
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  const brokerDir = bias; // buy bias → buy on broker
  const hedgeDir = bias === "buy" ? "sell" : "buy"; // opposite on hedge

  const bothConnected = brokerAccount.connection_status === "connected" && hedgeAccount.connection_status === "connected";

  const handleExecute = async () => {
    if (!user || !bothConnected) return;
    setExecuting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      // Execute on both accounts in parallel
      const [brokerRes, hedgeRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/execute-trade`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            account_id: brokerAccount.id,
            asset,
            direction: brokerDir,
            lot_size: brokerSettings.default_lot_size,
            order_type: "market",
          }),
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/execute-trade`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            account_id: hedgeAccount.id,
            asset,
            direction: hedgeDir,
            lot_size: hedgeSettings.default_lot_size,
            order_type: "market",
          }),
        }),
      ]);

      const brokerResult = await brokerRes.json().catch(() => ({ success: false, error: "Risposta non valida" }));
      const hedgeResult = await hedgeRes.json().catch(() => ({ success: false, error: "Risposta non valida" }));

      if (brokerResult.success && hedgeResult.success) {
        toast.success("Entrambi gli ordini eseguiti con successo!");
        setExecuted(true);
      } else {
        const errors = [];
        if (!brokerResult.success) errors.push(`Broker: ${brokerResult.error || "errore"}`);
        if (!hedgeResult.success) errors.push(`Hedge: ${hedgeResult.error || "errore"}`);
        toast.error(errors.join(" | "));
      }
    } catch (err: any) {
      toast.error(`Errore esecuzione: ${err.message}`);
    }

    setExecuting(false);
  };

  if (executed) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-card p-6 flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-bold text-foreground">Ordini eseguiti</p>
        <p className="text-xs text-muted-foreground">Entrambi gli ordini sono stati inviati ai rispettivi conti.</p>
        <Button variant="outline" size="sm" onClick={onClose} className="mt-2">Chiudi</Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Setup Dual-Account</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Bias: <span className={cn("font-bold", bias === "buy" ? "text-emerald-500" : "text-red-500")}>
            {bias.toUpperCase()}
          </span> · {asset} · {timeframe} · Confidence {confidence}/5
        </p>
      </div>

      {/* Two cards */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Broker order */}
          <div className={cn(
            "rounded-xl border p-3 space-y-2",
            brokerDir === "buy" ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
          )}>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-bold text-foreground">Broker</span>
            </div>
            <div className="flex items-center gap-2">
              {brokerDir === "buy"
                ? <TrendingUp className="h-5 w-5 text-emerald-500" />
                : <TrendingDown className="h-5 w-5 text-red-500" />}
              <span className={cn("text-lg font-bold font-mono", brokerDir === "buy" ? "text-emerald-500" : "text-red-500")}>
                {brokerDir.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <p>Lot: <span className="text-foreground font-mono">{brokerSettings.default_lot_size}</span></p>
              <p>SL: <span className="text-foreground font-mono">{brokerSettings.default_sl_pips} pips</span></p>
              <p>TP: <span className="text-foreground font-mono">{brokerSettings.default_tp_pips} pips</span></p>
              <p className="font-mono text-muted-foreground/60">{brokerAccount.broker} · {brokerAccount.account_name}</p>
            </div>
          </div>

          {/* Hedge order */}
          <div className={cn(
            "rounded-xl border p-3 space-y-2",
            hedgeDir === "buy" ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
          )}>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold text-foreground">Hedge</span>
            </div>
            <div className="flex items-center gap-2">
              {hedgeDir === "buy"
                ? <TrendingUp className="h-5 w-5 text-emerald-500" />
                : <TrendingDown className="h-5 w-5 text-red-500" />}
              <span className={cn("text-lg font-bold font-mono", hedgeDir === "buy" ? "text-emerald-500" : "text-red-500")}>
                {hedgeDir.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <p>Lot: <span className="text-foreground font-mono">{hedgeSettings.default_lot_size}</span></p>
              <p>SL: <span className="text-foreground font-mono">{hedgeSettings.default_sl_pips} pips</span></p>
              <p>TP: <span className="text-foreground font-mono">{hedgeSettings.default_tp_pips} pips</span></p>
              <p className="font-mono text-muted-foreground/60">{hedgeAccount.broker} · {hedgeAccount.account_name}</p>
            </div>
          </div>
        </div>

        {!bothConnected && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Entrambi i conti devono essere connessi per eseguire gli ordini.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Annulla
          </Button>
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={!bothConnected || executing}
            className={cn(
              "flex-1",
              bias === "buy"
                ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700"
                : "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700"
            )}
          >
            {executing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Esecuzione…
              </span>
            ) : (
              "Conferma ed esegui"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
