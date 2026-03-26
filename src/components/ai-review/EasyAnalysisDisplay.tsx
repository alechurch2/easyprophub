import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Target, ShieldAlert, Clock, BarChart3, DollarSign, Minus, Eye, Search, Shield, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fullLotCalculationFromPrices, RISK_PERCENT, TARGET_PERCENT } from "./lotSizeCalculator";
import { TradeExecutionModal } from "./TradeExecutionModal";

interface EasySetup {
  tipo: string;
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
  setups: EasySetup[];
  warning?: string;
  conclusione: string;
  expected_duration: string;
  no_setup_reason?: string;
  contesto_mercato?: string;
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

function qualityColor(q: string) {
  switch (q?.toLowerCase()) {
    case "alta": return "bg-success/10 text-success border-success/20";
    case "media": return "bg-warning/10 text-warning border-warning/20";
    case "bassa": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground";
  }
}

function prudenzaColor(p: string) {
  switch (p?.toLowerCase()) {
    case "alto": return "bg-destructive/10 text-destructive border-destructive/20";
    case "medio": return "bg-warning/10 text-warning border-warning/20";
    case "basso": return "bg-success/10 text-success border-success/20";
    default: return "bg-muted text-muted-foreground";
  }
}

function directionIcon(tipo: string) {
  const t = tipo?.toLowerCase() || "";
  if (t.includes("buy")) return <TrendingUp className="h-5 w-5 text-success" />;
  if (t.includes("sell")) return <TrendingDown className="h-5 w-5 text-destructive" />;
  return <Minus className="h-5 w-5 text-muted-foreground" />;
}

function directionColor(tipo: string) {
  const t = tipo?.toLowerCase() || "";
  if (t.includes("buy")) return "border-success/30 bg-success/5";
  if (t.includes("sell")) return "border-destructive/30 bg-destructive/5";
  return "border-border";
}

function parsePrice(value: string): number {
  // Try to extract a single number from strings like "1.0850" or "1.0850 - 1.0860"
  const nums = value.match(/[\d.]+/g);
  if (!nums || nums.length === 0) return 0;
  // For ranges, take the midpoint
  if (nums.length >= 2) {
    return (parseFloat(nums[0]) + parseFloat(nums[1])) / 2;
  }
  return parseFloat(nums[0]);
}

function determineOrderType(tipo: string): string {
  const t = tipo?.toLowerCase() || "";
  if (t.includes("limit")) return "limit";
  return "market";
}

export function EasyAnalysisDisplay({ analysis, accountSize, asset, reviewId }: { analysis: any; accountSize?: number; asset?: string; reviewId?: string }) {
  const { user } = useAuth();
  const [tradingAccount, setTradingAccount] = useState<TradingAccount | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<{ setup: EasySetup; lotCalc: any } | null>(null);

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
    
    if (data && data.length > 0) {
      setTradingAccount(data[0] as any);
    }
    setAccountChecked(true);
  };

  if (!analysis) return null;

  const data = analysis as EasyAnalysis;
  const hasSetups = data.setups && data.setups.length > 0;

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

  const handleCopyToAccount = (setup: EasySetup, lotCalc: any) => {
    setSelectedSetup({ setup, lotCalc });
    setTradeModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header: Quality + Duration */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={cn("text-sm px-3 py-1", qualityColor(data.signal_quality))}>
          <BarChart3 className="h-3.5 w-3.5 mr-1" />
          Qualità: {data.signal_quality || "N/A"}
        </Badge>
        {data.expected_duration && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Durata attesa: {data.expected_duration}
          </Badge>
        )}
        <Badge variant="outline" className="text-xs px-2 py-0.5">
          {data.leggibilita_immagine}
        </Badge>
      </div>

      {/* No setup case — Enhanced context analysis */}
      {!hasSetups && (
        <div className="space-y-3">
          {data.contesto_mercato && (
            <div className="card-premium p-4 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Contesto attuale</span>
              </div>
              <p className="text-sm text-foreground">{data.contesto_mercato}</p>
            </div>
          )}

          <div className="card-premium p-4 border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-warning uppercase">Perché nessun setup</span>
            </div>
            <p className="text-sm text-foreground">
              {data.no_setup_reason || "Il contesto attuale non permette di proporre un'idea operativa affidabile."}
            </p>
          </div>

          {data.cosa_aspettare && (
            <div className="card-premium p-4 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Cosa aspettare</span>
              </div>
              <p className="text-sm text-foreground">{data.cosa_aspettare}</p>
            </div>
          )}

          {data.livello_prudenza && (
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Livello di prudenza:</span>
              <Badge className={cn("text-xs", prudenzaColor(data.livello_prudenza))}>
                {data.livello_prudenza === "alto" ? "🔴 Alto" : data.livello_prudenza === "medio" ? "🟡 Medio" : "🟢 Basso"}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Setup cards */}
      {hasSetups && data.setups.map((setup, i) => {
        const entryPrice = parsePrice(setup.entry_range);
        const slPrice = parsePrice(setup.stop_loss);
        const tpPrice = parsePrice(setup.take_profit);
        const setupHasValidPrices = entryPrice > 0 && slPrice > 0 && tpPrice > 0;

        const lotCalc = (accountSize && asset && setupHasValidPrices)
          ? fullLotCalculationFromPrices(accountSize, entryPrice, slPrice, tpPrice, asset)
          : null;

        return (
          <div key={i} className={cn("rounded-xl border p-5 space-y-3", directionColor(setup.tipo))}>
            <div className="flex items-center gap-3">
              {directionIcon(setup.tipo)}
              <div>
                <h3 className="font-heading font-semibold text-foreground text-lg">{setup.tipo}</h3>
                <p className="text-xs text-muted-foreground">Idea operativa {i + 1}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Entry</p>
                <p className="text-sm font-semibold text-foreground">{setup.entry_range}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Stop Loss</p>
                <p className="text-sm font-semibold text-destructive">{setup.stop_loss}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Take Profit</p>
                <p className="text-sm font-semibold text-success">{setup.take_profit}</p>
              </div>
            </div>

            {/* Lot size calculation */}
            {lotCalc && (
              <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-foreground uppercase">Calcolo lottaggio</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Lotto</p>
                    <p className="text-sm font-bold text-foreground">{lotCalc.lotSize}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Rischio</p>
                    <p className="text-sm font-bold text-destructive">${lotCalc.riskAmount.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Profitto teorico</p>
                    <p className="text-sm font-bold text-success">${lotCalc.theoreticalProfit?.toFixed(0) ?? "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">R:R</p>
                    <p className="text-sm font-bold text-primary">1:{lotCalc.rrRatio ?? "N/A"}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{lotCalc.formula}</p>
              </div>
            )}

            <p className="text-sm text-foreground">{setup.spiegazione}</p>

            {/* Copy to account button */}
            {accountChecked && setupHasValidPrices && lotCalc && (
              <div className="pt-2 border-t border-border/50">
                {canExecuteTrade ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => handleCopyToAccount(setup, lotCalc)}
                  >
                    <Send className="h-3.5 w-3.5 mr-2" />
                    Copia sul conto
                  </Button>
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
        );
      })}

      {/* Warning */}
      {data.warning && (
        <div className="card-premium p-4 border-warning/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-xs font-medium text-warning uppercase">Attenzione</span>
          </div>
          <p className="text-sm text-foreground">{data.warning}</p>
        </div>
      )}

      {/* Conclusion */}
      <div className="card-premium p-4 border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase">Conclusione</span>
        </div>
        <p className="text-sm text-foreground">{data.conclusione}</p>
      </div>

      {/* Trade execution modal */}
      {selectedSetup && tradingAccount && (
        <TradeExecutionModal
          open={tradeModalOpen}
          onClose={() => { setTradeModalOpen(false); setSelectedSetup(null); }}
          trade={{
            asset: asset || "N/A",
            direction: selectedSetup.setup.tipo,
            orderType: determineOrderType(selectedSetup.setup.tipo),
            entryPrice: parsePrice(selectedSetup.setup.entry_range),
            stopLoss: parsePrice(selectedSetup.setup.stop_loss),
            takeProfit: parsePrice(selectedSetup.setup.take_profit),
            lotSize: selectedSetup.lotCalc.lotSize,
            signalQuality: data.signal_quality,
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
