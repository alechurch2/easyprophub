import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Loader2, Radio, Archive, Eye, EyeOff, TrendingUp, TrendingDown, Zap, Trash2,
  ChevronDown, Filter, Plus, Pencil, X, Save, Bot, UserCog, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatSignalNotificationToast, invokeSignalNotification, invokeStatusChangeNotification } from "@/lib/signalNotifications";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

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

const ORDER_TYPES = ["market", "buy limit", "sell limit", "buy stop", "sell stop"];
const DIRECTIONS = ["buy", "sell"];

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
  signal_source: string;
  original_payload: any;
  modified_by: string | null;
  modified_at: string | null;
  review_id: string | null;
}

interface SignalFormData {
  asset: string;
  direction: string;
  order_type: string;
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  signal_strength: number;
  signal_quality: string;
  explanation: string;
}

const emptyForm: SignalFormData = {
  asset: "",
  direction: "buy",
  order_type: "market",
  entry_price: "",
  stop_loss: "",
  take_profit: "",
  signal_strength: 3,
  signal_quality: "media",
  explanation: "",
};

function SourceBadge({ source }: { source: string }) {
  if (source === "manual") {
    return <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20"><UserCog className="h-2.5 w-2.5 mr-0.5" />Manuale</Badge>;
  }
  if (source === "ai_modified") {
    return <Badge className="text-[10px] bg-violet-500/10 text-violet-500 border-violet-500/20"><Pencil className="h-2.5 w-2.5 mr-0.5" />AI Modificato</Badge>;
  }
  return <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20"><Bot className="h-2.5 w-2.5 mr-0.5" />AI</Badge>;
}

export { SourceBadge };

export default function AdminSignals() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editSignal, setEditSignal] = useState<Signal | null>(null);
  const [formData, setFormData] = useState<SignalFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

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

  /* ──── Create manual signal ──── */
  const handleCreate = async () => {
    if (!formData.asset || !formData.entry_price || !formData.stop_loss || !formData.take_profit) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("shared_signals").insert({
      asset: formData.asset.toUpperCase().trim(),
      direction: formData.direction,
      order_type: formData.order_type,
      entry_price: parseFloat(formData.entry_price),
      stop_loss: parseFloat(formData.stop_loss),
      take_profit: parseFloat(formData.take_profit),
      signal_strength: formData.signal_strength,
      signal_quality: formData.signal_quality,
      explanation: formData.explanation || null,
      signal_source: "manual",
      signal_status: "active",
      is_published: false,
      is_archived: false,
      created_by: user!.id,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Errore nella creazione del segnale");
      console.error(error);
      return;
    }
    toast.success("Segnale manuale creato");
    setCreateOpen(false);
    setFormData(emptyForm);
    load();
  };

  /* ──── Edit signal (AI or manual) ──── */
  const openEdit = (sig: Signal) => {
    setEditSignal(sig);
    setFormData({
      asset: sig.asset,
      direction: sig.direction,
      order_type: sig.order_type,
      entry_price: String(sig.entry_price),
      stop_loss: String(sig.stop_loss),
      take_profit: String(sig.take_profit),
      signal_strength: sig.signal_strength,
      signal_quality: sig.signal_quality || "media",
      explanation: sig.explanation || "",
    });
  };

  const handleEdit = async () => {
    if (!editSignal) return;
    setSaving(true);

    // Save original payload if this is the first edit of an AI signal
    const isFirstAiEdit = editSignal.signal_source === "ai" && !editSignal.original_payload;
    const originalPayload = isFirstAiEdit ? {
      asset: editSignal.asset,
      direction: editSignal.direction,
      order_type: editSignal.order_type,
      entry_price: editSignal.entry_price,
      stop_loss: editSignal.stop_loss,
      take_profit: editSignal.take_profit,
      signal_strength: editSignal.signal_strength,
      signal_quality: editSignal.signal_quality,
      explanation: editSignal.explanation,
    } : undefined;

    const newSource = editSignal.signal_source === "manual" ? "manual" : "ai_modified";

    const updatePayload: any = {
      asset: formData.asset.toUpperCase().trim(),
      direction: formData.direction,
      order_type: formData.order_type,
      entry_price: parseFloat(formData.entry_price),
      stop_loss: parseFloat(formData.stop_loss),
      take_profit: parseFloat(formData.take_profit),
      signal_strength: formData.signal_strength,
      signal_quality: formData.signal_quality,
      explanation: formData.explanation || null,
      signal_source: newSource,
      modified_by: user!.id,
      modified_at: new Date().toISOString(),
    };

    if (originalPayload) {
      updatePayload.original_payload = originalPayload;
    }

    const { error } = await supabase.from("shared_signals").update(updatePayload).eq("id", editSignal.id);
    setSaving(false);
    if (error) {
      toast.error("Errore nel salvataggio");
      console.error(error);
      return;
    }
    toast.success("Segnale aggiornato");
    setEditSignal(null);
    load();
  };

  /* ──── Existing actions ──── */
  const togglePublish = async (id: string, current: boolean) => {
    const { data: signalData, error: fetchError } = await supabase
      .from("shared_signals").select("*").eq("id", id).single();
    if (fetchError || !signalData) { toast.error("Errore nel caricamento del segnale"); return; }

    const currentPublished = Boolean(signalData.is_published);
    const nextPublished = !currentPublished;
    const updatePayload = nextPublished
      ? { is_published: true, published_at: new Date().toISOString() }
      : { is_published: false };

    const { data: updatedSignal, error: updateError } = await supabase
      .from("shared_signals").update(updatePayload as any).eq("id", id).select("*").single();
    if (updateError || !updatedSignal) { toast.error("Errore nell'aggiornamento del segnale"); return; }

    if (!nextPublished) { toast.success("Segnale ritirato"); await load(); return; }

    const notifyOutcome = await invokeSignalNotification({
      signal: updatedSignal as Signal, currentPublished, nextPublished, source: "admin-signals-toggle",
    });
    if (notifyOutcome.error) toast.error(`Segnale pubblicato ma notifiche fallite: ${notifyOutcome.error}`);
    else if (!notifyOutcome.triggerNotifications) toast(`Segnale pubblicato senza notifiche: ${notifyOutcome.reason}`);
    else toast.success(`Segnale pubblicato. ${formatSignalNotificationToast(notifyOutcome.result)}`);
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
      signal_status: newStatus, status_updated_at: new Date().toISOString(),
    } as any).eq("id", id).select("*").single();
    if (error || !updatedSignal) { toast.error("Errore nell'aggiornamento dello stato"); return; }

    const label = SIGNAL_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
    const notifiableStatuses = ["triggered", "won", "lost", "expired", "withdrawn"];
    if (notifiableStatuses.includes(newStatus) && updatedSignal.is_published) {
      const notifyOutcome = await invokeStatusChangeNotification({
        signal: updatedSignal as Signal, oldStatus, newStatus, source: "admin-signals-status-change",
      });
      if (notifyOutcome.error) toast.error(`Stato aggiornato (${label}) ma notifiche fallite: ${notifyOutcome.error}`);
      else toast.success(`Stato: ${label}. ${formatSignalNotificationToast(notifyOutcome.result)}`);
    } else {
      toast.success(`Stato aggiornato: ${label}`);
    }
    load();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const filtered = signals.filter(sig => {
    if (statusFilter === "all") return true;
    if (statusFilter === "operative") return ["active", "triggered"].includes(sig.signal_status);
    return sig.signal_status === statusFilter;
  });

  const activeCount = signals.filter(s => s.signal_status === "active").length;
  const currentFilterLabel = STATUS_FILTER_OPTIONS.find(f => f.value === statusFilter)?.label || "Tutti";

  /* ──── Signal form (shared between create & edit) ──── */
  const signalForm = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Asset *</Label>
          <Input value={formData.asset} onChange={e => setFormData(p => ({ ...p, asset: e.target.value }))} placeholder="EURUSD" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Direzione *</Label>
          <Select value={formData.direction} onValueChange={v => setFormData(p => ({ ...p, direction: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIRECTIONS.map(d => <SelectItem key={d} value={d} className="capitalize">{d.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Tipo ordine</Label>
        <Select value={formData.order_type} onValueChange={v => setFormData(p => ({ ...p, order_type: v }))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ORDER_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Entry *</Label>
          <Input type="number" step="any" value={formData.entry_price} onChange={e => setFormData(p => ({ ...p, entry_price: e.target.value }))} className="mt-1 font-mono" />
        </div>
        <div>
          <Label className="text-xs">Stop Loss *</Label>
          <Input type="number" step="any" value={formData.stop_loss} onChange={e => setFormData(p => ({ ...p, stop_loss: e.target.value }))} className="mt-1 font-mono" />
        </div>
        <div>
          <Label className="text-xs">Take Profit *</Label>
          <Input type="number" step="any" value={formData.take_profit} onChange={e => setFormData(p => ({ ...p, take_profit: e.target.value }))} className="mt-1 font-mono" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Forza segnale: {formData.signal_strength}/5</Label>
        <Slider
          min={1} max={5} step={1}
          value={[formData.signal_strength]}
          onValueChange={v => setFormData(p => ({ ...p, signal_strength: v[0] }))}
          className="mt-2"
        />
      </div>
      <div>
        <Label className="text-xs">Qualità segnale</Label>
        <Select value={formData.signal_quality} onValueChange={v => setFormData(p => ({ ...p, signal_quality: v }))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="bassa">Bassa</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Spiegazione / nota</Label>
        <Textarea
          value={formData.explanation}
          onChange={e => setFormData(p => ({ ...p, explanation: e.target.value }))}
          placeholder="Breve spiegazione del setup..."
          className="mt-1 min-h-[80px]"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Segnali globali</h3>
          <Badge variant="outline" className="text-xs">{activeCount} attivi</Badge>
          <Badge variant="outline" className="text-xs">{signals.length} totali</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setFormData(emptyForm); setCreateOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Nuovo segnale manuale
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Filter className="h-3 w-3 mr-1" />{currentFilterLabel} <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_FILTER_OPTIONS.map((f) => (
                <DropdownMenuItem key={f.value} onClick={() => setStatusFilter(f.value)} className={cn("text-xs", statusFilter === f.value && "font-bold")}>
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {signals.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun segnale. Crea un segnale manuale o pubblica dalla AI Chart Review Easy Mode.</p>
      )}

      {filtered.length === 0 && signals.length > 0 && (
        <p className="text-sm text-muted-foreground">Nessun segnale con filtro "{currentFilterLabel}".</p>
      )}

      <div className="space-y-3">
        {filtered.map((sig) => (
          <SignalRow key={sig.id} signal={sig} onTogglePublish={togglePublish} onToggleArchive={toggleArchive} onDelete={deleteSignal} onChangeStatus={(id, status) => changeStatus(id, sig.signal_status, status)} onEdit={openEdit} />
        ))}
      </div>

      {/* ──── Create dialog ──── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />Nuovo segnale manuale
            </DialogTitle>
          </DialogHeader>
          {signalForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Save className="h-3.5 w-3.5 mr-1" />Crea segnale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Edit dialog ──── */}
      <Dialog open={!!editSignal} onOpenChange={open => { if (!open) setEditSignal(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />Modifica segnale
              {editSignal && <SourceBadge source={editSignal.signal_source} />}
            </DialogTitle>
          </DialogHeader>

          {/* Show original AI payload if available */}
          {editSignal?.original_payload && (
            <div className="panel-inset p-3 mb-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Bot className="h-3 w-3 text-primary/60" />
                <p className="text-[10px] text-primary/80 font-medium uppercase tracking-wider">Valori originali AI</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">Entry:</span> <span className="font-mono">{editSignal.original_payload.entry_price}</span></div>
                <div><span className="text-muted-foreground">SL:</span> <span className="font-mono text-destructive">{editSignal.original_payload.stop_loss}</span></div>
                <div><span className="text-muted-foreground">TP:</span> <span className="font-mono text-success">{editSignal.original_payload.take_profit}</span></div>
              </div>
            </div>
          )}

          {editSignal?.signal_source === "ai" && !editSignal.original_payload && (
            <div className="flex items-center gap-2 p-3 panel-inset mb-2">
              <AlertCircle className="h-3.5 w-3.5 text-warning" />
              <p className="text-[10px] text-muted-foreground">Modificando un segnale AI, i valori originali verranno salvati automaticamente.</p>
            </div>
          )}

          {signalForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSignal(null)}>Annulla</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Save className="h-3.5 w-3.5 mr-1" />Salva modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──── Signal row component ──── */
function SignalRow({ signal: sig, onTogglePublish, onToggleArchive, onDelete, onChangeStatus, onEdit }: {
  signal: Signal;
  onTogglePublish: (id: string, current: boolean) => void;
  onToggleArchive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onChangeStatus: (id: string, status: string) => void;
  onEdit: (signal: Signal) => void;
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
          <SourceBadge source={sig.signal_source || "ai"} />
          {sig.is_published && !sig.is_archived && (
            <Badge className="text-[10px] bg-success/10 text-success">Pubblicato</Badge>
          )}
          {!sig.is_published && !sig.is_archived && (
            <Badge className="text-[10px] bg-warning/10 text-warning border border-warning/20">⏳ Bozza</Badge>
          )}
          {sig.is_archived && (
            <Badge className="text-[10px] bg-muted text-muted-foreground">Archiviato</Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {sig.is_published ? new Date(sig.published_at).toLocaleString("it-IT") : `Creato: ${new Date(sig.created_at).toLocaleString("it-IT")}`}
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

      {sig.modified_at && (
        <p className="text-[10px] text-muted-foreground/50 mb-2">
          Modificato il {new Date(sig.modified_at).toLocaleString("it-IT")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onEdit(sig)}>
          <Pencil className="h-3 w-3 mr-1" />Modifica
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              Stato <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SIGNAL_STATUSES.map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => onChangeStatus(sig.id, s.value)} className={cn("text-xs", sig.signal_status === s.value && "font-bold")}>
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
