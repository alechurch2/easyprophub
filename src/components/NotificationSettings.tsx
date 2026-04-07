import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Mail, Send } from "lucide-react";
import { toast } from "sonner";

export default function NotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setEmailEnabled((data as any).email_signals_enabled ?? true);
      setTelegramEnabled((data as any).telegram_enabled ?? false);
      setTelegramChatId((data as any).telegram_chat_id ?? "");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      email_signals_enabled: emailEnabled,
      telegram_enabled: telegramEnabled,
      telegram_chat_id: telegramChatId.trim() || null,
    };

    const { error } = await supabase
      .from("user_notification_preferences")
      .upsert(payload as any, { onConflict: "user_id" });

    if (error) {
      toast.error("Errore nel salvataggio preferenze");
      console.error(error);
    } else {
      toast.success("Preferenze salvate");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="font-heading font-semibold text-foreground">Notifiche</h3>
      </div>

      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">Email segnali</Label>
              <p className="text-xs text-muted-foreground">Ricevi email quando vengono pubblicati nuovi segnali</p>
            </div>
          </div>
          <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Telegram</Label>
                <p className="text-xs text-muted-foreground">Ricevi notifiche istantanee su Telegram</p>
              </div>
            </div>
            <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
          </div>

          {telegramEnabled && (
            <div className="space-y-2 ml-6">
              <Label className="text-xs text-muted-foreground">Chat ID Telegram</Label>
              <Input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Es: 123456789"
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Per ottenere il tuo Chat ID: avvia il bot <strong>@EasyPropBot</strong> su Telegram e invia /start.
                Il bot ti risponderà con il tuo Chat ID.
              </p>
            </div>
          )}
        </div>
      </div>

      <Button onClick={save} disabled={saving} size="sm">
        {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        Salva preferenze
      </Button>
    </div>
  );
}
