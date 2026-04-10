import AppLayout from "@/components/AppLayout";
import { TradeCalcEngine } from "@/components/trade-calc/TradeCalcEngine";

export default function TradeCalculator() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trade Calculator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calcola lotti, rischio e livelli — e invia l'operazione al conto collegato.
          </p>
        </div>
        <TradeCalcEngine />
      </div>
    </AppLayout>
  );
}
