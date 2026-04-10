import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Send, DollarSign, Crosshair, Target, SlidersHorizontal, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRiskPreferences } from "@/hooks/useRiskPreferences";
import { getAssetConfig, calculateRR } from "@/components/ai-review/lotSizeCalculator";
import { TradeCalcResult } from "./TradeCalcResult";
import { TradeCalcExecution } from "./TradeCalcExecution";

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "ETH/USD", "US30", "NAS100", "SPX500"];

type CalcMode = "target_money" | "risk_money" | "pips" | "manual_lot";
type Direction = "buy" | "sell";

const MODES: { value: CalcMode; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "target_money", label: "Target $", icon: Target, desc: "Imposta perdita e profitto desiderati" },
  { value: "risk_money", label: "Rischio $", icon: DollarSign, desc: "Calcola il lotto dal rischio in dollari" },
  { value: "pips", label: "Pips", icon: Crosshair, desc: "Parti dalla distanza SL/TP in pips" },
  { value: "manual_lot", label: "Lotto manuale", icon: SlidersHorizontal, desc: "Inserisci il lotto e scopri il rischio" },
];

const RECOMMENDED_RISK_PCT = 0.002; // 0.2%

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

  const [mode, setMode] = useState<CalcMode>("target_money");
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

  // Recommended values
  const recommendedRisk = riskCtx.effectiveAccountSize * RECOMMENDED_RISK_PCT;
  const recommendedLot = useMemo(() => {
    if (!config) return 0.01;
    // Use a default SL of 100 pips for lot calc
    const defaultSlPips = asset === "XAU/USD" ? 100 : asset.includes("JPY") ? 50 : 30;
    const lot = recommendedRisk / (defaultSlPips * config.pipValuePerLot);
    return Math.round(lot * 100) / 100 || 0.01;
  }, [config, recommendedRisk, asset]);

  // Pre-fill recommended values on mode change
  useEffect(() => {
    if (mode === "target_money") {
      if (!targetLoss) setTargetLoss(recommendedRisk.toFixed(0));
      if (!targetProfit) setTargetProfit((recommendedRisk * 3).toFixed(0));
      if (!manualLot) setManualLot(recommendedLot.toString());
    }
    if (mode === "manual_lot") {
      if (!manualLot) setManualLot(recommendedLot.toString());
    }
  }, [mode]); // intentionally only on mode change

  // Risk warning
  const riskWarning = useMemo(() => {
    if (!riskCtx.effectiveAccountSize) return null;
    const currentRisk = (() => {
      if (mode === "risk_money") return parseNum(riskMoney);
      if (mode === "target_money") return parseNum(targetLoss);
      return 0;
    })();
    if (currentRisk <= 0) return null;
    const pct = (currentRisk / riskCtx.effectiveAccountSize) * 100;
    if (pct > 2) return { level: "high" as const, pct, msg: `Rischio elevato: ${pct.toFixed(2)}% del conto` };
    if (pct > 1) return { level: "medium" as const, pct, msg: `Rischio moderato: ${pct.toFixed(2)}% del conto` };
    return null;
  }, [mode, riskMoney, targetLoss, riskCtx.effectiveAccountSize]);

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
    <div className="space-y-5">
      {/* Top bar: asset + direction + account */}
      <Card className="border-border/60 bg-card">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block font-medium">Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger className="w-full sm:w-48 font-semibold">
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
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block font-medium">Direzione</Label>
              <div className="flex gap-1.5">
                <Button
                  variant={direction === "buy" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDirection("buy")}
                  className={cn("px-4", direction === "buy" && "bg-success hover:bg-success/90 text-white shadow-sm")}
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> BUY
                </Button>
                <Button
                  variant={direction === "sell" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDirection("sell")}
                  className={cn("px-4", direction === "sell" && "bg-destructive hover:bg-destructive/90 text-white shadow-sm")}
                >
                  <TrendingDown className="h-3.5 w-3.5 mr-1" /> SELL
                </Button>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block font-medium">Entry Price</Label>
              <DecimalInput value={entry} onChange={setEntry} placeholder="es. 3250.50" />
            </div>
            {!riskLoading && (
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Conto di riferimento</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{riskCtx.sourceLabel}</p>
                <p className="text-[10px] text-muted-foreground">${riskCtx.effectiveAccountSize.toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mode selector — pill style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MODES.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-xl border transition-all duration-200 text-center",
                active
                  ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                  : "bg-card border-border/50 text-muted-foreground hover:bg-muted/40 hover:border-border"
              )}
            >
              <m.icon className={cn("h-4 w-4", active && "text-primary")} />
              <span className="text-xs font-bold">{m.label}</span>
              <span className="text-[10px] leading-tight opacity-70 hidden sm:block">{m.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Input card per mode */}
      <Card className="border-border/60">
        <CardContent className="pt-5 pb-5 space-y-4">
          {/* Mode A: Risk Money */}
          {mode === "risk_money" && (
            <>
              <ModeHeader
                icon={DollarSign}
                title="Calcolo da rischio monetario"
                hint="Inserisci il prezzo di SL, TP e quanto vuoi rischiare in $. Il sistema calcola il lotto corretto."
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldGroup label="Stop Loss (prezzo)" hint="Prezzo dove chiudi in perdita">
                  <DecimalInput value={slPrice} onChange={setSlPrice} placeholder="es. 3240.00" />
                </FieldGroup>
                <FieldGroup label="Take Profit (prezzo)" hint="Prezzo dove chiudi in profitto">
                  <DecimalInput value={tpPrice} onChange={setTpPrice} placeholder="es. 3270.00" />
                </FieldGroup>
                <FieldGroup label="Rischio ($)" hint={`Consigliato: $${recommendedRisk.toFixed(0)} (0.2%)`}>
                  <DecimalInput value={riskMoney} onChange={setRiskMoney} placeholder={`es. ${recommendedRisk.toFixed(0)}`} />
                </FieldGroup>
              </div>
            </>
          )}

          {/* Mode B: Pips */}
          {mode === "pips" && (
            <>
              <ModeHeader
                icon={Crosshair}
                title="Calcolo da pips"
                hint="Inserisci la distanza SL/TP in pips e il rischio. Il sistema calcola prezzi e lotto."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="SL (pips)" hint="Distanza dello Stop Loss dall'entry">
                  <DecimalInput value={slPips} onChange={setSlPips} placeholder="es. 100" />
                </FieldGroup>
                <FieldGroup label="TP (pips)" hint="Distanza del Take Profit dall'entry">
                  <DecimalInput value={tpPips} onChange={setTpPips} placeholder="es. 300" />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-foreground">Tipo rischio</Label>
                  <div className="flex gap-1.5 mt-1.5">
                    <Button variant={riskType === "money" ? "default" : "outline"} size="sm" onClick={() => setRiskType("money")}>$</Button>
                    <Button variant={riskType === "percent" ? "default" : "outline"} size="sm" onClick={() => setRiskType("percent")}>%</Button>
                  </div>
                </div>
                <FieldGroup label={riskType === "money" ? "Rischio ($)" : "Rischio (%)"} hint={riskType === "money" ? `Consigliato: $${recommendedRisk.toFixed(0)}` : "Consigliato: 0.2%"}>
                  {riskType === "money" ? (
                    <DecimalInput value={riskMoney} onChange={setRiskMoney} placeholder={`es. ${recommendedRisk.toFixed(0)}`} />
                  ) : (
                    <DecimalInput value={riskPercent} onChange={setRiskPercent} placeholder="es. 0.2" />
                  )}
                </FieldGroup>
              </div>
            </>
          )}

          {/* Mode C: Target Money */}
          {mode === "target_money" && (
            <>
              <ModeHeader
                icon={Target}
                title="Calcolo da target monetario"
                hint="Imposta quanto vuoi rischiare e quanto vuoi guadagnare. Il sistema calcola SL, TP e R:R."
              />
              {/* Recommended badge */}
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-xs text-foreground">
                  <span className="font-semibold text-primary">Rischio consigliato:</span> ${recommendedRisk.toFixed(0)} (0.2% di ${riskCtx.effectiveAccountSize.toLocaleString()}) · <span className="font-semibold text-primary">Lotto suggerito:</span> {recommendedLot}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldGroup label="Perdita max ($)" hint="Quanto sei disposto a perdere">
                  <DecimalInput value={targetLoss} onChange={setTargetLoss} placeholder={`es. ${recommendedRisk.toFixed(0)}`} />
                </FieldGroup>
                <FieldGroup label="Profitto target ($)" hint="Quanto vuoi guadagnare">
                  <DecimalInput value={targetProfit} onChange={setTargetProfit} placeholder={`es. ${(recommendedRisk * 3).toFixed(0)}`} />
                </FieldGroup>
                <FieldGroup label="Lotto" hint={`Suggerito: ${recommendedLot}`}>
                  <DecimalInput value={manualLot} onChange={setManualLot} placeholder={`es. ${recommendedLot}`} />
                </FieldGroup>
              </div>
            </>
          )}

          {/* Mode D: Manual Lot */}
          {mode === "manual_lot" && (
            <>
              <ModeHeader
                icon={SlidersHorizontal}
                title="Calcolo da lotto manuale"
                hint="Inserisci il lotto che vuoi usare e i prezzi di SL/TP. Il sistema mostra rischio e profitto."
              />
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-xs text-foreground">
                  <span className="font-semibold text-primary">Lotto suggerito:</span> {recommendedLot} (basato su 0.2% di rischio)
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldGroup label="Lotto" hint={`Suggerito: ${recommendedLot}`}>
                  <DecimalInput value={manualLot} onChange={setManualLot} placeholder={`es. ${recommendedLot}`} />
                </FieldGroup>
                <FieldGroup label="Stop Loss (prezzo)" hint="Prezzo dove chiudi in perdita">
                  <DecimalInput value={manualSlPrice} onChange={setManualSlPrice} placeholder="es. 3240.00" />
                </FieldGroup>
                <FieldGroup label="Take Profit (prezzo)" hint="Prezzo dove chiudi in profitto">
                  <DecimalInput value={manualTpPrice} onChange={setManualTpPrice} placeholder="es. 3270.00" />
                </FieldGroup>
              </div>
            </>
          )}

          {/* Risk warning */}
          {riskWarning && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2",
              riskWarning.level === "high"
                ? "border-destructive/30 bg-destructive/5"
                : "border-warning/30 bg-warning/5"
            )}>
              <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", riskWarning.level === "high" ? "text-destructive" : "text-warning")} />
              <p className="text-xs text-foreground">{riskWarning.msg}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results — always visible */}
      <TradeCalcResult output={output} accountSize={riskCtx.effectiveAccountSize} />

      {/* CTA */}
      {output && (
        <>
          <div className="flex justify-end">
            <Button size="lg" onClick={() => setShowExecution(true)} className="gap-2 px-6 shadow-md">
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

/* ── Helpers ─────────────────────────────────── */

function ModeHeader({ icon: Icon, title, hint }: { icon: React.ElementType; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className="rounded-lg bg-primary/10 p-2 shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>
      </div>
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}
