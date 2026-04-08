import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Target, ShieldAlert, Clock, BarChart3, DollarSign, Zap, Timer, Send, Eye, Shield, ChevronDown, ChevronUp, ShieldCheck, Radio, Crosshair, ArrowDownToLine, ArrowUpToLine, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fullLotCalculationFromPrices } from "./lotSizeCalculator";
import { TradeExecutionModal } from "./TradeExecutionModal";
import { formatSignalNotificationToast, invokeSignalNotification } from "@/lib/signalNotifications";
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
  setups?: any[];
  expected_duration: string;
  warning?: string;
  conclusione: string;
  contesto_mercato?: string;
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

function strengthLabel(n: number): { label: string; color: string; emoji: string; barColor: string } {
  switch (n) {
    case 1: return { label: "Molto debole", color: "bg-destructive/10 text-destructive border-destructive/20", emoji: "🔴", barColor: "bg-destructive" };
    case 2: return { label: "Debole", color: "bg-destructive/10 text-destructive border-destructive/20", emoji: "🟠", barColor: "bg-destructive" };
    case 3: return { label: "Discreto", color: "bg-warning/10 text-warning border-warning/20", emoji: "🟡", barColor: "bg-warning" };
    case 4: return { label: "Buono", color: "bg-success/10 text-success border-success/20", emoji: "🟢", barColor: "bg-success" };
    case 5: return { label: "Forte", color: "bg-success/10 text-success border-success/20", emoji: "💚", barColor: "bg-success" };
    default: return { label: "N/A", color: "bg-muted text-muted-foreground", emoji: "⚪", barColor: "bg-muted" };
  }
}

function qualityBadgeStyle(q: string) {
  switch (q?.toLowerCase()) {
    case "alta": return "bg-success/10 text-success border-success/20";
    case "media": return "bg-warning/10 text-warning border-warning/20";
    case "bassa": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground";
  }
}

function directionConfig(tipo: string) {
  const t = tipo?.toLowerCase() || "";
  if (t.includes("buy")) return { icon: TrendingUp, colorClass: "text-success", bgClass: "bg-success", borderClass: "border-success/40", heroBg: "from-success/10 via-success/5 to-transparent" };
  if (t.includes("sell")) return { icon: TrendingDown, colorClass: "text-destructive", bgClass: "bg-destructive", borderClass: "border-destructive/40", heroBg: "from-destructive/10 via-destructive/5 to-transparent" };
  return { icon: TrendingUp, colorClass: "text-muted-foreground", bgClass: "bg-muted", borderClass: "border-border", heroBg: "from-muted/10 to-transparent" };
}

function parsePrice(value: string): number {
  const nums = value?.match(/[\d.]+/g);
  if (!nums || nums.length === 0) return 0;
  if (nums.length >= 2) return (parseFloat(nums[0]) + parseFloat(nums[1])) / 2;
  return parseFloat(nums[0]);
}

// ── Strength Gauge ──
function StrengthGauge({ strength, label: lbl }: { strength: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-300",
              i <= strength
                ? strength >= 4 ? "bg-success" : strength === 3 ? "bg-warning" : "bg-destructive"
                : "bg-muted/60",
              i <= strength ? "h-2.5 w-5 sm:w-6" : "h-2 w-4 sm:w-5"
            )}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{strength}/5 — {lbl}</span>
    </div>
  );
}

// ── Copyability Status ──
function CopyabilityStatus({ strength }: { strength: number }) {
  if (strength >= 4) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-gradient-to-r from-success/8 to-transparent px-3 py-2">
        <Shield className="h-4 w-4 text-success flex-shrink-0" />
        <p className="text-xs sm:text-sm text-success font-medium">Segnale copiabile</p>
      </div>
    );
  }
  if (strength === 3) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/25 bg-gradient-to-r from-warning/8 to-transparent px-3 py-2">
        <ShieldAlert className="h-4 w-4 text-warning flex-shrink-0" />
        <p className="text-xs sm:text-sm text-warning font-medium">Copiabile con prudenza</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-gradient-to-r from-destructive/8 to-transparent px-3 py-2">
      <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0" />
      <p className="text-xs sm:text-sm text-destructive font-medium">Copia non consigliata</p>
    </div>
  );
}

// ── Component ──

export function EasyAnalysisDisplay({ analysis, accountSize, asset, reviewId, riskPercent }: { analysis: any; accountSize?: number; asset?: string; reviewId?: string; riskPercent?: number }) {
  const { user, isAdmin } = useAuth();
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

  const raw = analysis as EasyAnalysis;
  let primarySignal: PrimarySignal | null = raw.primary_signal || null;
  let pendingSetups: PendingSetup[] = raw.pending_setups || [];
  const strength = raw.setup_strength || 3;
  const strengthInfo = strengthLabel(strength);

  // Legacy compat
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

  const calcLot = (signal: PrimarySignal | PendingSetup) => {
    const entryPrice = parsePrice(signal.entry_range);
    const slPrice = parsePrice(signal.stop_loss);
    const tpPrice = parsePrice(signal.take_profit);
    if (!accountSize || !asset || entryPrice <= 0 || slPrice <= 0 || tpPrice <= 0) return null;
    return fullLotCalculationFromPrices(accountSize, entryPrice, slPrice, tpPrice, asset, effectiveRisk);
  };

  const primaryLotCalc = primarySignal ? calcLot(primarySignal) : null;
  const dir = primarySignal ? directionConfig(primarySignal.tipo) : directionConfig("");
  const DirIcon = dir.icon;

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ═══════ HERO SIGNAL CARD ═══════ */}
      {primarySignal && (
        <div className={cn(
          "relative rounded-2xl border-2 overflow-hidden",
          dir.borderClass
        )}>
          {/* Gradient header band */}
          <div className={cn("bg-gradient-to-r px-4 sm:px-5 pt-4 sm:pt-5 pb-3", dir.heroBg)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn("flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-xl", dir.bgClass + "/15")}>
                  <DirIcon className={cn("h-5 w-5 sm:h-6 sm:w-6", dir.colorClass)} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-foreground text-lg sm:text-xl leading-tight">
                    {primarySignal.tipo}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary h-4">
                      Market
                    </Badge>
                    {raw.expected_duration && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {raw.expected_duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <StrengthGauge strength={strength} label={strengthInfo.label} />
            </div>
          </div>

          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 sm:space-y-4">
            {/* Signal quality + copyability row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 sm:pt-4">
              <div className="flex items-center gap-2 flex-1">
                <Badge className={cn("text-xs px-2.5 py-0.5 border", qualityBadgeStyle(raw.signal_quality))}>
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Qualità {raw.signal_quality || "N/A"}
                </Badge>
                {effectiveRisk && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/25 text-primary">
                    <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                    {(effectiveRisk * 100).toFixed(2).replace(/\.?0+$/, '')}%
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                  {raw.leggibilita_immagine}
                </Badge>
              </div>
              <CopyabilityStatus strength={strength} />
            </div>

            {/* ── Price Levels ── */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="panel-inset rounded-xl p-2.5 sm:p-3 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/40 rounded-full" />
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Crosshair className="h-3 w-3 text-primary" />
                  <p className="text-[9px] sm:text-[10px] uppercase font-semibold text-primary tracking-wider">Entry</p>
                </div>
                <p className="text-sm sm:text-base font-bold font-mono-data text-foreground">{primarySignal.entry_range}</p>
              </div>
              <div className="panel-inset rounded-xl p-2.5 sm:p-3 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-destructive/50 rounded-full" />
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowDownToLine className="h-3 w-3 text-destructive" />
                  <p className="text-[9px] sm:text-[10px] uppercase font-semibold text-destructive tracking-wider">SL</p>
                </div>
                <p className="text-sm sm:text-base font-bold font-mono-data text-destructive">{primarySignal.stop_loss}</p>
              </div>
              <div className="panel-inset rounded-xl p-2.5 sm:p-3 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-success/50 rounded-full" />
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowUpToLine className="h-3 w-3 text-success" />
                  <p className="text-[9px] sm:text-[10px] uppercase font-semibold text-success tracking-wider">TP</p>
                </div>
                <p className="text-sm sm:text-base font-bold font-mono-data text-success">{primarySignal.take_profit}</p>
              </div>
            </div>

            {/* ── Lot Sizing Panel ── */}
            {primaryLotCalc && (
              <div className="panel-inset rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/10">
                    <DollarSign className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-foreground uppercase tracking-wider">Dimensionamento</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-card rounded-lg p-2 sm:p-2.5 text-center border border-border/40">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase mb-0.5">Lotto</p>
                    <p className="text-base sm:text-lg font-bold font-mono-data text-foreground">{primaryLotCalc.lotSize}</p>
                  </div>
                  <div className="bg-card rounded-lg p-2 sm:p-2.5 text-center border border-border/40">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase mb-0.5">Rischio</p>
                    <p className="text-base sm:text-lg font-bold font-mono-data text-destructive">${primaryLotCalc.riskAmount.toFixed(0)}</p>
                  </div>
                  <div className="bg-card rounded-lg p-2 sm:p-2.5 text-center border border-border/40">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase mb-0.5">Profitto</p>
                    <p className="text-base sm:text-lg font-bold font-mono-data text-success">${primaryLotCalc.theoreticalProfit?.toFixed(0) ?? "—"}</p>
                  </div>
                  <div className="bg-card rounded-lg p-2 sm:p-2.5 text-center border border-border/40">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase mb-0.5">R:R</p>
                    <p className="text-base sm:text-lg font-bold font-mono-data text-primary">1:{primaryLotCalc.rrRatio ?? "—"}</p>
                  </div>
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-2 font-mono-data">{primaryLotCalc.formula}</p>
              </div>
            )}

            {/* ── Setup Explanation ── */}
            <div className="panel-inset rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] sm:text-xs font-semibold text-foreground uppercase tracking-wider">Analisi setup</span>
              </div>
              <p className="text-[13px] sm:text-sm text-foreground/90 leading-relaxed">{primarySignal.spiegazione}</p>
            </div>

            {/* ── Copy to Account CTA ── */}
            {accountChecked && primaryLotCalc && (
              <div className="pt-1">
                {canExecuteTrade && isSignalCopyable ? (
                  <Button
                    className={cn(
                      "w-full h-11 sm:h-12 rounded-xl font-semibold text-sm",
                      "bg-gradient-to-r shadow-md",
                      primarySignal.tipo.toLowerCase().includes("buy")
                        ? "from-success/90 to-success hover:from-success hover:to-success/90 text-success-foreground shadow-success/20"
                        : "from-destructive/90 to-destructive hover:from-destructive hover:to-destructive/90 text-destructive-foreground shadow-destructive/20"
                    )}
                    onClick={() => handleCopy(primarySignal!, primaryLotCalc, "market")}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Copia sul conto
                  </Button>
                ) : canExecuteTrade && !isSignalCopyable ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/20 bg-destructive/5">
                    <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                    <p className="text-xs text-destructive font-medium">Forza {strength}/5 — copia non consigliata</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 bg-muted/30">
                    <p className="text-xs text-muted-foreground">{getAccountIneligibleReason()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MARKET CONTEXT ═══════ */}
      {raw.contesto_mercato && (
        <div className="panel-inset rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] sm:text-xs font-semibold text-foreground uppercase tracking-wider">Contesto di mercato</span>
          </div>
          <p className="text-[13px] sm:text-sm text-foreground/90 leading-relaxed">{raw.contesto_mercato}</p>
        </div>
      )}

      {/* ═══════ PENDING SETUPS ═══════ */}
      {pendingSetups.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPending(!showPending)}
            className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl border border-border/50 bg-card hover:bg-accent/30 transition-colors"
          >
            {showPending ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            <Timer className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex-1">
              Ordini pending ({pendingSetups.length})
            </span>
            <Badge variant="outline" className="text-[10px] px-2 py-0 border-warning/30 text-warning h-5">
              Pending
            </Badge>
          </button>

          {showPending && pendingSetups.map((setup, i) => {
            const lotCalc = calcLot(setup);
            const pStrength = setup.pending_strength || 3;
            const pStrengthInfo = strengthLabel(pStrength);
            const isPendingCopyable = pStrength >= 3;
            const pDir = directionConfig(setup.tipo);
            const PDirIcon = pDir.icon;

            return (
              <div key={i} className={cn("rounded-xl border p-3 sm:p-4 space-y-3", pDir.borderClass, "bg-card")}>
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex items-center justify-center h-8 w-8 rounded-lg", pDir.bgClass + "/10")}>
                    <PDirIcon className={cn("h-4 w-4", pDir.colorClass)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-semibold text-foreground text-sm sm:text-base">{setup.tipo}</h4>
                    <p className="text-[10px] text-muted-foreground">Ordine pending</p>
                  </div>
                  <StrengthGauge strength={pStrength} label={pStrengthInfo.label} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="panel-inset rounded-lg p-2 text-center">
                    <p className="text-[9px] uppercase text-primary font-semibold mb-0.5">Entry</p>
                    <p className="text-xs sm:text-sm font-bold font-mono-data text-foreground">{setup.entry_range}</p>
                  </div>
                  <div className="panel-inset rounded-lg p-2 text-center">
                    <p className="text-[9px] uppercase text-destructive font-semibold mb-0.5">SL</p>
                    <p className="text-xs sm:text-sm font-bold font-mono-data text-destructive">{setup.stop_loss}</p>
                  </div>
                  <div className="panel-inset rounded-lg p-2 text-center">
                    <p className="text-[9px] uppercase text-success font-semibold mb-0.5">TP</p>
                    <p className="text-xs sm:text-sm font-bold font-mono-data text-success">{setup.take_profit}</p>
                  </div>
                </div>

                {lotCalc && (
                  <div className="panel-inset rounded-lg p-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Lotto</p>
                        <p className="text-sm font-bold font-mono-data text-foreground">{lotCalc.lotSize}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Rischio</p>
                        <p className="text-sm font-bold font-mono-data text-destructive">${lotCalc.riskAmount.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Profitto</p>
                        <p className="text-sm font-bold font-mono-data text-success">${lotCalc.theoreticalProfit?.toFixed(0) ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">R:R</p>
                        <p className="text-sm font-bold font-mono-data text-primary">1:{lotCalc.rrRatio ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-[13px] sm:text-sm text-foreground/80 leading-relaxed">{setup.spiegazione}</p>

                {accountChecked && lotCalc && canExecuteTrade && isPendingCopyable && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-warning/30 text-warning hover:bg-warning/10 text-xs rounded-lg"
                    onClick={() => handleCopy(setup, lotCalc, "limit")}
                  >
                    <Send className="h-3 w-3 mr-1.5" />
                    Copia sul conto (Pending)
                  </Button>
                )}

                {/* Admin publish per pending */}
                {isAdmin && pStrength >= 3 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs rounded-lg"
                    onClick={async () => {
                      const entryPrice = parsePrice(setup.entry_range);
                      const slPrice = parsePrice(setup.stop_loss);
                      const tpPrice = parsePrice(setup.take_profit);
                      const { data: insertedSignal, error } = await supabase.from("shared_signals").insert({
                        review_id: reviewId || null,
                        created_by: user!.id,
                        asset: asset || "N/A",
                        direction: setup.tipo.includes("Buy") ? "Buy" : "Sell",
                        order_type: setup.tipo.toLowerCase().includes("limit") ? "limit" : setup.tipo.toLowerCase().includes("stop") ? "stop" : "pending",
                        entry_price: entryPrice,
                        stop_loss: slPrice,
                        take_profit: tpPrice,
                        lot_size_suggestion: lotCalc?.lotSize || null,
                        signal_strength: pStrength,
                        signal_quality: raw.signal_quality,
                        explanation: setup.spiegazione || raw.conclusione,
                        is_published: true,
                      } as any).select("*").single();
                      if (error || !insertedSignal) {
                        toast.error("Errore nella pubblicazione del segnale");
                      } else {
                        const notifyOutcome = await invokeSignalNotification({
                          signal: insertedSignal as any,
                          currentPublished: false,
                          nextPublished: true,
                          source: "easy-analysis-pending",
                        });
                        if (notifyOutcome.error) {
                          toast.error(`Segnale pending pubblicato ma notifiche fallite: ${notifyOutcome.error}`);
                        } else {
                          toast.success(`Segnale pending pubblicato. ${formatSignalNotificationToast(notifyOutcome.result || undefined)}`);
                        }
                      }
                    }}
                  >
                    <Radio className="h-3 w-3 mr-1.5" />
                    Pubblica come segnale globale (Pending)
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ WARNING ═══════ */}
      {raw.warning && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/5 px-3 sm:px-4 py-2.5 sm:py-3">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-semibold text-warning uppercase tracking-wider">Attenzione</span>
            <p className="text-[13px] sm:text-sm text-foreground/90 mt-0.5 leading-relaxed">{raw.warning}</p>
          </div>
        </div>
      )}

      {/* ═══════ CONCLUSION ═══════ */}
      <div className="panel-inset rounded-xl p-3 sm:p-4 accent-line-top">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] sm:text-xs font-semibold text-foreground uppercase tracking-wider">Conclusione</span>
        </div>
        <p className="text-[13px] sm:text-sm text-foreground/90 leading-relaxed">{raw.conclusione}</p>
      </div>

      {/* ═══════ ADMIN PUBLISH ═══════ */}
      {isAdmin && primarySignal && strength >= 3 && (
        <div className="panel-inset rounded-xl p-3 sm:p-4 border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="h-4 w-4 text-primary" />
            <span className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Azione Admin</span>
          </div>
          <Button
            variant="outline"
            className="w-full border-primary/30 text-primary hover:bg-primary/10 rounded-lg"
            onClick={async () => {
              const entryPrice = parsePrice(primarySignal!.entry_range);
              const slPrice = parsePrice(primarySignal!.stop_loss);
              const tpPrice = parsePrice(primarySignal!.take_profit);
              const { data: insertedSignal, error } = await supabase.from("shared_signals").insert({
                review_id: reviewId || null,
                created_by: user!.id,
                asset: asset || "N/A",
                direction: primarySignal!.tipo,
                order_type: "market",
                entry_price: entryPrice,
                stop_loss: slPrice,
                take_profit: tpPrice,
                lot_size_suggestion: primaryLotCalc?.lotSize || null,
                signal_strength: strength,
                signal_quality: raw.signal_quality,
                explanation: primarySignal!.spiegazione || raw.conclusione,
                is_published: true,
              } as any).select("*").single();
              if (error || !insertedSignal) {
                toast.error("Errore nella pubblicazione del segnale");
              } else {
                const notifyOutcome = await invokeSignalNotification({
                  signal: insertedSignal as any,
                  currentPublished: false,
                  nextPublished: true,
                  source: "easy-analysis-market",
                });
                if (notifyOutcome.error) {
                  toast.error(`Segnale pubblicato ma notifiche fallite: ${notifyOutcome.error}`);
                } else {
                  toast.success(`Segnale pubblicato. ${formatSignalNotificationToast(notifyOutcome.result || undefined)}`);
                }
              }
            }}
          >
            <Radio className="h-3.5 w-3.5 mr-2" />
            Pubblica come segnale globale
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2">
            Il segnale sarà visibile a tutti gli utenti approvati nella dashboard.
          </p>
        </div>
      )}

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
            signalStrength: strength,
            riskPercent: effectiveRisk,
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
