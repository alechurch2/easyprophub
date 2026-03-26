import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Link2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getValidFunctionAuthToken } from "@/lib/getValidFunctionAuthToken";
import { ASSETS, TIMEFRAMES } from "./types";
import { ACCOUNT_PRESETS, RISK_PRESETS } from "./lotSizeCalculator";
import { ReviewLoadingState } from "./ReviewLoadingState";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  reviewTier?: "standard" | "premium";
}

export function EasyReviewForm({ onClose, onSuccess, reviewTier = "standard" }: Props) {
  const { user } = useAuth();
  const [asset, setAsset] = useState(ASSETS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[4]);
  const [file, setFile] = useState<File | null>(null);
  const [userNote, setUserNote] = useState("");
  const [accountPreset, setAccountPreset] = useState("100000");
  const [customAccount, setCustomAccount] = useState("");
  const [riskPercent, setRiskPercent] = useState("0.005"); // default 0.50%
  const [submitting, setSubmitting] = useState(false);

  // Connected account state
  const [connectedEquity, setConnectedEquity] = useState<number | null>(null);
  const [connectedAccountName, setConnectedAccountName] = useState<string | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadConnectedAccount();
  }, [user]);

  const loadConnectedAccount = async () => {
    setLoadingAccount(true);
    const { data } = await supabase
      .from("trading_accounts")
      .select("account_name, equity, balance, connection_status")
      .eq("user_id", user!.id)
      .eq("connection_status", "connected")
      .limit(1);

    if (data && data.length > 0) {
      const acc = data[0] as any;
      const eq = acc.equity && acc.equity > 0 ? acc.equity : acc.balance || 0;
      setConnectedEquity(eq);
      setConnectedAccountName(acc.account_name);
    }
    setLoadingAccount(false);
  };

  const isCustom = accountPreset === "custom";
  const isLinked = accountPreset === "linked";
  const accountSize = isLinked
    ? (connectedEquity || 0)
    : isCustom
      ? parseInt(customAccount) || 0
      : parseInt(accountPreset);

  const selectedRisk = parseFloat(riskPercent);
  const riskMonetary = accountSize > 0 ? (accountSize * selectedRisk).toFixed(2) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Carica uno screenshot del grafico"); return; }
    if (accountSize <= 0) {
      toast.error(isLinked ? "Nessun conto collegato con equity valida" : "Inserisci la dimensione del conto");
      return;
    }
    setSubmitting(true);

    try {
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("chart-screenshots").upload(filePath, file);
      if (uploadError) { toast.error("Errore nel caricamento dell'immagine"); setSubmitting(false); return; }
      const { data: urlData } = supabase.storage.from("chart-screenshots").getPublicUrl(filePath);

      const { token, error: tokenError } = await getValidFunctionAuthToken();
      if (tokenError || !token) {
        toast.error(tokenError || "Sessione non valida. Effettua di nuovo il login.");
        setSubmitting(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chart-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            asset,
            timeframe,
            request_type: "Easy Mode",
            screenshot_url: urlData.publicUrl,
            user_note: userNote.trim() || null,
            review_mode: "easy",
            account_size: accountSize,
            review_tier: reviewTier,
            risk_percent: selectedRisk,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        if (result.quota_exceeded) {
          toast.error("Hai esaurito le review premium disponibili per questo mese.");
        } else {
          toast.error(result.error || "Errore nell'analisi AI");
        }
        setSubmitting(false);
        return;
      }
      trackEvent("review_completed", { page: "ai-review", section: "ai-review", metadata: { mode: "easy", tier: reviewTier, asset } });
      trackEvent(reviewTier === "premium" ? "review_premium_used" : "review_standard_used", { section: "ai-review" });
      trackEvent("review_easy_used", { section: "ai-review" });
      toast.success(`Analisi ${reviewTier === "premium" ? "premium " : ""}completata!`);
      onClose();
      onSuccess();
    } catch {
      toast.error("Errore di connessione");
    }
    setSubmitting(false);
  };

  if (submitting) {
    return <ReviewLoadingState mode="easy" />;
  }

  return (
    <div className="card-premium p-6 mb-8 animate-fade-in">
      <h2 className="font-heading font-semibold text-foreground mb-1">Easy Mode — Analisi semplificata</h2>
      <p className="text-xs text-muted-foreground mb-4">Carica il tuo grafico e ricevi un'idea operativa chiara e semplice</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-foreground">Asset</Label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-foreground">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-foreground">Grandezza conto</Label>
          <ToggleGroup
            type="single"
            value={accountPreset}
            onValueChange={(v) => v && setAccountPreset(v)}
            className="mt-1.5 justify-start flex-wrap"
          >
            {ACCOUNT_PRESETS.map((p) => (
              <ToggleGroupItem key={p.value} value={String(p.value)} className="text-xs px-4">
                {p.label}
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem value="custom" className="text-xs px-4">Personalizzato</ToggleGroupItem>
            {connectedEquity && connectedEquity > 0 && (
              <ToggleGroupItem value="linked" className="text-xs px-4 gap-1">
                <Link2 className="h-3 w-3" />
                Conto collegato
              </ToggleGroupItem>
            )}
          </ToggleGroup>
          {isCustom && (
            <Input
              type="number"
              value={customAccount}
              onChange={(e) => setCustomAccount(e.target.value)}
              placeholder="Es: 75000"
              className="mt-2 max-w-[200px]"
              min={1}
            />
          )}
          {isLinked && connectedEquity && (
            <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">Equity corrente del conto collegato:</p>
              <p className="text-sm font-semibold text-foreground">
                {connectedAccountName} — ${connectedEquity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        {/* ═══ RISK PERCENT SELECTOR ═══ */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <Label className="text-foreground">Rischio per operazione</Label>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            Seleziona quanto del conto vuoi rischiare su questa operazione (max 1%).
          </p>
          <ToggleGroup
            type="single"
            value={riskPercent}
            onValueChange={(v) => v && setRiskPercent(v)}
            className="justify-start"
          >
            {RISK_PRESETS.map((p) => (
              <ToggleGroupItem
                key={p.value}
                value={String(p.value)}
                className={cn(
                  "text-xs px-5 py-2 font-semibold",
                  riskPercent === String(p.value) && "ring-1 ring-primary"
                )}
              >
                {p.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {riskMonetary && accountSize > 0 && (
            <div className="mt-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Rischio: <span className="font-semibold text-foreground">{(selectedRisk * 100).toFixed(2).replace(/\.?0+$/, '')}%</span> di{" "}
                <span className="font-semibold text-foreground">${accountSize.toLocaleString()}</span>{" "}
                = <span className="font-semibold text-destructive">${parseFloat(riskMonetary).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
          )}
        </div>

        <div>
          <Label className="text-foreground">Screenshot del grafico</Label>
          <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1.5" />
        </div>

        <div>
          <Label className="text-foreground">Nota <span className="text-muted-foreground font-normal">(facoltativa — es: "Penso sia un buy")</span></Label>
          <Textarea
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder="Cosa pensi di questo grafico?"
            className="mt-1.5"
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Analisi in corso...</>) : "Analizza"}
          </Button>
        </div>
      </form>
    </div>
  );
}