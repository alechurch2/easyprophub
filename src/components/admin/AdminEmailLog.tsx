import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailLogEntry {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  sent: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  dlq: "bg-destructive/10 text-destructive border-destructive/20",
  suppressed: "bg-muted text-muted-foreground border-border",
};

export default function AdminEmailLog() {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setLogs(data as EmailLogEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === "sent").length,
    pending: logs.filter(l => l.status === "pending").length,
    failed: logs.filter(l => ["failed", "dlq"].includes(l.status)).length,
    suppressed: logs.filter(l => l.status === "suppressed").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Log Email</h3>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" />Aggiorna
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="card-premium p-3 text-center">
          <div className="text-lg font-bold text-foreground">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground">Totali</div>
        </div>
        <div className="card-premium p-3 text-center">
          <div className="text-lg font-bold text-success">{stats.sent}</div>
          <div className="text-[10px] text-muted-foreground">Inviate</div>
        </div>
        <div className="card-premium p-3 text-center">
          <div className="text-lg font-bold text-warning">{stats.pending}</div>
          <div className="text-[10px] text-muted-foreground">In coda</div>
        </div>
        <div className="card-premium p-3 text-center">
          <div className="text-lg font-bold text-destructive">{stats.failed}</div>
          <div className="text-[10px] text-muted-foreground">Fallite</div>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna email registrata nel log.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="card-premium p-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[10px] border", STATUS_COLORS[log.status] || "bg-muted text-muted-foreground")}>
                    {log.status}
                  </Badge>
                  <span className="font-medium text-foreground">{log.template_name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("it-IT")}
                </span>
              </div>
              <div className="text-muted-foreground">{log.recipient_email}</div>
              {log.error_message && (
                <div className="text-destructive mt-1 text-[10px]">⚠️ {log.error_message}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
