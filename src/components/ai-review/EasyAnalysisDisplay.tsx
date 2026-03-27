import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Target, ShieldAlert, Clock, BarChart3, DollarSign, Zap, Timer, Send, Eye, Shield, ChevronDown, ChevronUp, ShieldCheck, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fullLotCalculationFromPrices } from "./lotSizeCalculator";
import { TradeExecutionModal } from "./TradeExecutionModal";
import { toast } from "sonner";

// ── Types ──

interface PrimarySignal {
  tipo: string;
  entry_range: string;
  stop_loss: string;
  take_profit: string;
  sl_pips?: number;
  tp_pips?: number;
  spiegazione: string;
}

interface PendingSetup {
  tipo: string;
  pending_strength?: number;
  entry_range: string;
  stop_loss: string;
  take_profit: string;
  sl_pips?: number;
  tp_pips?: number;
  spiegazione: string;
}

interface EasyAnalysis {
  leggibilita_immagine: string;
  signal_quality: string;
  setup_strength: number;
  primary_signal: PrimarySignal;
  pending_setups?: PendingSetup[];
  // Legacy compat
  setups?: any[];
  expected_duration: string;
  warning?: string;
  conclusione: string;
  contesto_mercato?: string;
  // Legacy no-setup fields
  no_setup_reason?: string;
  cosa_aspettare?: string;
  livello_prudenza?: string;
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
}

// ── Helpers ──

function strengthLabel(n: number): { label: string; color: string; emoji: string } {
  switch (n) {
    case 1: return { label: "Molto debole", color: "bg-destructive/10 text-destructive border-destructive/20", emoji: "🔴" };
    case 2: return { label: "Debole", color: "bg-destructive/10 text-destructive border-destructive/20", emoji: "🟠" };
    case 3: return { label: "Discreto", color: "bg-warning/10 text-warning border-warning/20", emoji: "🟡" };
    case 4: return { label: "Buono", color: "bg-success/10 text-success border-success/20", emoji: "🟢" };
    case 5: return { label: "Forte", color: "bg-success/10 text-success border-success/20", emoji: "💚" };
    default: return { label: "N/A", color: "bg-muted text-muted-foreground", emoji: "⚪" };
  }
}

function qualityColor(q: string) {
  switch (q?.toLowerCase()) {
    case "alta": return "bg-success/10 text-success border-success/20";
    case "media": return "bg-warning/10 text-warning border-warning/20";
    case "bassa": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground";
  }
}

function directionIcon(tipo: string, size = "h-5 w-5") {
  const t = tipo?.toLowerCase() || "";
  if (t.includes("buy")) return <TrendingUp className={cn(size, "text-success")} />;
  if (t.includes("sell")) return <TrendingDown className={cn(size, "text-destructive")} />;
  return null;
}

function directionBorderColor(tipo: string) {
  const t = tipo?.toLowerCase() || "";
  if (t.includes("buy")) return "border-success/30 bg-success/5";
  if (t.includes("sell")) return "border-destructive/30 bg-destructive/5";
  return "border-border";
}

function parsePrice(value: string): number {
  const nums = value?.match(/[\d.]+/g);
  if (!nums || nums.length === 0) return 0;
  if (nums.length >= 2) return (parseFloat(nums[0]) + parseFloat(nums[1])) / 2;
  return parseFloat(nums[0]);
}

// ── Component ──

export function EasyAnalysisDisplay({ analysis, accountSize, asset, reviewId, riskPercent }: { analysis: any; accountSize?: number; asset?: string; reviewId?: string; riskPercent?: number }) {
  const { user } = useAuth();
  const [tradingAccount, setTradingAccount] = useState<TradingAccount | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<{ signal: PrimarySignal | PendingSetup; lotCalc: any; orderType: string } | null>(null);
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTradingAccount();
  }, [user]);

  const loadTradingAccount = async () => {
    const { data } = await supabase
      .from("trading_accounts")
      .select("id, account_name, broker, platform, credential_mode, trading_execution_enabled, connection_status, read_only_mode")
      .eq("user_id", user!.id)
      .eq("connection_status", "connected")
      .limit(1);
    if (data && data.length > 0) setTradingAccount(data[0] as any);
    setAccountChecked(true);
  };

  if (!analysis) return null;

  // Normalize data: support both new format (primary_signal) and legacy (setups array)
  const raw = analysis as EasyAnalysis;
  let primarySignal: PrimarySignal | null = raw.primary_signal || null;
  let pendingSetups: PendingSetup[] = raw.pending_setups || [];
  const strength = raw.setup_strength || 3;
  const strengthInfo = strengthLabel(strength);

  // Legacy compat: if old format with setups[] but no primary_signal
  if (!primarySignal && raw.setups && raw.setups.length > 0) {
    const first = raw.setups[0];
    primarySignal = {
      tipo: first.tipo?.includes("Buy") ? "Buy" : "Sell",
      entry_range: first.entry_range,
      stop_loss: first.stop_loss,
      take_profit: first.take_profit,
      sl_pips: first.sl_pips,
      tp_pips: first.tp_pips,
      spiegazione: first.spiegazione,
    };
    if (raw.setups.length > 1) {
      pendingSetups = raw.setups.slice(1).map((s: any) => ({
        ...s,
        pending_strength: strength,
      }));
    }
  }

  const isSignalCopyable = strength >= 3;

  const canExecuteTrade = tradingAccount &&
    tradingAccount.credential_mode === "master" &&
    tradingAccount.trading_execution_enabled &&
    tradingAccount.connection_status === "connected";

  const getAccountIneligibleReason = (): string | null => {
    if (!accountChecked) return null;
    if (!tradingAccount) return "Nessun conto collegato";
    if (tradingAccount.credential_mode !== "master") return "Conto collegato con password investor";
    if (!tradingAccount.trading_execution_enabled) return "Trading non abilitato per questo conto";
    if (tradingAccount.connection_status !== "connected") return "Conto non connesso";
    return null;
  };

  const handleCopy = (signal: PrimarySignal | PendingSetup, lotCalc: any, orderType: string) => {
    setSelectedTrade({ signal, lotCalc, orderType });
    setTradeModalOpen(true);
  };

  const effectiveRisk = riskPercent && riskPercent > 0 ? riskPercent : 0.002;

  // Lot calc helper
  const calcLot = (signal: PrimarySignal | PendingSetup) => {
    const entryPrice = parsePrice(signal.entry_range);
    const slPrice = parsePrice(signal.stop_loss);
    const tpPrice = parsePrice(signal.take_profit);
    if (!accountSize || !asset || entryPrice <= 0 || slPrice <= 0 || tpPrice <= 0) return null;
    return fullLotCalculationFromPrices(accountSize, entryPrice, slPrice, tpPrice, asset, effectiveRisk);
  };

  const primaryLotCalc = primarySignal ? calcLot(primarySignal) : null;

  return (
    <div className="space-y-4">
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={cn("text-sm px-3 py-1", qualityColor(raw.signal_quality))}>
          <BarChart3 className="h-3.5 w-3.5 mr-1" />
          Qualità: {raw.signal_quality || "N/A"}
        </Badge>
        <Badge className={cn("text-sm px-3 py-1", strengthInfo.color)}>
          <Zap className="h-3.5 w-3.5 mr-1" />
          Forza: {strengthInfo.emoji} {strength}/5 — {strengthInfo.label}
        </Badge>
        {raw.expected_duration && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Clock className="h-3.5 w-3.5 mr-1" />
            {raw.expected_duration}
          </Badge>
        )}
        <Badge variant="outline" className="text-xs px-2 py-0.5">
          {raw.leggibilita_immagine}
        </Badge>
        {effectiveRisk && (
          <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-primary/30 text-primary">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Rischio: {(effectiveRisk * 100).toFixed(2).replace(/\.?0+$/, '')}%
          </Badge>
        )}
      </div>

      {/* Signal copyability banner */}
      {isSignalCopyable ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-2.5">
          <Shield className="h-4 w-4 text-success flex-shrink-0" />
          <p className="text-sm text-success font-medium">Segnale copiabile con prudenza</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
          <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">Segnale non consigliato da copiare — forza {strength}/5</p>
        </div>
      )}

      {/* Contesto mercato */}
      {raw.contesto_mercato && (
        <div className="card-premium p-4 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Contesto di mercato</span>
          </div>
          <p className="text-sm text-foreground">{raw.contesto_mercato}</p>
        </div>
      )}

      {/* ═══════ PRIMARY MARKET SIGNAL ═══════ */}
      {primarySignal && (
        <div className={cn("rounded-xl border-2 p-5 space-y-3", directionBorderColor(primarySignal.tipo))}>
          {/* Header */}
          <div className="flex items-center gap-3">
            {directionIcon(primarySignal.tipo, "h-6 w-6")}
            <div className="flex-1">
              <h3 className="font-heading font-bold text-foreground text-lg">
                {primarySignal.tipo} Market
              </h3>
              <p className="text-xs text-muted-foreground">Segnale principale — ordine a mercato</p>
            </div>
            <Badge variant="outline" className="text-xs px-2.5 py-1 border-primary/40 text-primary">
              <Zap className="h-3 w-3 mr-1" />
              Market
            </Badge>
          </div>

          {/* Price levels */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Entry</p>
              <p className="text-sm font-semibold text-foreground">{primarySignal.entry_range}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Stop Loss</p>
              <p className="text-sm font-semibold text-destructive">{primarySignal.stop_loss}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Take Profit</p>
              <p className="text-sm font-semibold text-success">{primarySignal.take_profit}</p>
            </div>
          </div>

          {/* Lot size calculation */}
          {primaryLotCalc && (
            <div className="bg-background/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground uppercase">Calcolo lottaggio</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Lotto</p>
                  <p className="text-sm font-bold text-foreground">{primaryLotCalc.lotSize}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Rischio</p>
                  <p className="text-sm font-bold text-destructive">${primaryLotCalc.riskAmount.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Profitto teorico</p>
                  <p className="text-sm font-bold text-success">${primaryLotCalc.theoreticalProfit?.toFixed(0) ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">R:R</p>
                  <p className="text-sm font-bold text-primary">1:{primaryLotCalc.rrRatio ?? "N/A"}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{primaryLotCalc.formula}</p>
            </div>
          )}

          <p className="text-sm text-foreground">{primarySignal.spiegazione}</p>

          {/* Copy to account — primary */}
          {accountChecked && primaryLotCalc && (
            <div className="pt-2 border-t border-border/50">
              {canExecuteTrade && isSignalCopyable ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => handleCopy(primarySignal!, primaryLotCalc, "market")}
                >
                  <Send className="h-3.5 w-3.5 mr-2" />
                  Copia sul conto (Market)
                </Button>
              ) : canExecuteTrade && !isSignalCopyable ? (
                <div className="text-center">
                  <p className="text-[10px] text-destructive">
                    Segnale con forza {strength}/5 — copia non consigliata
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">
                    {getAccountIneligibleReason()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════ PENDING SETUPS (SECONDARY) ═══════ */}
      {pendingSetups.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPending(!showPending)}
            className="flex items-center gap-2 w-full text-left px-1 py-1 hover:opacity-80 transition-opacity"
          >
            {showPending ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Setup aggiuntivi — Ordini pending ({pendingSetups.length})
            </span>
          </button>

          {showPending && pendingSetups.map((setup, i) => {
            const lotCalc = calcLot(setup);
            const pStrength = setup.pending_strength || 3;
            const pStrengthInfo = strengthLabel(pStrength);
            const isPendingCopyable = pStrength >= 3;

            return (
              <div key={i} className={cn("rounded-xl border p-4 space-y-3", directionBorderColor(setup.tipo), "opacity-90")}>
                <div className="flex items-center gap-3">
                  {directionIcon(setup.tipo)}
                  <div className="flex-1">
                    <h4 className="font-heading font-semibold text-foreground text-base">{setup.tipo}</h4>
                    <p className="text-xs text-muted-foreground">Setup aggiuntivo — ordine pending</p>
                  </div>
                  <Badge variant="outline" className="text-xs px-2 py-0.5 border-warning/40 text-warning">
                    <Timer className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                  <Badge className={cn("text-xs px-2 py-0.5", pStrengthInfo.color)}>
                    {pStrengthInfo.emoji} {pStrength}/5
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background/50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Entry</p>
                    <p className="text-sm font-semibold text-foreground">{setup.entry_range}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Stop Loss</p>
                    <p className="text-sm font-semibold text-destructive">{setup.stop_loss}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Take Profit</p>
                    <p className="text-sm font-semibold text-success">{setup.take_profit}</p>
                  </div>
                </div>

                {lotCalc && (
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
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
                        <p className="text-sm font-bold text-success">${lotCalc.theoreticalProfit?.toFixed(0) ?? "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">R:R</p>
                        <p className="text-sm font-bold text-primary">1:{lotCalc.rrRatio ?? "N/A"}</p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-sm text-foreground">{setup.spiegazione}</p>

                {accountChecked && lotCalc && canExecuteTrade && isPendingCopyable && (
                  <div className="pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-warning/30 text-warning hover:bg-warning/10 text-xs"
                      onClick={() => handleCopy(setup, lotCalc, "limit")}
                    >
                      <Send className="h-3 w-3 mr-1.5" />
                      Copia sul conto (Pending)
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warning */}
      {raw.warning && (
        <div className="card-premium p-4 border-warning/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-xs font-medium text-warning uppercase">Attenzione</span>
          </div>
          <p className="text-sm text-foreground">{raw.warning}</p>
        </div>
      )}

      {/* Conclusion */}
      <div className="card-premium p-4 border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase">Conclusione</span>
        </div>
        <p className="text-sm text-foreground">{raw.conclusione}</p>
      </div>

      {/* Trade execution modal */}
      {selectedTrade && tradingAccount && (
        <TradeExecutionModal
          open={tradeModalOpen}
          onClose={() => { setTradeModalOpen(false); setSelectedTrade(null); }}
          trade={{
            asset: asset || "N/A",
            direction: selectedTrade.signal.tipo,
            orderType: selectedTrade.orderType,
            entryPrice: parsePrice(selectedTrade.signal.entry_range),
            stopLoss: parsePrice(selectedTrade.signal.stop_loss),
            takeProfit: parsePrice(selectedTrade.signal.take_profit),
            lotSize: selectedTrade.lotCalc.lotSize,
            signalQuality: raw.signal_quality,
          }}
          account={{
            id: tradingAccount.id,
            account_name: tradingAccount.account_name,
            broker: tradingAccount.broker,
            platform: tradingAccount.platform,
          }}
          reviewId={reviewId}
        />
      )}
    </div>
  );
}
