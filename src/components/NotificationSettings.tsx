import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Mail, Send, Link, Unlink, Copy, Check, RefreshCw, Crown, Lock } from "lucide-react";
import { toast } from "sonner";

type LinkStatus = "disconnected" | "pending" | "connected";

interface NotificationSettingsProps {
  isFree?: boolean;
}

export default function NotificationSettings({ isFree = false }: NotificationSettingsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("disconnected");
  const [linkCode, setLinkCode] = useState("");
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [polling, setPolling] = useState(false);

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

    // Check for pending link tokens
    const { data: pendingToken } = await supabase
      .from("telegram_link_tokens" as any)
      .select("token, expires_at, used_at")
      .eq("user_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if ((data as any)?.telegram_chat_id) {
      setLinkStatus("connected");
    } else if (pendingToken) {
      setLinkStatus("pending");
      setLinkCode((pendingToken as any).token);
      setLinkExpiresAt((pendingToken as any).expires_at);
    } else {
      setLinkStatus("disconnected");
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Poll for link completion when pending
  useEffect(() => {
    if (linkStatus !== "pending" || !user) return;

    setPolling(true);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("user_notification_preferences")
        .select("telegram_chat_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if ((data as any)?.telegram_chat_id) {
        setTelegramChatId((data as any).telegram_chat_id);
        setTelegramEnabled(true);
        setLinkStatus("connected");
        setLinkCode("");
        setPolling(false);
        clearInterval(interval);
        toast.success("Telegram collegato con successo!");
      }

      // Check if token expired
      if (linkExpiresAt && new Date(linkExpiresAt) < new Date()) {
        setLinkStatus("disconnected");
        setLinkCode("");
        setPolling(false);
        clearInterval(interval);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [linkStatus, user, linkExpiresAt]);

  const generateLinkCode = async () => {
    if (!user) return;
    setGenerating(true);

    // Generate a short random code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase
      .from("telegram_link_tokens" as any)
      .insert({
        user_id: user.id,
        token: code,
      } as any);

    if (error) {
      console.error(error);
      toast.error("Errore nella generazione del codice");
      setGenerating(false);
      return;
    }

    setLinkCode(code);
    setLinkExpiresAt(new Date(Date.now() + 10 * 60 * 1000).toISOString());
    setLinkStatus("pending");
    setGenerating(false);
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(`/start ${linkCode}`);
    setCodeCopied(true);
    toast.success("Comando copiato!");
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const unlinkTelegram = async () => {
    if (!user) return;
    setUnlinking(true);

    const { error } = await supabase
      .from("user_notification_preferences")
      .upsert({
        user_id: user.id,
        telegram_chat_id: null,
        telegram_enabled: false,
      } as any, { onConflict: "user_id" });

    if (error) {
      toast.error("Errore nello scollegamento");
      console.error(error);
    } else {
      setTelegramChatId("");
      setTelegramEnabled(false);
      setLinkStatus("disconnected");
      setLinkCode("");
      toast.success("Telegram scollegato");
    }
    setUnlinking(false);
  };

  const saveEmailPref = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("user_notification_preferences")
      .upsert({
        user_id: user.id,
        email_signals_enabled: emailEnabled,
      } as any, { onConflict: "user_id" });

    if (error) {
      toast.error("Errore nel salvataggio");
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

      {/* Email */}
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

        <Button onClick={saveEmailPref} disabled={saving} size="sm" variant="outline">
          {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Salva preferenza email
        </Button>
      </div>

      {/* Telegram */}
      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Send className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Telegram</Label>
              {isFree && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary gap-1">
                  <Crown className="h-2.5 w-2.5" /> Pro
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Ricevi notifiche istantanee su Telegram</p>
          </div>
        </div>

        {isFree ? (
          <div className="panel-inset p-4 rounded-xl text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-sm font-medium text-muted-foreground/80">
                Disponibile con piano Pro o Live
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/50">
              Upgrade il tuo piano per ricevere notifiche istantanee sui segnali direttamente su Telegram.
            </p>
          </div>
        ) : (
          <>

        {/* Status: Connected */}
        {linkStatus === "connected" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-medium text-primary">
                Telegram collegato
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-muted-foreground">Notifiche segnali</Label>
              </div>
              <Switch
                checked={telegramEnabled}
                onCheckedChange={async (checked) => {
                  setTelegramEnabled(checked);
                  await supabase
                    .from("user_notification_preferences")
                    .upsert({
                      user_id: user!.id,
                      telegram_enabled: checked,
                    } as any, { onConflict: "user_id" });
                  toast.success(checked ? "Notifiche attivate" : "Notifiche disattivate");
                }}
              />
            </div>

            <Button
              onClick={unlinkTelegram}
              disabled={unlinking}
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
            >
              {unlinking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Unlink className="h-3 w-3 mr-1" />}
              Scollega Telegram
            </Button>
          </div>
        )}

        {/* Status: Pending */}
        {linkStatus === "pending" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-accent">
              {polling && <RefreshCw className="h-3 w-3 animate-spin text-accent-foreground" />}
              <span className="text-sm font-medium text-accent-foreground">
                In attesa di collegamento…
              </span>
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-foreground">Istruzioni:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Apri <a href="https://t.me/EasyPropHubBot" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">@EasyPropHubBot</a> su Telegram</li>
                <li>Invia questo comando al bot:</li>
              </ol>

              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 px-3 py-2 rounded bg-background border border-border text-sm font-mono text-foreground select-all">
                  /start {linkCode}
                </code>
                <Button size="sm" variant="outline" onClick={copyCommand} className="shrink-0">
                  {codeCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground mt-1">
                Il codice scade tra 10 minuti. Se scade, genera un nuovo codice.
              </p>
            </div>

            <Button
              onClick={generateLinkCode}
              disabled={generating}
              size="sm"
              variant="outline"
            >
              {generating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Genera nuovo codice
            </Button>
          </div>
        )}

        {/* Status: Disconnected */}
        {linkStatus === "disconnected" && (
          <Button
            onClick={generateLinkCode}
            disabled={generating}
            size="sm"
          >
            {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Link className="h-3 w-3 mr-1" />}
            Collega Telegram
          </Button>
        )}
      </div>
    </div>
  );
}
