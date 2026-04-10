import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  currentPrice?: number | null;
  brokerAccount: DZAccount;
  hedgeAccount: DZAccount;
  brokerSettings: DZSettings;
  hedgeSettings: DZSettings;
  onClose: () => void;
}

/** Convert pips to absolute price distance based on asset type */
function pipToPrice(pips: number, asset: string): number {
  const a = asset.toUpperCase();
  if (a.includes("JPY")) return pips * 0.01;
  if (a.includes("XAU") || a.includes("GOLD")) return pips * 0.1;
  if (["US30", "NAS100", "US500", "GER40", "UK100", "JPN225"].some(idx => a.includes(idx))) return pips * 1;
  if (a.includes("BTC")) return pips * 1;
  if (a.includes("OIL") || a.includes("WTI") || a.includes("BRENT")) return pips * 0.01;
  // Default forex
  return pips * 0.0001;
}

export default function DeltaZeroTradeSetup({
  bias, asset, timeframe, confidence, currentPrice,
  brokerAccount, hedgeAccount,
  brokerSettings, hedgeSettings,
  onClose
}: Props) {
  const { user } = useAuth();
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  // Editable parameters
  const [brokerLot, setBrokerLot] = useState(brokerSettings.default_lot_size);
  const [brokerSlPips, setBrokerSlPips] = useState(brokerSettings.default_sl_pips);
  const [brokerTpPips, setBrokerTpPips] = useState(brokerSettings.default_tp_pips);
  const [hedgeLot, setHedgeLot] = useState(hedgeSettings.default_lot_size);
  const [hedgeSlPips, setHedgeSlPips] = useState(hedgeSettings.default_sl_pips);
  const [hedgeTpPips, setHedgeTpPips] = useState(hedgeSettings.default_tp_pips);

  const brokerDir = bias;
  const hedgeDir = bias === "buy" ? "sell" : "buy";

  const bothConnected = brokerAccount.connection_status === "connected" && hedgeAccount.connection_status === "connected";

  // Calculate absolute SL/TP from pips + current price
  function calcSlTp(direction: "buy" | "sell", slPips: number, tpPips: number) {
    if (!currentPrice || currentPrice <= 0) return { sl: undefined, tp: undefined };
    const slDist = pipToPrice(slPips, asset);
    const tpDist = pipToPrice(tpPips, asset);
    if (direction === "buy") {
      return { sl: currentPrice - slDist, tp: currentPrice + tpDist };
    } else {
      return { sl: currentPrice + slDist, tp: currentPrice - tpDist };
    }
  }

  const brokerSlTp = calcSlTp(brokerDir, brokerSlPips, brokerTpPips);
  const hedgeSlTp = calcSlTp(hedgeDir, hedgeSlPips, hedgeTpPips);

  const handleExecute = async () => {
    if (!user || !bothConnected) return;
    setExecuting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const brokerPayload: Record<string, unknown> = {
        account_id: brokerAccount.id,
        asset,
        direction: brokerDir,
        lot_size: brokerLot,
        order_type: "market",
      };
      if (brokerSlTp.sl) brokerPayload.stop_loss = brokerSlTp.sl;
      if (brokerSlTp.tp) brokerPayload.take_profit = brokerSlTp.tp;

      const hedgePayload: Record<string, unknown> = {
        account_id: hedgeAccount.id,
        asset,
        direction: hedgeDir,
        lot_size: hedgeLot,
        order_type: "market",
      };
      if (hedgeSlTp.sl) hedgePayload.stop_loss = hedgeSlTp.sl;
      if (hedgeSlTp.tp) hedgePayload.take_profit = hedgeSlTp.tp;

      console.log("[DZ TradeSetup] Broker payload:", JSON.stringify(brokerPayload));
      console.log("[DZ TradeSetup] Hedge payload:", JSON.stringify(hedgePayload));

      const [brokerRes, hedgeRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/execute-trade`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify(brokerPayload),
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/execute-trade`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify(hedgePayload),
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

  const EditableField = ({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}:</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-6 w-20 text-[11px] font-mono px-1.5 py-0 text-right"
        />
        {suffix && <span className="text-[9px] text-muted-foreground/60">{suffix}</span>}
      </div>
    </div>
  );

  const renderOrderCard = (
    role: string,
    dir: "buy" | "sell",
    account: DZAccount,
    lot: number, setLot: (v: number) => void,
    slPips: number, setSlPips: (v: number) => void,
    tpPips: number, setTpPips: (v: number) => void,
    slTp: { sl?: number; tp?: number }
  ) => (
    <div className={cn(
      "rounded-xl border p-3 space-y-2",
      dir === "buy" ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
    )}>
      <div className="flex items-center gap-2">
        <Shield className={cn("h-4 w-4", role === "Broker" ? "text-blue-500" : "text-amber-500")} />
        <span className="text-xs font-bold text-foreground">{role}</span>
      </div>
      <div className="flex items-center gap-2">
        {dir === "buy"
          ? <TrendingUp className="h-5 w-5 text-emerald-500" />
          : <TrendingDown className="h-5 w-5 text-red-500" />}
        <span className={cn("text-lg font-bold font-mono", dir === "buy" ? "text-emerald-500" : "text-red-500")}>
          {dir.toUpperCase()}
        </span>
      </div>
      <div className="space-y-1.5">
        <EditableField label="Lot" value={lot} onChange={setLot} />
        <EditableField label="SL" value={slPips} onChange={setSlPips} suffix="pips" />
        <EditableField label="TP" value={tpPips} onChange={setTpPips} suffix="pips" />
        {currentPrice && slTp.sl && slTp.tp && (
          <div className="pt-1 border-t border-border/30 space-y-0.5">
            <p className="text-[9px] text-muted-foreground/60">
              SL: <span className="text-foreground font-mono">{slTp.sl.toFixed(asset.includes("JPY") ? 3 : 5)}</span>
            </p>
            <p className="text-[9px] text-muted-foreground/60">
              TP: <span className="text-foreground font-mono">{slTp.tp.toFixed(asset.includes("JPY") ? 3 : 5)}</span>
            </p>
          </div>
        )}
        <p className="font-mono text-muted-foreground/60 text-[10px]">{account.broker} · {account.account_name}</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Setup Dual-Account</h3>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[10px] text-muted-foreground">
            Bias: <span className={cn("font-bold", bias === "buy" ? "text-emerald-500" : "text-red-500")}>
              {bias.toUpperCase()}
            </span> · {asset} · {timeframe} · Confidence {confidence}/5
          </p>
          {currentPrice && (
            <span className="text-[10px] font-mono text-foreground/70">@ {currentPrice}</span>
          )}
        </div>
      </div>

      {/* Two cards */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderOrderCard("Broker", brokerDir, brokerAccount, brokerLot, setBrokerLot, brokerSlPips, setBrokerSlPips, brokerTpPips, setBrokerTpPips, brokerSlTp)}
          {renderOrderCard("Hedge", hedgeDir, hedgeAccount, hedgeLot, setHedgeLot, hedgeSlPips, setHedgeSlPips, hedgeTpPips, setHedgeTpPips, hedgeSlTp)}
        </div>

        {!currentPrice && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Prezzo corrente non disponibile dallo screenshot. SL/TP non verranno inviati.
            </p>
          </div>
        )}

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
