import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Radio, Archive, Eye, EyeOff, TrendingUp, TrendingDown, Zap, Trash2, ChevronDown, History } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SIGNAL_STATUSES = [
  { value: "active", label: "Attivo", color: "bg-success/10 text-success border-success/20" },
  { value: "triggered", label: "Aperto", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "won", label: "Vinto", color: "bg-success/10 text-success border-success/20" },
  { value: "lost", label: "Perso", color: "bg-destructive/10 text-destructive border-destructive/20" },
  { value: "expired", label: "Scaduto", color: "bg-muted text-muted-foreground border-border" },
  { value: "withdrawn", label: "Ritirato", color: "bg-warning/10 text-warning border-warning/20" },
] as const;

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
  signal_status: string;
  status_updated_at: string | null;
  published_at: string;
  created_at: string;
}

export default function AdminSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

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

  const changeStatus = async (id: string, newStatus: string) => {
    await supabase.from("shared_signals").update({
      signal_status: newStatus,
      status_updated_at: new Date().toISOString(),
    } as any).eq("id", id);
    const label = SIGNAL_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
    toast.success(`Stato aggiornato: ${label}`);
    load();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const active = signals.filter(s => !s.is_archived && s.signal_status === "active");
  const openSignals = signals.filter(s => !s.is_archived && s.signal_status !== "active");
  const archived = signals.filter(s => s.is_archived);
  const closedStatuses = ["won", "lost", "expired", "withdrawn"];
  const history = signals.filter(s => closedStatuses.includes(s.signal_status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Segnali globali</h3>
          <Badge variant="outline" className="text-xs">{active.length} attivi</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowHistory(!showHistory)}>
          <History className="h-3 w-3 mr-1" />{showHistory ? "Nascondi storico" : "Mostra storico"}
        </Button>
      </div>

      {signals.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun segnale pubblicato. Puoi pubblicare segnali dalla AI Chart Review Easy Mode.</p>
      )}

      {/* Active signals */}
      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Attivi</p>
          {active.map((sig) => (
            <SignalRow key={sig.id} signal={sig} onTogglePublish={togglePublish} onToggleArchive={toggleArchive} onDelete={deleteSignal} onChangeStatus={changeStatus} />
          ))}
        </div>
      )}

      {/* Open / non-active non-archived */}
      {openSignals.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">In corso / Chiusi</p>
          {openSignals.map((sig) => (
            <SignalRow key={sig.id} signal={sig} onTogglePublish={togglePublish} onToggleArchive={toggleArchive} onDelete={deleteSignal} onChangeStatus={changeStatus} />
          ))}
        </div>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Storico segnali</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 px-2 text-left font-medium">Asset</th>
                  <th className="py-2 px-2 text-left font-medium">Direzione</th>
                  <th className="py-2 px-2 text-left font-medium">Entry</th>
                  <th className="py-2 px-2 text-left font-medium">SL</th>
                  <th className="py-2 px-2 text-left font-medium">TP</th>
                  <th className="py-2 px-2 text-left font-medium">Stato</th>
                  <th className="py-2 px-2 text-left font-medium">Pubblicato</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sig) => {
                  const statusInfo = SIGNAL_STATUSES.find(s => s.value === sig.signal_status);
                  return (
                    <tr key={sig.id} className="border-b border-border/50">
                      <td className="py-2 px-2 font-medium text-foreground">{sig.asset}</td>
                      <td className="py-2 px-2">
                        <Badge className={cn("text-[10px]", sig.direction.toLowerCase().includes("buy") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                          {sig.direction} {sig.order_type}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 font-mono text-foreground">{sig.entry_price}</td>
                      <td className="py-2 px-2 font-mono text-destructive">{sig.stop_loss}</td>
                      <td className="py-2 px-2 font-mono text-success">{sig.take_profit}</td>
                      <td className="py-2 px-2">
                        <Badge className={cn("text-[10px]", statusInfo?.color)}>{statusInfo?.label}</Badge>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {new Date(sig.published_at).toLocaleDateString("it-IT")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Archiviati</p>
          {archived.map((sig) => (
            <SignalRow key={sig.id} signal={sig} onTogglePublish={togglePublish} onToggleArchive={toggleArchive} onDelete={deleteSignal} onChangeStatus={changeStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalRow({ signal: sig, onTogglePublish, onToggleArchive, onDelete, onChangeStatus }: {
  signal: Signal;
  onTogglePublish: (id: string, current: boolean) => void;
  onToggleArchive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onChangeStatus: (id: string, status: string) => void;
}) {
  const buy = sig.direction.toLowerCase().includes("buy");
  const statusInfo = SIGNAL_STATUSES.find(s => s.value === sig.signal_status) || SIGNAL_STATUSES[0];

  return (
    <div className={cn("card-premium p-4", sig.is_archived && "opacity-60")}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {buy ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          <span className="font-semibold text-foreground">{sig.asset}</span>
          <Badge className={cn("text-xs", buy ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
            {sig.direction} {sig.order_type}
          </Badge>
          <Badge className="text-xs" variant="outline">
            <Zap className="h-3 w-3 mr-0.5" />{sig.signal_strength}/5
          </Badge>
          <Badge className={cn("text-[10px] border", statusInfo.color)}>
            {statusInfo.label}
          </Badge>
          {sig.is_published && !sig.is_archived && (
            <Badge className="text-[10px] bg-success/10 text-success">Visibile</Badge>
          )}
          {!sig.is_published && (
            <Badge className="text-[10px] bg-warning/10 text-warning">Non pubblicato</Badge>
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
        {/* Status dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              Stato <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SIGNAL_STATUSES.map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={() => onChangeStatus(sig.id, s.value)}
                className={cn("text-xs", sig.signal_status === s.value && "font-bold")}
              >
                <span className={cn("inline-block h-2 w-2 rounded-full mr-2", s.color.split(" ")[0])} />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
