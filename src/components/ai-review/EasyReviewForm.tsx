import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Link2, ShieldCheck, Upload, Camera, ChevronRight, Layers, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getValidFunctionAuthToken } from "@/lib/getValidFunctionAuthToken";
import { ASSETS, TIMEFRAMES } from "./types";
import { ACCOUNT_PRESETS, RISK_PRESETS, MAX_CUSTOM_RISK } from "./lotSizeCalculator";
import { ReviewLoadingState } from "./ReviewLoadingState";
import { useRiskPreferences } from "@/hooks/useRiskPreferences";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  reviewTier?: "standard" | "premium";
  licenseLevel?: string;
}

export function EasyReviewForm({ onClose, onSuccess, reviewTier = "standard", licenseLevel = "free" }: Props) {
  const { user } = useAuth();
  const { prefs: riskPrefs, linkedAccount, loading: riskPrefsLoading, getRiskContext } = useRiskPreferences();
  const [asset, setAsset] = useState(ASSETS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[4]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [userNote, setUserNote] = useState("");
  const [accountPreset, setAccountPreset] = useState<string>("");
  const [customAccount, setCustomAccount] = useState("");
  const [riskPercent, setRiskPercent] = useState<string>("");
  const [customRisk, setCustomRisk] = useState("");
  const isCustomRisk = riskPercent === "custom";
  const [submitting, setSubmitting] = useState(false);
  const [usesAiOverlay, setUsesAiOverlay] = useState(false);

  const [connectedEquity, setConnectedEquity] = useState<number | null>(null);
  const [connectedAccountName, setConnectedAccountName] = useState<string | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Initialize from saved risk preferences
  useEffect(() => {
    if (riskPrefsLoading) return;
    const riskCtx = getRiskContext();
    // Set account preset from saved preference
    if (riskPrefs.risk_reference_type === "linked_account" && linkedAccount) {
      setAccountPreset("linked");
    } else {
      const matchedPreset = ACCOUNT_PRESETS.find(p => p.value === riskPrefs.manual_account_size);
      setAccountPreset(matchedPreset ? String(matchedPreset.value) : "custom");
      if (!matchedPreset) setCustomAccount(String(riskPrefs.manual_account_size));
    }
    // Set risk percent from saved preference
    const matchedRisk = RISK_PRESETS.find(p => p.value === riskPrefs.default_risk_percent);
    if (matchedRisk) {
      setRiskPercent(String(matchedRisk.value));
    } else {
      setRiskPercent("custom");
      setCustomRisk(String(riskPrefs.default_risk_percent * 100));
    }
  }, [riskPrefsLoading]);

  useEffect(() => {
    if (!user) return;
    loadConnectedAccount();
  }, [user]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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

  const selectedRisk = isCustomRisk
    ? Math.min(Math.max(parseFloat(customRisk) || 0, 0) / 100, MAX_CUSTOM_RISK)
    : parseFloat(riskPercent);
  const riskMonetary = accountSize > 0 && selectedRisk > 0 ? (accountSize * selectedRisk).toFixed(2) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Carica uno screenshot del grafico"); return; }
    if (accountSize <= 0) {
      toast.error(isLinked ? "Nessun conto collegato con equity valida" : "Inserisci la dimensione del conto");
      return;
    }
    if (selectedRisk <= 0 || selectedRisk > MAX_CUSTOM_RISK) {
      toast.error(`Il rischio deve essere tra 0.01% e ${MAX_CUSTOM_RISK * 100}%`);
      return;
    }
    setSubmitting(true);

    try {
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("chart-screenshots").upload(filePath, file);
      if (uploadError) { toast.error("Errore nel caricamento dell'immagine"); setSubmitting(false); return; }
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from("chart-screenshots").createSignedUrl(filePath, 3600);
      if (signedUrlError || !signedUrlData?.signedUrl) { toast.error("Errore nel generare l'URL dell'immagine"); setSubmitting(false); return; }

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
            screenshot_url: signedUrlData.signedUrl,
            user_note: userNote.trim() || null,
            review_mode: "easy",
            account_size: accountSize,
            review_tier: reviewTier,
            risk_percent: selectedRisk,
            uses_ai_overlay: usesAiOverlay,
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
    <div className="animate-fade-in">
      {/* ─── FORM HEADER ─── */}
      <div className="card-elevated p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-foreground text-lg">Easy Mode</h2>
            <p className="text-xs text-muted-foreground">Analisi semplificata con idea operativa diretta</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* ─── SECTION: ASSET & TIMEFRAME ─── */}
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">1</span>
            <p className="text-label font-semibold uppercase text-muted-foreground/60">Mercato</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ─── SECTION: ACCOUNT SIZE ─── */}
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">2</span>
            <p className="text-label font-semibold uppercase text-muted-foreground/60">Grandezza conto</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setAccountPreset(String(p.value))}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-semibold border transition-all duration-200",
                  accountPreset === String(p.value)
                    ? "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20"
                    : "bg-card text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAccountPreset("custom")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-semibold border transition-all duration-200",
                isCustom
                  ? "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20"
                  : "bg-card text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
              )}
            >
              Personalizzato
            </button>
            {connectedEquity && connectedEquity > 0 && (
              <button
                type="button"
                onClick={() => setAccountPreset("linked")}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5",
                  isLinked
                    ? "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20"
                    : "bg-card text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
                )}
              >
                <Link2 className="h-3 w-3" />
                Conto collegato
              </button>
            )}
          </div>
          {isCustom && (
            <Input
              type="number"
              value={customAccount}
              onChange={(e) => setCustomAccount(e.target.value)}
              placeholder="Es: 75000"
              className="mt-3 max-w-[200px]"
              min={1}
            />
          )}
          {isLinked && connectedEquity && (
            <div className="mt-3 panel-inset p-3 flex items-center gap-3">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Equity corrente</p>
                <p className="text-sm font-semibold text-foreground font-mono-data">
                  {connectedAccountName} — ${connectedEquity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── SECTION: RISK ─── */}
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">3</span>
            <p className="text-label font-semibold uppercase text-muted-foreground/60">Rischio per operazione</p>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Seleziona quanto del conto vuoi rischiare su questa operazione.
          </p>
          <div className="flex flex-wrap gap-2">
            {RISK_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setRiskPercent(String(p.value))}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-xs font-bold border transition-all duration-200",
                  riskPercent === String(p.value)
                    ? "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20"
                    : "bg-card text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRiskPercent("custom")}
              className={cn(
                "rounded-lg px-4 py-2.5 text-xs font-bold border transition-all duration-200",
                isCustomRisk
                  ? "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20"
                  : "bg-card text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
              )}
            >
              Personalizzato
            </button>
          </div>
          {isCustomRisk && (
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                value={customRisk}
                onChange={(e) => setCustomRisk(e.target.value)}
                placeholder="Es: 0.15"
                className="max-w-[140px]"
                min={0.01}
                max={MAX_CUSTOM_RISK * 100}
                step={0.01}
              />
              <span className="text-xs text-muted-foreground">% (max {MAX_CUSTOM_RISK * 100}%)</span>
            </div>
          )}
          {riskMonetary && accountSize > 0 && selectedRisk > 0 && (
            <div className="mt-3 panel-inset p-3 flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                Rischio: <span className="font-semibold text-foreground font-mono-data">{(selectedRisk * 100).toFixed(2).replace(/\.?0+$/, '')}%</span> di{" "}
                <span className="font-semibold text-foreground font-mono-data">${accountSize.toLocaleString()}</span>{" "}
                = <span className="font-bold text-destructive font-mono-data">${parseFloat(riskMonetary).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
          )}
          {/* Prop firm disclaimer */}
          <div className="mt-3 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-amber-600">💡 Prop firm:</span>{" "}
              Se stai operando su un conto prop firm, ti consigliamo di mantenere il rischio sotto lo 0,25% per rispettare i limiti di drawdown.
            </p>
          </div>
        </div>

        {/* ─── SECTION: SCREENSHOT ─── */}
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">4</span>
            <p className="text-label font-semibold uppercase text-muted-foreground/60">Grafico</p>
          </div>
          
          {preview ? (
            <div className="relative group">
              <img src={preview} alt="Preview" className="rounded-lg w-full max-h-48 object-contain border border-border/60 bg-background" />
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/30 bg-muted/20 p-8 cursor-pointer transition-all duration-200 group">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Carica screenshot del grafico</p>
              <p className="text-[10px] text-muted-foreground/60">PNG, JPG — max 10MB</p>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            </label>
          )}

          {/* ── AI Overlay toggle ── */}
          {(() => {
            const isOverlayLocked = licenseLevel === "free";
            return (
              <div className={cn(
                "mt-4 rounded-xl border p-4 transition-all duration-200",
                isOverlayLocked
                  ? "border-border/30 bg-muted/5 opacity-70"
                  : usesAiOverlay
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-border/40 bg-muted/10"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isOverlayLocked
                      ? "bg-muted/20 text-muted-foreground/50"
                      : usesAiOverlay ? "bg-primary/15 text-primary" : "bg-muted/30 text-muted-foreground"
                  )}>
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-semibold", isOverlayLocked ? "text-muted-foreground/60" : "text-foreground")}>
                          Screenshot con indicatore AI Overlay
                        </p>
                        {isOverlayLocked && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-500 uppercase tracking-wide">
                            <Crown className="h-2.5 w-2.5" />
                            Pro / Live
                          </span>
                        )}
                      </div>
                      <Switch
                        checked={isOverlayLocked ? false : usesAiOverlay}
                        onCheckedChange={isOverlayLocked ? undefined : setUsesAiOverlay}
                        disabled={isOverlayLocked}
                      />
                    </div>
                    <p className={cn("text-[11px] mt-1 leading-relaxed", isOverlayLocked ? "text-muted-foreground/40" : "text-muted-foreground")}>
                      {isOverlayLocked
                        ? "Overlay AI disponibile solo nei piani a pagamento. Passa a Pro o Live per sbloccare questa funzione."
                        : "Se attivo, l'AI interpreterà colori, livelli, pannello e segnali visivi del grafico secondo la legenda dell'indicatore proprietario."}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ─── SECTION: NOTE ─── */}
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-muted/50 text-muted-foreground text-[10px] font-bold">?</span>
            <p className="text-label font-semibold uppercase text-muted-foreground/60">Nota <span className="normal-case font-normal">(facoltativa)</span></p>
          </div>
          <Textarea
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder="Cosa pensi di questo grafico?"
            rows={2}
          />
        </div>

        {/* ─── ACTIONS ─── */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground">
            Annulla
          </Button>
          <Button type="submit" disabled={submitting} size="lg" className="px-8 gap-2">
            Analizza
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
