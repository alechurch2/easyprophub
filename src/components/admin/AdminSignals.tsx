import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Radio, Archive, Eye, EyeOff, TrendingUp, TrendingDown, Zap, Trash2, ChevronDown, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatSignalNotificationToast, invokeSignalNotification, invokeStatusChangeNotification } from "@/lib/signalNotifications";
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

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tutti" },
  { value: "operative", label: "Operativi" },
  ...SIGNAL_STATUSES.map(s => ({ value: s.value, label: s.label })),
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
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shared_signals")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSignals(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePublish = async (id: string, current: boolean) => {
    const { data: signalData, error: fetchError } = await supabase
      .from("shared_signals")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !signalData) {
      console.error("[AdminSignals] Failed to load signal before publish action", { signal_id: id, error: fetchError });
      toast.error("Errore nel caricamento del segnale");
      return;
    }

    const currentPublished = Boolean(signalData.is_published);
    const nextPublished = !currentPublished;
    const publishReason = nextPublished ? "publication transition" : "signal withdrawn";

    console.log("[AdminSignals] Publish action", {
      signal_id: id,
      ui_current_value: current,
      db_current_value: currentPublished,
      new_value: nextPublished,
      signal_status: signalData.signal_status,
      trigger_notifications: nextPublished ? "yes" : "no",
      reason: publishReason,
    });

    const updatePayload = nextPublished
      ? { is_published: true, published_at: new Date().toISOString() }
      : { is_published: false };

    const { data: updatedSignal, error: updateError } = await supabase
      .from("shared_signals")
      .update(updatePayload as any)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updatedSignal) {
      console.error("[AdminSignals] Failed to update publish state", { signal_id: id, error: updateError });
      toast.error("Errore nell'aggiornamento del segnale");
      return;
    }

    if (!nextPublished) {
      console.log("[AdminSignals] Trigger notifications: no", {
        signal_id: id,
        current_value: currentPublished,
        new_value: nextPublished,
        reason: "signal withdrawn",
      });
      toast.success("Segnale ritirato");
      await load();
      return;
    }

    const notifyOutcome = await invokeSignalNotification({
      signal: updatedSignal as Signal,
      currentPublished,
      nextPublished,
      source: "admin-signals-toggle",
    });

    if (notifyOutcome.error) {
      toast.error(`Segnale pubblicato ma notifiche fallite: ${notifyOutcome.error}`);
    } else if (!notifyOutcome.triggerNotifications) {
      toast(`Segnale pubblicato senza notifiche: ${notifyOutcome.reason}`);
    } else {
      toast.success(`Segnale pubblicato. ${formatSignalNotificationToast(notifyOutcome.result)}`);
    }

    await load();
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

  const changeStatus = async (id: string, oldStatus: string, newStatus: string) => {
    const { data: updatedSignal, error } = await supabase.from("shared_signals").update({
      signal_status: newStatus,
      status_updated_at: new Date().toISOString(),
    } as any).eq("id", id).select("*").single();

    if (error || !updatedSignal) {
      toast.error("Errore nell'aggiornamento dello stato");
      return;
    }

    const label = SIGNAL_STATUSES.find(s => s.value === newStatus)?.label || newStatus;

    // Only notify for meaningful status transitions on published signals
    const notifiableStatuses = ["triggered", "won", "lost", "expired", "withdrawn"];
    if (notifiableStatuses.includes(newStatus) && updatedSignal.is_published) {
      const notifyOutcome = await invokeStatusChangeNotification({
        signal: updatedSignal as Signal,
        oldStatus,
        newStatus,
        source: "admin-signals-status-change",
      });

      if (notifyOutcome.error) {
        toast.error(`Stato aggiornato (${label}) ma notifiche fallite: ${notifyOutcome.error}`);
      } else {
        toast.success(`Stato: ${label}. ${formatSignalNotificationToast(notifyOutcome.result)}`);
      }
    } else {
      toast.success(`Stato aggiornato: ${label}`);
    }

    load();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Apply filter
  const filtered = signals.filter(sig => {
    if (statusFilter === "all") return true;
    if (statusFilter === "operative") return ["active", "triggered"].includes(sig.signal_status);
    return sig.signal_status === statusFilter;
  });

  const activeCount = signals.filter(s => s.signal_status === "active").length;
  const currentFilterLabel = STATUS_FILTER_OPTIONS.find(f => f.value === statusFilter)?.label || "Tutti";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Segnali globali</h3>
          <Badge variant="outline" className="text-xs">{activeCount} attivi</Badge>
          <Badge variant="outline" className="text-xs">{signals.length} totali</Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Filter className="h-3 w-3 mr-1" />{currentFilterLabel} <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STATUS_FILTER_OPTIONS.map((f) => (
              <DropdownMenuItem
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn("text-xs", statusFilter === f.value && "font-bold")}
              >
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {signals.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun segnale pubblicato. Puoi pubblicare segnali dalla AI Chart Review Easy Mode.</p>
      )}

      {filtered.length === 0 && signals.length > 0 && (
        <p className="text-sm text-muted-foreground">Nessun segnale con filtro "{currentFilterLabel}".</p>
      )}

      <div className="space-y-3">
        {filtered.map((sig) => (
          <SignalRow key={sig.id} signal={sig} onTogglePublish={togglePublish} onToggleArchive={toggleArchive} onDelete={deleteSignal} onChangeStatus={(id, status) => changeStatus(id, sig.signal_status, status)} />
        ))}
      </div>
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
