import { useState, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLicenseSettings } from "@/hooks/useLicenseSettings";
import { Crosshair, ImageIcon, Layers, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import DeltaZeroResult from "@/components/delta-zero/DeltaZeroResult";
import DeltaZeroHistory from "@/components/delta-zero/DeltaZeroHistory";
import DeltaZeroAccounts from "@/components/delta-zero/DeltaZeroAccounts";
import DeltaZeroTradeSetup from "@/components/delta-zero/DeltaZeroTradeSetup";

const ASSETS = ["EURUSD","GBPUSD","USDJPY","XAUUSD","US30","NAS100","BTCUSD","AUDUSD","USDCAD","EURGBP","GBPJPY","EURJPY","US500","GER40","USOIL"];
const TIMEFRAMES = ["M1","M5","M15","M30","H1","H4","D1","W1","MN"];

export default function DeltaZero() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { settings: licenseSettings, loading: licenseLoading } = useLicenseSettings();
  const isDeltaZeroEnabled = isAdmin || licenseSettings.delta_zero_enabled;
  const [asset, setAsset] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("H1");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [usesOverlay, setUsesOverlay] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showTradeSetup, setShowTradeSetup] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Delta-Zero dedicated accounts
  const { data: dzAccounts, refetch: refetchAccounts } = useQuery({
    queryKey: ["dz-accounts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("scope", "delta_zero")
        .order("created_at");
      return (data as any[]) || [];
    },
    enabled: !!user?.id && isDeltaZeroEnabled,
  });

  const { data: dzSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["dz-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("delta_zero_account_settings")
        .select("*");
      return (data as any[]) || [];
    },
    enabled: !!user?.id && isDeltaZeroEnabled,
  });

  const brokerAccount = dzAccounts?.find((a: any) => {
    const s = dzSettings?.find((s: any) => s.account_id === a.id);
    return s?.role === "broker";
  }) || null;

  const hedgeAccount = dzAccounts?.find((a: any) => {
    const s = dzSettings?.find((s: any) => s.account_id === a.id);
    return s?.role === "hedge";
  }) || null;

  const brokerSettings = dzSettings?.find((s: any) => s.role === "broker") || null;
  const hedgeSettings = dzSettings?.find((s: any) => s.role === "hedge") || null;

  const bothConnected = brokerAccount?.connection_status === "connected" && hedgeAccount?.connection_status === "connected";

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["delta-zero-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("delta_zero_analyses" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as any[]) || [];
    },
    enabled: !!user?.id,
  });

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
    setResult(null);
    setShowTradeSetup(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const resetForNewAnalysis = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setShowTradeSetup(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRefreshAccounts = () => {
    refetchAccounts();
    refetchSettings();
  };

  const analyze = async () => {
    if (!file || !user) return;
    setLoading(true);
    setResult(null);
    setShowTradeSetup(false);

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/delta-zero/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chart-screenshots").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: signedData } = await supabase.storage.from("chart-screenshots").createSignedUrl(path, 600);
      const { data: urlData } = supabase.storage.from("chart-screenshots").getPublicUrl(path);
      const screenshotUrl = signedData?.signedUrl || urlData.publicUrl;

      const { data: session } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delta-zero`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({ asset, timeframe, screenshot_url: screenshotUrl, uses_overlay: usesOverlay }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Errore analisi");
      }

      const data = await resp.json();
      setResult(data);
      refetchHistory();
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Crosshair className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight font-display">Delta-Zero</h1>
            <p className="text-xs text-muted-foreground">Bias operativo istantaneo</p>
          </div>
        </div>

        {/* Premium Gate */}
        {!isDeltaZeroEnabled && !licenseLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Crown className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground font-display">Funzione non attiva</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Delta-Zero non è incluso nel tuo piano attuale. Contatta il supporto per richiedere l'attivazione.
            </p>
          </div>
        ) : (
          <>
            {/* Accounts */}
            <DeltaZeroAccounts
              brokerAccount={brokerAccount}
              hedgeAccount={hedgeAccount}
              brokerSettings={brokerSettings}
              hedgeSettings={hedgeSettings}
              onRefresh={handleRefreshAccounts}
            />

            {/* Form */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Asset</label>
                  <select value={asset} onChange={(e) => setAsset(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono">
                    {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Timeframe</label>
                  <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono">
                    {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Overlay toggle */}
              <button
                type="button"
                onClick={() => setUsesOverlay(!usesOverlay)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left",
                  usesOverlay ? "border-primary/40 bg-primary/5" : "border-border/40 bg-muted/20 hover:border-border/60"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  usesOverlay ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground/50"
                )}>
                  <Layers className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", usesOverlay ? "text-foreground" : "text-muted-foreground")}>
                    AI Overlay
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Screenshot con indicatore AI Overlay EasyProp
                  </p>
                </div>
                <div className={cn(
                  "h-5 w-9 rounded-full transition-colors relative shrink-0",
                  usesOverlay ? "bg-primary" : "bg-muted-foreground/20"
                )}>
                  <div className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    usesOverlay ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </div>
              </button>

              {/* Upload */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[140px] overflow-hidden",
                  dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/50 hover:border-primary/40 hover:bg-muted/30",
                  preview && "border-solid border-border/30"
                )}
              >
                {preview ? (
                  <img src={preview} alt="Screenshot" className="w-full h-auto max-h-[240px] object-contain rounded-lg" />
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm text-muted-foreground">Trascina o clicca per caricare</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">Screenshot del grafico</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              {/* CTA */}
              <button
                onClick={analyze}
                disabled={!file || loading}
                className={cn(
                  "w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                  !file || loading
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Analisi in corso…
                  </span>
                ) : (
                  "Analizza bias"
                )}
              </button>
            </div>

            {/* Loading */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-primary/20 bg-card p-6 flex flex-col items-center gap-3"
                >
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                    <div className="absolute inset-1 rounded-full border-2 border-t-primary border-transparent animate-spin" />
                    <Crosshair className="absolute inset-3 h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Delta-Zero sta analizzando…</p>
                  <p className="text-[11px] text-muted-foreground">Lettura bias in corso</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result */}
            <AnimatePresence>
              {result && !showTradeSetup && (
                <DeltaZeroResult
                  result={result}
                  onNewAnalysis={resetForNewAnalysis}
                  showTradeAction={bothConnected && result.bias !== "no_trade"}
                  onTradeSetup={() => setShowTradeSetup(true)}
                />
              )}
            </AnimatePresence>

            {/* Trade Setup */}
            <AnimatePresence>
              {showTradeSetup && result && result.bias !== "no_trade" && brokerAccount && hedgeAccount && brokerSettings && hedgeSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <DeltaZeroTradeSetup
                    bias={result.bias}
                    asset={result.asset || asset}
                    timeframe={result.timeframe || timeframe}
                    confidence={result.confidence}
                    brokerAccount={brokerAccount}
                    hedgeAccount={hedgeAccount}
                    brokerSettings={brokerSettings}
                    hedgeSettings={hedgeSettings}
                    onClose={() => setShowTradeSetup(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* History */}
            <DeltaZeroHistory
              history={history}
              onSelect={(analysis) => {
                setResult(analysis);
                setShowTradeSetup(false);
                setAsset(analysis.asset || asset);
                setTimeframe(analysis.timeframe || timeframe);
              }}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
