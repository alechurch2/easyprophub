import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalcOutput } from "./TradeCalcEngine";

interface Props {
  output: CalcOutput | null;
  accountSize: number;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPrice(n: number, asset: string) {
  if (!n) return "—";
  if (asset.includes("JPY")) return fmt(n, 3);
  if (["XAU/USD", "US30", "NAS100", "SPX500"].includes(asset)) return fmt(n, 2);
  if (["BTC/USD"].includes(asset)) return fmt(n, 1);
  return fmt(n, 5);
}

export function TradeCalcResult({ output, accountSize }: Props) {
  const hasData = !!output;
  const isBuy = output?.direction === "buy";
  const riskPct = hasData && accountSize > 0 ? (output.riskMoney / accountSize) * 100 : 0;
  const profitPct = hasData && accountSize > 0 ? (output.profitMoney / accountSize) * 100 : 0;

  return (
    <Card className={cn(
      "border transition-all duration-300",
      hasData
        ? "border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent"
        : "border-border/40 bg-card/50"
    )}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-2 mb-4">
          {hasData ? (
            isBuy ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-destructive" />
          ) : (
            <BarChart3 className="h-5 w-5 text-muted-foreground/40" />
          )}
          <span className="text-base font-bold text-foreground">Riepilogo operazione</span>
          {hasData && (
            <Badge variant="outline" className={cn("ml-auto text-xs", isBuy ? "border-success/30 text-success" : "border-destructive/30 text-destructive")}>
              {output.direction.toUpperCase()} {output.asset}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ResultCell label="Lotto" value={hasData ? fmt(output.lotSize) : "—"} highlight={hasData} />
          <ResultCell label="Entry" value={hasData ? fmtPrice(output.entryPrice, output.asset) : "—"} />
          <ResultCell label="Stop Loss" value={hasData ? fmtPrice(output.slPrice, output.asset) : "—"} sub={hasData && output.slPips > 0 ? `${fmt(output.slPips, 1)} pips` : undefined} color={hasData ? "destructive" : undefined} />
          <ResultCell label="Take Profit" value={hasData && output.tpPrice > 0 ? fmtPrice(output.tpPrice, output.asset) : "—"} sub={hasData && output.tpPips > 0 ? `${fmt(output.tpPips, 1)} pips` : undefined} color={hasData ? "success" : undefined} />
          <ResultCell label="Rischio" value={hasData ? `$${fmt(output.riskMoney)}` : "—"} sub={hasData ? `${fmt(riskPct, 2)}%` : undefined} color={hasData ? "destructive" : undefined} />
          <ResultCell label="Profitto pot." value={hasData && output.profitMoney > 0 ? `$${fmt(output.profitMoney)}` : "—"} sub={hasData && output.profitMoney > 0 ? `${fmt(profitPct, 2)}%` : undefined} color={hasData ? "success" : undefined} />
          <ResultCell label="R:R" value={hasData && output.rr ? `1:${fmt(output.rr, 1)}` : "—"} highlight={hasData && !!output.rr && output.rr >= 2} />
          <ResultCell label="Pip Value/Lot" value={hasData ? `$${getAssetPipValue(output.asset)}` : "—"} />
        </div>

        {!hasData && (
          <p className="text-xs text-muted-foreground/60 text-center mt-3">Compila i campi sopra per vedere il riepilogo</p>
        )}
      </CardContent>
    </Card>
  );
}

function ResultCell({ label, value, sub, color, highlight }: { label: string; value: string; sub?: string; color?: "success" | "destructive"; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg p-3", highlight ? "bg-primary/10 border border-primary/20" : "bg-secondary/50")}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5 font-medium">{label}</p>
      <p className={cn("text-sm font-bold font-mono", color === "success" ? "text-success" : color === "destructive" ? "text-destructive" : "text-foreground")}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function getAssetPipValue(asset: string): string {
  const map: Record<string, number> = {
    "EUR/USD": 10, "GBP/USD": 10, "USD/JPY": 6.5,
    "XAU/USD": 10, "BTC/USD": 1, "ETH/USD": 0.01,
    "US30": 1, "NAS100": 1, "SPX500": 1,
  };
  return (map[asset] ?? 10).toString();
}
