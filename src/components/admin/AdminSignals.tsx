import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Radio, Archive, Eye, EyeOff, TrendingUp, TrendingDown, Zap, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Signal {
  id: string;
  asset: string;
  direction: string;
  order_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  signal_strength: number;
  signal_quality: string | null;
  explanation: string | null;
  is_published: boolean;
  is_archived: boolean;
  published_at: string;
  created_at: string;
}

export default function AdminSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("shared_signals")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSignals(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("shared_signals").update({ is_published: !current } as any).eq("id", id);
    toast.success(current ? "Segnale ritirato" : "Segnale pubblicato");
    load();
  };

  const toggleArchive = async (id: string, current: boolean) => {
    await supabase.from("shared_signals").update({ is_archived: !current } as any).eq("id", id);
    toast.success(current ? "Segnale ripristinato" : "Segnale archiviato");
    load();
  };

  const deleteSignal = async (id: string) => {
    await supabase.from("shared_signals").delete().eq("id", id);
    toast.success("Segnale eliminato");
    load();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const active = signals.filter(s => !s.is_archived);
  const archived = signals.filter(s => s.is_archived);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-primary" />
        <h3 className="font-heading font-semibold text-foreground">Segnali globali pubblicati</h3>
        <Badge variant="outline" className="text-xs">{active.length} attivi</Badge>
      </div>

      {signals.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun segnale pubblicato. Puoi pubblicare segnali dalla AI Chart Review Easy Mode.</p>
      )}

      {/* Active signals */}
      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Attivi</p>
          {active.map((sig) => (
            <SignalRow key={sig.id} signal={sig} onTogglePublish={togglePublish} onToggleArchive={toggleArchive} onDelete={deleteSignal} />
          ))}
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Archiviati</p>
          {archived.map((sig) => (
            <SignalRow key={sig.id} signal={sig} onTogglePublish={togglePublish} onToggleArchive={toggleArchive} onDelete={deleteSignal} />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalRow({ signal: sig, onTogglePublish, onToggleArchive, onDelete }: {
  signal: Signal;
  onTogglePublish: (id: string, current: boolean) => void;
  onToggleArchive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const buy = sig.direction.toLowerCase().includes("buy");

  return (
    <div className={cn("card-premium p-4", sig.is_archived && "opacity-60")}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {buy ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          <span className="font-semibold text-foreground">{sig.asset}</span>
          <Badge className={cn("text-xs", buy ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
            {sig.direction} {sig.order_type}
          </Badge>
          <Badge className="text-xs" variant="outline">
            <Zap className="h-3 w-3 mr-0.5" />{sig.signal_strength}/5
          </Badge>
          {sig.is_published && !sig.is_archived && (
            <Badge className="text-[10px] bg-success/10 text-success">Visibile</Badge>
          )}
          {!sig.is_published && (
            <Badge className="text-[10px] bg-warning/10 text-warning">Non pubblicato</Badge>
          )}
          {sig.is_archived && (
            <Badge className="text-[10px] bg-muted text-muted-foreground">Archiviato</Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(sig.published_at).toLocaleString("it-IT")}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
        <div><span className="text-muted-foreground">Entry:</span> <span className="font-medium text-foreground">{sig.entry_price}</span></div>
        <div><span className="text-muted-foreground">SL:</span> <span className="font-medium text-destructive">{sig.stop_loss}</span></div>
        <div><span className="text-muted-foreground">TP:</span> <span className="font-medium text-success">{sig.take_profit}</span></div>
      </div>

      {sig.explanation && (
        <p className="text-xs text-muted-foreground mb-3">{sig.explanation}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onTogglePublish(sig.id, sig.is_published)}>
          {sig.is_published ? <><EyeOff className="h-3 w-3 mr-1" />Ritira</> : <><Eye className="h-3 w-3 mr-1" />Pubblica</>}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onToggleArchive(sig.id, sig.is_archived)}>
          <Archive className="h-3 w-3 mr-1" />{sig.is_archived ? "Ripristina" : "Archivia"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => onDelete(sig.id)}>
          <Trash2 className="h-3 w-3 mr-1" />Elimina
        </Button>
      </div>
    </div>
  );
}
