import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3, Upload, Loader2, AlertTriangle, TrendingUp, TrendingDown,
  Target, ShieldAlert, Star, Eye, Layers, Droplets, MapPin, CheckCircle2, XCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "ETH/USD", "US30", "NAS100", "SPX500"];
const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const REQUEST_TYPES = ["Analisi completa", "Setup check", "Bias confirmation", "Zone di interesse"];

interface Review {
  id: string;
  asset: string;
  timeframe: string;
  request_type: string;
  screenshot_url: string | null;
  analysis: any;
  status: string;
  created_at: string;
}

export default function AIReview() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [asset, setAsset] = useState(ASSETS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[4]);
  const [requestType, setRequestType] = useState(REQUEST_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("ai_chart_reviews")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setReviews(data);
    setLoading(false);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Carica uno screenshot del grafico");
      return;
    }
    setSubmitting(true);

    try {
      // Upload screenshot
      let screenshotUrl: string | null = null;
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("chart-screenshots").upload(filePath, file);
      if (uploadError) {
        toast.error("Errore nel caricamento dell'immagine");
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("chart-screenshots").getPublicUrl(filePath);
      screenshotUrl = urlData.publicUrl;

      // Call edge function
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chart-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            asset,
            timeframe,
            request_type: requestType,
            screenshot_url: screenshotUrl,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Errore nell'analisi AI");
        setSubmitting(false);
        return;
      }

      toast.success("Review completata!");
      setShowForm(false);
      setFile(null);
      loadReviews();
    } catch (err) {
      console.error(err);
      toast.error("Errore di connessione");
    }
    setSubmitting(false);
  };

  const AnalysisField = ({ icon: Icon, label, value, iconColor = "text-primary", borderColor = "" }: {
    icon: any; label: string; value: string | number; iconColor?: string; borderColor?: string;
  }) => (
    <div className={cn("card-premium p-4", borderColor)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );

  const renderAnalysis = (analysis: any) => {
    if (!analysis) return null;
    return (
      <div className="space-y-4">
        {/* Image readability + quality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalysisField icon={Eye} label="Leggibilità immagine" value={analysis.leggibilita_immagine} />
          <AnalysisField icon={Star} label="Qualità Setup" value={`${analysis.qualita_setup}/10`} iconColor="text-primary" />
        </div>

        {/* Context + Bias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalysisField icon={FileText} label="Contesto" value={analysis.contesto} />
          <AnalysisField icon={Target} label="Bias / Direzione" value={analysis.bias} />
        </div>

        {/* Structure + Liquidity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalysisField icon={Layers} label="Struttura" value={analysis.struttura} />
          <AnalysisField icon={Droplets} label="Liquidità" value={analysis.liquidita} />
        </div>

        {/* Interesting zone + Confirmation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalysisField icon={MapPin} label="Zona interessante" value={analysis.zona_interessante} />
          <AnalysisField icon={CheckCircle2} label="Conferma richiesta" value={analysis.conferma_richiesta} />
        </div>

        {/* Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalysisField icon={TrendingUp} label="Scenario Bullish" value={analysis.scenario_bullish} iconColor="text-success" />
          <AnalysisField icon={TrendingDown} label="Scenario Bearish" value={analysis.scenario_bearish} iconColor="text-destructive" />
        </div>

        {/* Invalidation */}
        <AnalysisField icon={XCircle} label="Invalidazione" value={analysis.invalidazione} iconColor="text-destructive" borderColor="border-destructive/20" />

        {/* Warning */}
        {analysis.warning && (
          <AnalysisField icon={AlertTriangle} label="Warning" value={analysis.warning} iconColor="text-warning" borderColor="border-warning/20" />
        )}

        {/* Conclusion */}
        <AnalysisField icon={ShieldAlert} label="Conclusione" value={analysis.conclusione} iconColor="text-primary" borderColor="border-primary/20" />
      </div>
    );
  };

  if (selectedReview) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
          <button onClick={() => setSelectedReview(null)} className="text-sm text-primary hover:underline mb-4">
            ← Torna alle review
          </button>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">
                {selectedReview.asset} - {selectedReview.timeframe}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedReview.request_type} · {new Date(selectedReview.created_at).toLocaleString("it-IT")}
              </p>
            </div>
            <Badge className={cn(
              selectedReview.status === "completed" ? "bg-success/10 text-success" :
              selectedReview.status === "failed" ? "bg-destructive/10 text-destructive" :
              "bg-warning/10 text-warning"
            )}>
              {selectedReview.status === "completed" ? "Completata" : selectedReview.status === "failed" ? "Fallita" : "In attesa"}
            </Badge>
          </div>

          {selectedReview.screenshot_url && (
            <div className="card-premium p-2 mb-6">
              <img src={selectedReview.screenshot_url} alt="Chart" className="rounded-lg w-full max-h-80 object-contain" />
            </div>
          )}

          {selectedReview.status === "failed" && (
            <div className="card-premium p-6 text-center border-destructive/20">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="text-muted-foreground">L'analisi non è stata completata. Riprova con un'immagine più chiara.</p>
            </div>
          )}

          {renderAnalysis(selectedReview.analysis)}

          <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> Questa analisi è generata a scopo educativo e informativo. Non costituisce consulenza finanziaria
              né raccomandazione operativa. Le decisioni di trading sono sotto la tua esclusiva responsabilità.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-success" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">AI Chart Review</h1>
              <p className="text-sm text-muted-foreground">Ottieni un'analisi strutturata dei tuoi grafici</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Upload className="h-4 w-4 mr-1" />
            Nuova review
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="p-4 mb-6 bg-secondary/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>⚠️ Disclaimer:</strong> L'AI Chart Review fornisce supporto analitico a scopo educativo.
            Non esegue operazioni automatiche e non costituisce consulenza finanziaria.
          </p>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card-premium p-6 mb-8 animate-fade-in">
            <h2 className="font-heading font-semibold text-foreground mb-4">Richiedi una review</h2>
            <form onSubmit={submitReview} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-foreground">Asset</Label>
                  <Select value={asset} onValueChange={setAsset}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Tipo di richiesta</Label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-foreground">Screenshot del grafico</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="mt-1.5"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Analisi in corso...
                    </>
                  ) : "Invia richiesta"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews list */}
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Le tue review</h2>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="card-premium p-8 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nessuna review effettuata</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReview(r)}
                  className="w-full card-premium p-4 text-left hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        {r.asset} - {r.timeframe}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.request_type} · {new Date(r.created_at).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <Badge className={cn(
                      r.status === "completed" ? "bg-success/10 text-success" :
                      r.status === "failed" ? "bg-destructive/10 text-destructive" :
                      "bg-warning/10 text-warning"
                    )}>
                      {r.status === "completed" ? "Completata" : r.status === "failed" ? "Fallita" : "In attesa"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
