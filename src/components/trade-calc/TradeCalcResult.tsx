import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalcOutput } from "./TradeCalcEngine";

interface Props {
  output: CalcOutput;
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
  const isBuy = output.direction === "buy";
  const riskPct = accountSize > 0 ? (output.riskMoney / accountSize) * 100 : 0;
  const profitPct = accountSize > 0 ? (output.profitMoney / accountSize) * 100 : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-2 mb-4">
          {isBuy ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
          <span className="text-base font-bold text-foreground">Riepilogo operazione</span>
          <Badge variant="outline" className={cn("ml-auto text-xs", isBuy ? "border-success/30 text-success" : "border-destructive/30 text-destructive")}>
            {output.direction.toUpperCase()} {output.asset}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ResultCell label="Lotto" value={fmt(output.lotSize)} highlight />
          <ResultCell label="Entry" value={fmtPrice(output.entryPrice, output.asset)} />
          <ResultCell label="Stop Loss" value={fmtPrice(output.slPrice, output.asset)} sub={`${fmt(output.slPips, 1)} pips`} color="destructive" />
          <ResultCell label="Take Profit" value={output.tpPrice > 0 ? fmtPrice(output.tpPrice, output.asset) : "—"} sub={output.tpPips > 0 ? `${fmt(output.tpPips, 1)} pips` : ""} color="success" />
          <ResultCell label="Rischio" value={`$${fmt(output.riskMoney)}`} sub={`${fmt(riskPct, 2)}%`} color="destructive" />
          <ResultCell label="Profitto pot." value={output.profitMoney > 0 ? `$${fmt(output.profitMoney)}` : "—"} sub={output.profitMoney > 0 ? `${fmt(profitPct, 2)}%` : ""} color="success" />
          <ResultCell label="R:R" value={output.rr ? `1:${fmt(output.rr, 1)}` : "—"} highlight={!!output.rr && output.rr >= 2} />
          <ResultCell label="Pip Value/Lot" value={`$${getAssetPipValue(output.asset)}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function ResultCell({ label, value, sub, color, highlight }: { label: string; value: string; sub?: string; color?: "success" | "destructive"; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg p-3", highlight ? "bg-primary/10 border border-primary/20" : "bg-secondary/50")}>
      <p className="text-[10px] uppercase text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-sm font-bold", color === "success" ? "text-success" : color === "destructive" ? "text-destructive" : "text-foreground")}>
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
