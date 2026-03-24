import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Upload, Loader2, AlertTriangle, TrendingUp, TrendingDown, Target, ShieldAlert, Star } from "lucide-react";
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

    let screenshotUrl: string | null = null;
    const filePath = `${user!.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("chart-screenshots").upload(filePath, file);
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("chart-screenshots").getPublicUrl(filePath);
      screenshotUrl = urlData.publicUrl;
    }

    // Create the review request (AI analysis will be integrated later via API)
    const mockAnalysis = {
      bias: "Rialzista con cautela",
      zones: ["1.0850 - zona di domanda", "1.0920 - resistenza chiave"],
      invalidation: "Sotto 1.0800",
      bullish_scenario: "Break sopra 1.0920 con volumi, target 1.0980",
      bearish_scenario: "Rejection a 1.0920, ritorno verso 1.0850",
      setup_quality: 7,
      risk_notes: "Attenzione ai dati macro in uscita questa settimana",
    };

    const { error } = await supabase.from("ai_chart_reviews").insert({
      user_id: user!.id,
      asset,
      timeframe,
      request_type: requestType,
      screenshot_url: screenshotUrl,
      analysis: mockAnalysis,
      status: "completed" as any,
    });

    if (error) {
      toast.error("Errore nell'invio della richiesta");
    } else {
      toast.success("Review completata");
      setShowForm(false);
      setFile(null);
      loadReviews();
    }
    setSubmitting(false);
  };

  const renderAnalysis = (analysis: any) => {
    if (!analysis) return null;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Bias / Direzione</span>
            </div>
            <p className="text-sm font-medium text-foreground">{analysis.bias}</p>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Qualità Setup</span>
            </div>
            <p className="text-sm font-medium text-foreground">{analysis.setup_quality}/10</p>
          </div>
        </div>

        <div className="card-premium p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Zone di interesse</span>
          </div>
          <ul className="space-y-1">
            {analysis.zones?.map((z: string, i: number) => (
              <li key={i} className="text-sm text-foreground">• {z}</li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Scenario Bullish</span>
            </div>
            <p className="text-sm text-foreground">{analysis.bullish_scenario}</p>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Scenario Bearish</span>
            </div>
            <p className="text-sm text-foreground">{analysis.bearish_scenario}</p>
          </div>
        </div>

        <div className="card-premium p-4 border-destructive/20">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Invalidazione</span>
          </div>
          <p className="text-sm text-foreground">{analysis.invalidation}</p>
        </div>

        {analysis.risk_notes && (
          <div className="card-premium p-4 border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Note di rischio</span>
            </div>
            <p className="text-sm text-foreground">{analysis.risk_notes}</p>
          </div>
        )}
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
            <Badge className={selectedReview.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
              {selectedReview.status === "completed" ? "Completata" : "In attesa"}
            </Badge>
          </div>

          {selectedReview.screenshot_url && (
            <div className="card-premium p-2 mb-6">
              <img src={selectedReview.screenshot_url} alt="Chart" className="rounded-lg w-full max-h-80 object-contain" />
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
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Invia richiesta
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
                    <Badge className={r.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                      {r.status === "completed" ? "Completata" : "In attesa"}
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
