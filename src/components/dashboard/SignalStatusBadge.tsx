import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Attivo", color: "bg-success/10 text-success border-success/20" },
  triggered: { label: "Aperto", color: "bg-primary/10 text-primary border-primary/20" },
  won: { label: "Vinto ✓", color: "bg-success/10 text-success border-success/20" },
  lost: { label: "Perso ✗", color: "bg-destructive/10 text-destructive border-destructive/20" },
  expired: { label: "Scaduto", color: "bg-muted text-muted-foreground border-border" },
  withdrawn: { label: "Ritirato", color: "bg-warning/10 text-warning border-warning/20" },
};

export function getSignalStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.active;
}

export function isSignalCopyable(status: string) {
  return status === "active";
}

export function getUncopyableMessage(status: string) {
  switch (status) {
    case "triggered": return "Segnale già attivato";
    case "won": return "Segnale chiuso in profitto";
    case "lost": return "Segnale chiuso in perdita";
    case "expired": return "Segnale non più valido";
    case "withdrawn": return "Segnale ritirato";
    default: return "Segnale non disponibile";
  }
}

export function SignalStatusBadge({ status }: { status: string }) {
  const config = getSignalStatusConfig(status);
  return (
    <Badge className={cn("text-[10px] border font-semibold", config.color)}>
      {config.label}
    </Badge>
  );
}
