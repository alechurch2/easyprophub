import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Calculator, Send, DollarSign, Crosshair, Target, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRiskPreferences } from "@/hooks/useRiskPreferences";
import { getAssetConfig, priceToPips, calculateRR } from "@/components/ai-review/lotSizeCalculator";
import { TradeCalcResult } from "./TradeCalcResult";
import { TradeCalcExecution } from "./TradeCalcExecution";

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "ETH/USD", "US30", "NAS100", "SPX500"];

type CalcMode = "risk_money" | "pips" | "target_money" | "manual_lot";
type Direction = "buy" | "sell";

const MODES: { value: CalcMode; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "risk_money", label: "Rischio $", icon: DollarSign, desc: "Calcola il lotto dal rischio monetario" },
  { value: "pips", label: "Pips", icon: Crosshair, desc: "Inserisci SL/TP in pips" },
  { value: "target_money", label: "Target $", icon: Target, desc: "Parti dal profitto/perdita desiderati" },
  { value: "manual_lot", label: "Lotto manuale", icon: SlidersHorizontal, desc: "Inserisci il lotto e scopri il rischio" },
];

function parseNum(v: string): number {
  return parseFloat(v.replace(",", ".")) || 0;
}

export interface CalcOutput {
  lotSize: number;
  riskMoney: number;
  profitMoney: number;
  slPips: number;
  tpPips: number;
  slPrice: number;
  tpPrice: number;
  rr: number | null;
  entryPrice: number;
  asset: string;
  direction: Direction;
}

export function TradeCalcEngine() {
  const { getRiskContext, loading: riskLoading } = useRiskPreferences();
  const riskCtx = getRiskContext();

  const [mode, setMode] = useState<CalcMode>("risk_money");
  const [asset, setAsset] = useState("XAU/USD");
  const [direction, setDirection] = useState<Direction>("buy");

  // Shared inputs
  const [entry, setEntry] = useState("");
  // Mode-specific inputs
  const [slPrice, setSlPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [riskMoney, setRiskMoney] = useState("");
  const [slPips, setSlPips] = useState("");
  const [tpPips, setTpPips] = useState("");
  const [riskType, setRiskType] = useState<"money" | "percent">("money");
  const [riskPercent, setRiskPercent] = useState("");
  const [targetLoss, setTargetLoss] = useState("");
  const [targetProfit, setTargetProfit] = useState("");
  const [manualLot, setManualLot] = useState("");
  const [manualSlPrice, setManualSlPrice] = useState("");
  const [manualTpPrice, setManualTpPrice] = useState("");

  // Execution state
  const [showExecution, setShowExecution] = useState(false);

  const config = getAssetConfig(asset);

  const output = useMemo<CalcOutput | null>(() => {
    if (!config) return null;
    const entryP = parseNum(entry);
    if (entryP <= 0) return null;

    if (mode === "risk_money") {
      const sl = parseNum(slPrice);
      const tp = parseNum(tpPrice);
      const risk = parseNum(riskMoney);
      if (sl <= 0 || risk <= 0) return null;
      const slDist = Math.abs(entryP - sl);
      const tpDist = tp > 0 ? Math.abs(tp - entryP) : 0;
      const slP = Math.round(slDist / config.pipSize * 100) / 100;
      const tpP = tp > 0 ? Math.round(tpDist / config.pipSize * 100) / 100 : 0;
      if (slP <= 0) return null;
      const lot = Math.round((risk / (slP * config.pipValuePerLot)) * 100) / 100;
      const profit = tp > 0 ? Math.round(lot * tpP * config.pipValuePerLot * 100) / 100 : 0;
      return { lotSize: lot, riskMoney: risk, profitMoney: profit, slPips: slP, tpPips: tpP, slPrice: sl, tpPrice: tp, rr: calculateRR(slP, tpP), entryPrice: entryP, asset, direction };
    }

    if (mode === "pips") {
      const slp = parseNum(slPips);
      const tpp = parseNum(tpPips);
      let risk: number;
      if (riskType === "percent") {
        const pct = parseNum(riskPercent) / 100;
        risk = riskCtx.effectiveAccountSize * pct;
      } else {
        risk = parseNum(riskMoney);
      }
      if (slp <= 0 || risk <= 0) return null;
      const lot = Math.round((risk / (slp * config.pipValuePerLot)) * 100) / 100;
      const slDist = slp * config.pipSize;
      const tpDist = tpp * config.pipSize;
      const slPr = direction === "buy" ? entryP - slDist : entryP + slDist;
      const tpPr = tpp > 0 ? (direction === "buy" ? entryP + tpDist : entryP - tpDist) : 0;
      const profit = tpp > 0 ? Math.round(lot * tpp * config.pipValuePerLot * 100) / 100 : 0;
      return { lotSize: lot, riskMoney: risk, profitMoney: profit, slPips: slp, tpPips: tpp, slPrice: Math.round(slPr * 1e5) / 1e5, tpPrice: tpPr > 0 ? Math.round(tpPr * 1e5) / 1e5 : 0, rr: calculateRR(slp, tpp), entryPrice: entryP, asset, direction };
    }

    if (mode === "target_money") {
      const loss = parseNum(targetLoss);
      const profit = parseNum(targetProfit);
      if (loss <= 0) return null;
      // We need at least one of sl/tp to derive; use loss to find lot at default SL pips
      // Strategy: user sets loss & profit targets; we calculate SL/TP assuming a reasonable lot
      // We need entry + lot to compute. Let's derive from loss + default SL distance
      // Use manual lot if given, otherwise derive from loss and a default SL
      const lot = parseNum(manualLot) || 0.01;
      const slp = Math.round((loss / (lot * config.pipValuePerLot)) * 100) / 100;
      const tpp = profit > 0 ? Math.round((profit / (lot * config.pipValuePerLot)) * 100) / 100 : 0;
      const slDist = slp * config.pipSize;
      const tpDist = tpp * config.pipSize;
      const slPr = direction === "buy" ? entryP - slDist : entryP + slDist;
      const tpPr = tpp > 0 ? (direction === "buy" ? entryP + tpDist : entryP - tpDist) : 0;
      return { lotSize: lot, riskMoney: loss, profitMoney: profit, slPips: slp, tpPips: tpp, slPrice: Math.round(slPr * 1e5) / 1e5, tpPrice: tpPr > 0 ? Math.round(tpPr * 1e5) / 1e5 : 0, rr: calculateRR(slp, tpp), entryPrice: entryP, asset, direction };
    }

    if (mode === "manual_lot") {
      const lot = parseNum(manualLot);
      const sl = parseNum(manualSlPrice);
      const tp = parseNum(manualTpPrice);
      if (lot <= 0 || sl <= 0) return null;
      const slDist = Math.abs(entryP - sl);
      const tpDist = tp > 0 ? Math.abs(tp - entryP) : 0;
      const slp = Math.round(slDist / config.pipSize * 100) / 100;
      const tpp = tp > 0 ? Math.round(tpDist / config.pipSize * 100) / 100 : 0;
      const risk = Math.round(lot * slp * config.pipValuePerLot * 100) / 100;
      const profit = tpp > 0 ? Math.round(lot * tpp * config.pipValuePerLot * 100) / 100 : 0;
      return { lotSize: lot, riskMoney: risk, profitMoney: profit, slPips: slp, tpPips: tpp, slPrice: sl, tpPrice: tp, rr: calculateRR(slp, tpp), entryPrice: entryP, asset, direction };
    }

    return null;
  }, [mode, asset, direction, entry, slPrice, tpPrice, riskMoney, slPips, tpPips, riskType, riskPercent, targetLoss, targetProfit, manualLot, manualSlPrice, manualTpPrice, config, riskCtx.effectiveAccountSize]);

  const DecimalInput = useCallback(({ value, onChange, ...props }: { value: string; onChange: (v: string) => void } & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) => (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(",", "."))}
      {...props}
    />
  ), []);

  return (
    <div className="space-y-6">
      {/* Top bar: asset + direction + account info */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSETS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Direzione</Label>
              <div className="flex gap-1.5">
                <Button
                  variant={direction === "buy" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDirection("buy")}
                  className={cn(direction === "buy" && "bg-success hover:bg-success/90 text-white")}
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> BUY
                </Button>
                <Button
                  variant={direction === "sell" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDirection("sell")}
                  className={cn(direction === "sell" && "bg-destructive hover:bg-destructive/90 text-white")}
                >
                  <TrendingDown className="h-3.5 w-3.5 mr-1" /> SELL
                </Button>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Entry Price</Label>
              <DecimalInput value={entry} onChange={setEntry} placeholder="es. 3250.50" />
            </div>
            {!riskLoading && (
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Account ref.</p>
                <p className="text-sm font-semibold text-foreground">{riskCtx.sourceLabel}</p>
                <p className="text-[10px] text-muted-foreground">${riskCtx.effectiveAccountSize.toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mode selector */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as CalcMode)}>
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto gap-1 bg-transparent p-0">
          {MODES.map((m) => (
            <TabsTrigger
              key={m.value}
              value={m.value}
              className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border border-transparent data-[state=active]:bg-primary/10 data-[state=active]:border-primary/20 data-[state=active]:text-primary bg-card hover:bg-muted/50"
            >
              <m.icon className="h-4 w-4" />
              <span className="text-xs font-semibold">{m.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Mode A: Risk Money */}
        <TabsContent value="risk_money">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Calcolo da rischio monetario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Inserisci Entry, SL, TP e il rischio in $ — il sistema calcola il lotto corretto.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Stop Loss (prezzo)</Label>
                  <DecimalInput value={slPrice} onChange={setSlPrice} placeholder="es. 3240.00" />
                </div>
                <div>
                  <Label className="text-xs">Take Profit (prezzo)</Label>
                  <DecimalInput value={tpPrice} onChange={setTpPrice} placeholder="es. 3270.00" />
                </div>
                <div>
                  <Label className="text-xs">Rischio ($)</Label>
                  <DecimalInput value={riskMoney} onChange={setRiskMoney} placeholder="es. 200" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mode B: Pips */}
        <TabsContent value="pips">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-primary" />
                Calcolo da pips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Inserisci SL/TP in pips e il rischio — il sistema calcola prezzi e lotto.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">SL (pips)</Label>
                  <DecimalInput value={slPips} onChange={setSlPips} placeholder="es. 100" />
                </div>
                <div>
                  <Label className="text-xs">TP (pips)</Label>
                  <DecimalInput value={tpPips} onChange={setTpPips} placeholder="es. 300" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Tipo rischio</Label>
                  <div className="flex gap-1.5 mt-1">
                    <Button variant={riskType === "money" ? "default" : "outline"} size="sm" onClick={() => setRiskType("money")}>$</Button>
                    <Button variant={riskType === "percent" ? "default" : "outline"} size="sm" onClick={() => setRiskType("percent")}>%</Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{riskType === "money" ? "Rischio ($)" : "Rischio (%)"}</Label>
                  {riskType === "money" ? (
                    <DecimalInput value={riskMoney} onChange={setRiskMoney} placeholder="es. 200" />
                  ) : (
                    <DecimalInput value={riskPercent} onChange={setRiskPercent} placeholder="es. 0.5" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mode C: Target Money */}
        <TabsContent value="target_money">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Calcolo da target monetario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Inserisci la perdita massima e il profitto target. Specifica il lotto per calcolare SL/TP.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Perdita max ($)</Label>
                  <DecimalInput value={targetLoss} onChange={setTargetLoss} placeholder="es. 100" />
                </div>
                <div>
                  <Label className="text-xs">Profitto target ($)</Label>
                  <DecimalInput value={targetProfit} onChange={setTargetProfit} placeholder="es. 300" />
                </div>
                <div>
                  <Label className="text-xs">Lotto</Label>
                  <DecimalInput value={manualLot} onChange={setManualLot} placeholder="es. 0.1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mode D: Manual Lot */}
        <TabsContent value="manual_lot">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Calcolo da lotto manuale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Inserisci il lotto desiderato con SL/TP — il sistema calcola rischio e profitto.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Lotto</Label>
                  <DecimalInput value={manualLot} onChange={setManualLot} placeholder="es. 0.5" />
                </div>
                <div>
                  <Label className="text-xs">Stop Loss (prezzo)</Label>
                  <DecimalInput value={manualSlPrice} onChange={setManualSlPrice} placeholder="es. 3240.00" />
                </div>
                <div>
                  <Label className="text-xs">Take Profit (prezzo)</Label>
                  <DecimalInput value={manualTpPrice} onChange={setManualTpPrice} placeholder="es. 3270.00" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results */}
      {output && (
        <>
          <TradeCalcResult output={output} accountSize={riskCtx.effectiveAccountSize} />
          <div className="flex justify-end">
            <Button size="lg" onClick={() => setShowExecution(true)} className="gap-2">
              <Send className="h-4 w-4" />
              Invia al conto
            </Button>
          </div>
          <TradeCalcExecution
            open={showExecution}
            onClose={() => setShowExecution(false)}
            output={output}
          />
        </>
      )}
    </div>
  );
}
