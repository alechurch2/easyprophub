import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Zap, Send, Shield, Radio, Clock, Calculator } from "lucide-react";
import { TradeExecutionModal } from "@/components/ai-review/TradeExecutionModal";
import { fullLotCalculationFromPrices } from "@/components/ai-review/lotSizeCalculator";

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

export function SharedSignals() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<SharedSignal[]>([]);
  const [tradingAccount, setTradingAccount] = useState<TradingAccount | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<SharedSignal | null>(null);

  useEffect(() => {
    loadSignals();
    if (user) loadAccount();
  }, [user]);

  const loadSignals = async () => {
    const { data } = await supabase
      .from("shared_signals")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .order("published_at", { ascending: false })
      .limit(5);
    if (data) setSignals(data as any);
  };

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
    if (n >= 4) return { label: "Forte", color: "bg-success/10 text-success border-success/20", emoji: "🟢" };
    if (n === 3) return { label: "Discreto", color: "bg-warning/10 text-warning border-warning/20", emoji: "🟡" };
    return { label: "Debole", color: "bg-destructive/10 text-destructive border-destructive/20", emoji: "🔴" };
  };

  const isBuy = (d: string) => d.toLowerCase().includes("buy");

  // Default risk for shared signals user-side calculation
  const USER_DEFAULT_RISK = 0.002;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
        <Radio className="h-4 w-4 text-primary" />
        <h2 className="font-heading font-semibold text-foreground">Segnali condivisi</h2>
        <Badge variant="outline" className="text-[10px] ml-1">Admin</Badge>
      </div>

      <div className="space-y-3">
        {signals.map((sig) => {
          const sInfo = strengthLabel(sig.signal_strength);
          const buy = isBuy(sig.direction);

          // Always recalculate lot based on user's account
          const userEquity = tradingAccount?.equity || null;
          const lotCalc = userEquity
            ? fullLotCalculationFromPrices(userEquity, sig.entry_price, sig.stop_loss, sig.take_profit, sig.asset, USER_DEFAULT_RISK)
            : null;

          console.log("[SharedSignals] Lot calc for user", {
            signalId: sig.id,
            asset: sig.asset,
            userEquity,
            riskUsed: USER_DEFAULT_RISK,
            entry: sig.entry_price,
            sl: sig.stop_loss,
            tp: sig.take_profit,
            calculatedLot: lotCalc?.lotSize ?? "N/A",
            adminLotSuggestion: sig.lot_size_suggestion,
          });

          return (
            <div
              key={sig.id}
              className={cn(
                "card-premium p-4 border-l-4 transition-all hover:shadow-md",
                buy ? "border-l-success" : "border-l-destructive"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {buy
                    ? <TrendingUp className="h-5 w-5 text-success" />
                    : <TrendingDown className="h-5 w-5 text-destructive" />
                  }
                  <span className="font-heading font-bold text-foreground text-lg">{sig.asset}</span>
                  <Badge className={cn("text-xs", buy ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    {sig.direction} {sig.order_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", sInfo.color)}>
                    <Zap className="h-3 w-3 mr-1" />
                    {sInfo.emoji} {sig.signal_strength}/5
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(sig.published_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>

              {/* Price levels */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-background/50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Entry</p>
                  <p className="text-sm font-semibold text-foreground">{sig.entry_price}</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Stop Loss</p>
                  <p className="text-sm font-semibold text-destructive">{sig.stop_loss}</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Take Profit</p>
                  <p className="text-sm font-semibold text-success">{sig.take_profit}</p>
                </div>
              </div>

              {sig.explanation && (
                <p className="text-xs text-muted-foreground mb-3">{sig.explanation}</p>
              )}

              {/* Lot calc from user account — always per-user */}
              {lotCalc && (
                <div className="bg-background/50 rounded-lg p-3 border border-border/50 mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calculator className="h-3 w-3 text-primary" />
                    <p className="text-[10px] text-primary font-medium">Calcolato sul tuo conto • Rischio {(USER_DEFAULT_RISK * 100).toFixed(1)}%</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Lotto</p>
                      <p className="text-sm font-bold text-foreground">{lotCalc.lotSize}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Rischio</p>
                      <p className="text-sm font-bold text-destructive">${lotCalc.riskAmount.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Profitto</p>
                      <p className="text-sm font-bold text-success">${lotCalc.theoreticalProfit?.toFixed(0) ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">R:R</p>
                      <p className="text-sm font-bold text-primary">1:{lotCalc.rrRatio ?? "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* No account — show signal without lot */}
              {!lotCalc && tradingAccount && (
                <div className="bg-background/50 rounded-lg p-2.5 border border-border/50 mb-3">
                  <p className="text-[10px] text-muted-foreground text-center">
                    Asset non supportato per il calcolo automatico del lotto
                  </p>
                </div>
              )}

              {/* Copy to account */}
              {canExecute && sig.signal_strength >= 3 && lotCalc ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => handleCopy(sig, lotCalc.lotSize)}
                >
                  <Send className="h-3.5 w-3.5 mr-2" />
                  Copia sul conto
                </Button>
              ) : tradingAccount && !canExecute ? (
                <div className="flex items-center gap-2 justify-center">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">
                    {tradingAccount.credential_mode !== "master" ? "Conto investor — sola lettura" :
                     !tradingAccount.trading_execution_enabled ? "Trading non abilitato" : "Conto non connesso"}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Trade execution modal */}
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
