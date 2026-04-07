import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { History, TrendingUp, TrendingDown } from "lucide-react";
import { SignalStatusBadge } from "./SignalStatusBadge";

interface HistorySignal {
  id: string;
  asset: string;
  direction: string;
  order_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  signal_strength: number;
  signal_status: string;
  published_at: string;
  explanation: string | null;
}

export function SignalHistory() {
  const [signals, setSignals] = useState<HistorySignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("shared_signals")
        .select("id, asset, direction, order_type, entry_price, stop_loss, take_profit, signal_strength, signal_status, published_at, explanation")
        .eq("is_published", true)
        .neq("signal_status", "active")
        .order("published_at", { ascending: false })
        .limit(20);
      if (data) setSignals(data as any);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || signals.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-muted-foreground/50" />
        <p className="text-label uppercase text-muted-foreground/50 font-semibold">Storico segnali</p>
        <Badge variant="outline" className="text-[9px] ml-0.5 px-1.5">{signals.length}</Badge>
      </div>

      <div className="overflow-x-auto card-elevated">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Asset</th>
              <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Direzione</th>
              <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Entry</th>
              <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">SL</th>
              <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">TP</th>
              <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Stato</th>
              <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((sig) => {
              const buy = sig.direction.toLowerCase().includes("buy");
              return (
                <tr key={sig.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      {buy ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                      <span className="font-medium text-foreground">{sig.asset}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge className={cn("text-[10px]", buy ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                      {sig.direction}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-foreground">{sig.entry_price}</td>
                  <td className="py-2.5 px-3 font-mono text-destructive">{sig.stop_loss}</td>
                  <td className="py-2.5 px-3 font-mono text-success">{sig.take_profit}</td>
                  <td className="py-2.5 px-3"><SignalStatusBadge status={sig.signal_status} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {new Date(sig.published_at).toLocaleDateString("it-IT")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
