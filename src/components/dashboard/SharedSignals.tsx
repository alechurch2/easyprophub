import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Zap, Send, Shield, Radio, Clock, Calculator, ArrowUpRight, ArrowDownRight, Info, Settings, Lock } from "lucide-react";
import { TradeExecutionModal } from "@/components/ai-review/TradeExecutionModal";
import { fullLotCalculationFromPrices } from "@/components/ai-review/lotSizeCalculator";
import { SignalStatusBadge, isSignalCopyable, getUncopyableMessage } from "./SignalStatusBadge";
import { useRiskPreferences } from "@/hooks/useRiskPreferences";

interface SharedSignal {
  id: string;
  asset: string;
  direction: string;
  order_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  lot_size_suggestion: number | null;
  signal_strength: number;
  signal_quality: string | null;
  explanation: string | null;
  published_at: string;
  review_id: string | null;
  signal_status: string;
  signal_source?: string;
}

interface TradingAccount {
  id: string;
  account_name: string;
  broker: string | null;
  platform: string;
  credential_mode: string;
  trading_execution_enabled: boolean;
  connection_status: string;
  read_only_mode: boolean;
  equity: number | null;
}

export function SharedSignals({ isFreeUser = false }: { isFreeUser?: boolean }) {
  const { user } = useAuth();
  const [signals, setSignals] = useState<SharedSignal[]>([]);
  const [tradingAccount, setTradingAccount] = useState<TradingAccount | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<SharedSignal | null>(null);
  const { prefs, getRiskContext, loading: riskLoading } = useRiskPreferences();

  const loadSignals = async () => {
    const { data } = await supabase
      .from("shared_signals")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .eq("signal_status", "active")
      .order("published_at", { ascending: false })
      .limit(10);
    if (data) setSignals(data as any);
  };

  useEffect(() => {
    loadSignals();
    if (user) loadAccount();

    const channel = supabase
      .channel("shared-signals-active")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_signals" }, () => {
        loadSignals();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadAccount = async () => {
    const { data } = await supabase
      .from("trading_accounts")
      .select("id, account_name, broker, platform, credential_mode, trading_execution_enabled, connection_status, read_only_mode, equity")
      .eq("user_id", user!.id)
      .eq("connection_status", "connected")
      .limit(1);
    if (data && data.length > 0) setTradingAccount(data[0] as any);
  };

  if (signals.length === 0) return null;

  const canExecute = tradingAccount &&
    tradingAccount.credential_mode === "master" &&
    tradingAccount.trading_execution_enabled &&
    tradingAccount.connection_status === "connected";

  const handleCopy = (signal: SharedSignal, lotSize: number) => {
    setSelectedSignal({ ...signal, lot_size_suggestion: lotSize });
    setTradeModalOpen(true);
  };

  const strengthLabel = (n: number) => {
    if (n >= 4) return { label: "Forte", color: "bg-success/8 text-success border-success/15", dot: "bg-success" };
    if (n === 3) return { label: "Discreto", color: "bg-warning/8 text-warning border-warning/15", dot: "bg-warning" };
    return { label: "Debole", color: "bg-destructive/8 text-destructive border-destructive/15", dot: "bg-destructive" };
  };

  const isBuy = (d: string) => d.toLowerCase().includes("buy");
  const riskCtx = getRiskContext();

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
          <p className="text-label uppercase text-muted-foreground/50 font-semibold">Segnali condivisi</p>
          <Badge variant="outline" className="text-[9px] ml-0.5 px-1.5">LIVE</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {signals.map((sig) => {
          const sInfo = strengthLabel(sig.signal_strength);
          const buy = isBuy(sig.direction);
          const lotCalc = riskCtx.isConfigured
            ? fullLotCalculationFromPrices(riskCtx.effectiveAccountSize, sig.entry_price, sig.stop_loss, sig.take_profit, sig.asset, riskCtx.riskPercent)
            : null;
          const copyable = isSignalCopyable(sig.signal_status);

          return (
            <div
              key={sig.id}
              className="card-elevated p-0 overflow-hidden transition-all hover:shadow-lg"
            >
              {/* Signal header bar */}
              <div className={cn(
                "px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2",
                buy ? "bg-success/[0.04]" : "bg-destructive/[0.04]"
              )}>
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    buy ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    {buy ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-foreground text-base">{sig.asset}</span>
                      <Badge className={cn("text-[10px]", buy ? "bg-success/8 text-success border-success/15" : "bg-destructive/8 text-destructive border-destructive/15")}>
                        {sig.direction} {sig.order_type}
                      </Badge>
                      <SignalStatusBadge status={sig.signal_status} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-[42px] sm:ml-0">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={cn(
                        "h-1.5 w-3 rounded-full transition-colors",
                        i <= sig.signal_strength ? sInfo.dot : "bg-muted-foreground/10"
                      )} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 font-mono-data">
                    {new Date(sig.published_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Price levels */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Entry", value: sig.entry_price, color: "text-foreground", blur: false },
                    { label: "Stop Loss", value: sig.stop_loss, color: "text-destructive", blur: isFreeUser },
                    { label: "Take Profit", value: sig.take_profit, color: "text-success", blur: isFreeUser },
                  ].map(p => (
                    <div key={p.label} className="panel-inset p-2.5 text-center">
                      <p className="text-[9px] uppercase text-muted-foreground/50 font-semibold tracking-wider mb-0.5">{p.label}</p>
                      <p className={cn("text-sm font-mono-data font-bold", p.color)}>
                        {p.blur ? <span className="blur-[5px] select-none pointer-events-none">{p.value}</span> : p.value}
                      </p>
                    </div>
                  ))}
                </div>

                {sig.explanation && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{sig.explanation}</p>
                )}

                {/* Lot calc — hidden for Free */}
                {!isFreeUser && lotCalc && copyable && (
                  <div className="panel-inset p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calculator className="h-3 w-3 text-primary/60" />
                      <p className="text-[10px] text-primary/80 font-medium">{riskCtx.sourceLabel} • Rischio {(riskCtx.riskPercent * 100).toFixed(1)}%</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "Lotto", value: lotCalc.lotSize, color: "text-foreground" },
                        { label: "Rischio", value: `$${lotCalc.riskAmount.toFixed(0)}`, color: "text-destructive" },
                        { label: "Profitto", value: lotCalc.theoreticalProfit ? `$${lotCalc.theoreticalProfit.toFixed(0)}` : "—", color: "text-success" },
                        { label: "R:R", value: lotCalc.rrRatio ? `1:${lotCalc.rrRatio}` : "—", color: "text-primary" },
                      ].map(d => (
                        <div key={d.label}>
                          <p className="text-[9px] text-muted-foreground/50 uppercase font-semibold">{d.label}</p>
                          <p className={cn("text-sm font-mono-data font-bold", d.color)}>{d.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isFreeUser && !lotCalc && riskCtx.isConfigured && copyable && (
                  <div className="panel-inset p-2.5">
                    <p className="text-[10px] text-muted-foreground/50 text-center">
                      Asset non supportato per il calcolo automatico del lotto
                    </p>
                  </div>
                )}

                {!isFreeUser && !riskCtx.isConfigured && copyable && (
                  <div className="panel-inset p-3 flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                    <p className="text-[10px] text-muted-foreground">
                      Per calcolare rischio e lottaggio, imposta la grandezza del conto nelle <a href="/account-settings" className="text-primary underline underline-offset-2">Impostazioni</a>.
                    </p>
                  </div>
                )}

                {/* Free upsell */}
                {isFreeUser && (
                  <div className="panel-inset p-3 rounded-xl text-center space-y-1.5">
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-primary/60" />
                      <span className="text-[11px] font-medium text-muted-foreground/80">
                        Parametri operativi riservati ai piani Pro e Live
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50">
                      SL, TP, lottaggio, rischio e profitto teorico disponibili con un piano attivo
                    </p>
                  </div>
                )}

                {/* Non-copyable message */}
                {!copyable && (
                  <div className="panel-inset p-2.5 flex items-center gap-2 justify-center">
                    <Info className="h-3 w-3 text-muted-foreground/50" />
                    <p className="text-[10px] text-muted-foreground/60 font-medium">
                      {getUncopyableMessage(sig.signal_status)}
                    </p>
                  </div>
                )}

                {/* Action — hidden for Free */}
                {!isFreeUser && copyable && canExecute && sig.signal_strength >= 3 && lotCalc ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-primary/20 text-primary hover:bg-primary/8"
                    onClick={() => handleCopy(sig, lotCalc.lotSize)}
                  >
                    <Send className="h-3.5 w-3.5 mr-2" />
                    Copia sul conto
                  </Button>
                ) : !isFreeUser && copyable && tradingAccount && !canExecute ? (
                  <div className="flex items-center gap-2 justify-center py-1">
                    <Shield className="h-3 w-3 text-muted-foreground/40" />
                    <p className="text-[10px] text-muted-foreground/50">
                      {tradingAccount.credential_mode !== "master" ? "Conto investor — sola lettura" :
                       !tradingAccount.trading_execution_enabled ? "Trading non abilitato" : "Conto non connesso"}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {selectedSignal && tradingAccount && (
        <TradeExecutionModal
          open={tradeModalOpen}
          onClose={() => { setTradeModalOpen(false); setSelectedSignal(null); }}
          trade={{
            asset: selectedSignal.asset,
            direction: selectedSignal.direction,
            orderType: selectedSignal.order_type,
            entryPrice: selectedSignal.entry_price,
            stopLoss: selectedSignal.stop_loss,
            takeProfit: selectedSignal.take_profit,
            lotSize: selectedSignal.lot_size_suggestion || 0.01,
            signalQuality: selectedSignal.signal_quality || "N/A",
            signalStrength: selectedSignal.signal_strength,
            riskPercent: riskCtx.riskPercent,
          }}
          account={{
            id: tradingAccount.id,
            account_name: tradingAccount.account_name,
            broker: tradingAccount.broker,
            platform: tradingAccount.platform,
          }}
          reviewId={selectedSignal.review_id || undefined}
        />
      )}
    </div>
  );
}
