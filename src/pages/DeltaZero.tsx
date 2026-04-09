import { useState, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Upload, Crosshair, TrendingUp, TrendingDown, MinusCircle, Clock, ChevronDown, ChevronUp, AlertTriangle, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const ASSETS = ["EURUSD","GBPUSD","USDJPY","XAUUSD","US30","NAS100","BTCUSD","AUDUSD","USDCAD","EURGBP","GBPJPY","EURJPY","US500","GER40","USOIL"];
const TIMEFRAMES = ["M1","M5","M15","M30","H1","H4","D1","W1","MN"];

const biasConfig = {
  buy: { label: "BUY", icon: TrendingUp, gradient: "from-emerald-500 to-green-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  sell: { label: "SELL", icon: TrendingDown, gradient: "from-red-500 to-rose-600", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
  no_trade: { label: "NO TRADE", icon: MinusCircle, gradient: "from-amber-500 to-yellow-600", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
};

export default function DeltaZero() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [asset, setAsset] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("H1");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const analyze = async () => {
    if (!file || !user) return;
    setLoading(true);
    setResult(null);

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/delta-zero/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chart-screenshots").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("chart-screenshots").getPublicUrl(path);
      // chart-screenshots is private, use signed URL
      const { data: signedData } = await supabase.storage.from("chart-screenshots").createSignedUrl(path, 600);
      const screenshotUrl = signedData?.signedUrl || urlData.publicUrl;

      const { data: session } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delta-zero`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({ asset, timeframe, screenshot_url: screenshotUrl }),
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

  const bc = result ? biasConfig[result.bias as keyof typeof biasConfig] || biasConfig.no_trade : null;

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

        {/* Form */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          {/* Asset + TF */}
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
          {result && bc && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={cn("rounded-2xl border bg-card overflow-hidden", bc.border)}
            >
              {/* Bias hero */}
              <div className={cn("p-6 flex flex-col items-center gap-3 bg-gradient-to-b", bc.bg)}>
                <div className={cn("h-16 w-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", bc.gradient)}>
                  <bc.icon className="h-8 w-8 text-white" />
                </div>
                <div className={cn("text-2xl font-bold font-display tracking-tight", bc.text)}>
                  {bc.label}
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-2 w-6 rounded-full transition-all",
                        i <= result.confidence ? `bg-gradient-to-r ${bc.gradient}` : "bg-muted-foreground/15"
                      )}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2 font-mono">{result.confidence}/5</span>
                </div>
              </div>

              {/* Reasoning */}
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">Motivazione</p>
                  <p className="text-sm text-foreground leading-relaxed">{result.reasoning}</p>
                </div>

                {result.warning && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">{result.warning}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 pt-1">
                  <span className="font-mono">{result.asset} · {result.timeframe}</span>
                  <span>·</span>
                  <span>{new Date(result.created_at).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History toggle */}
        {(history?.length || 0) > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Clock className="h-4 w-4" />
              <span>Storico Delta-Zero ({history?.length})</span>
              {showHistory ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 space-y-2"
                >
                  {history?.map((h: any) => {
                    const hbc = biasConfig[h.bias as keyof typeof biasConfig] || biasConfig.no_trade;
                    return (
                      <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/50">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br", hbc.gradient)}>
                          <hbc.icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold font-mono text-foreground">{h.asset}</span>
                            <span className="text-[10px] text-muted-foreground">{h.timeframe}</span>
                            <span className={cn("text-[10px] font-bold uppercase", hbc.text)}>{hbc.label}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{h.reasoning}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={cn("h-1.5 w-3 rounded-full", i <= h.confidence ? `bg-gradient-to-r ${hbc.gradient}` : "bg-muted-foreground/10")} />
                          ))}
                        </div>
                        <span className="text-[9px] text-muted-foreground/50 shrink-0">
                          {new Date(h.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
