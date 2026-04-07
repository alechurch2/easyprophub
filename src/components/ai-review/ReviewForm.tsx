import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Upload, BarChart3, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getValidFunctionAuthToken } from "@/lib/getValidFunctionAuthToken";
import { ASSETS, TIMEFRAMES, REQUEST_TYPES } from "./types";
import { ReviewLoadingState } from "./ReviewLoadingState";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  parentReviewId?: string | null;
  defaultAsset?: string;
  defaultTimeframe?: string;
  reviewTier?: "standard" | "premium";
}

export function ReviewForm({ onClose, onSuccess, parentReviewId, defaultAsset, defaultTimeframe, reviewTier = "standard" }: Props) {
  const { user } = useAuth();
  const [asset, setAsset] = useState(defaultAsset || ASSETS[0]);
  const [timeframe, setTimeframe] = useState(defaultTimeframe || TIMEFRAMES[4]);
  const [requestType, setRequestType] = useState(REQUEST_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [userNote, setUserNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [usesAiOverlay, setUsesAiOverlay] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Carica uno screenshot del grafico"); return; }
    setSubmitting(true);

    try {
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("chart-screenshots").upload(filePath, file);
      if (uploadError) { toast.error("Errore nel caricamento dell'immagine"); setSubmitting(false); return; }
      const { data: urlData } = supabase.storage.from("chart-screenshots").getPublicUrl(filePath);
      const screenshotUrl = urlData.publicUrl;

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
            request_type: requestType,
            screenshot_url: screenshotUrl,
            user_note: userNote.trim() || null,
            parent_review_id: parentReviewId || null,
            review_tier: reviewTier,
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

      toast.success(parentReviewId ? "Riesame completato!" : `Review ${reviewTier === "premium" ? "premium " : ""}completata!`);
      onClose();
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Errore di connessione");
    }
    setSubmitting(false);
  };

  if (submitting) {
    return <ReviewLoadingState mode="pro" />;
  }

  return (
    <div className="animate-fade-in">
      {/* ─── FORM HEADER ─── */}
      <div className="card-elevated p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-foreground text-lg">
              {parentReviewId ? "Riesamina con più contesto" : "Pro Mode"}
            </h2>
            <p className="text-xs text-muted-foreground">Analisi tecnica completa con struttura, liquidità e scenari</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* ─── SECTION: MARKET ─── */}
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">1</span>
            <p className="text-label font-semibold uppercase text-muted-foreground/60">Mercato e tipo</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo di richiesta</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REQUEST_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ─── SECTION: SCREENSHOT ─── */}
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">2</span>
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
            placeholder="Questa era la mia idea sul setup..."
            rows={3}
          />
        </div>

        {/* ─── ACTIONS ─── */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground">
            Annulla
          </Button>
          <Button type="submit" disabled={submitting} size="lg" className="px-8 gap-2">
            {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" />Analisi in corso...</>) : (<>Invia richiesta <ChevronRight className="h-4 w-4" /></>)}
          </Button>
        </div>
      </form>
    </div>
  );
}
