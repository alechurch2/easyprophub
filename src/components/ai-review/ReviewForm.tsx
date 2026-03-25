import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ASSETS, TIMEFRAMES, REQUEST_TYPES } from "./types";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  parentReviewId?: string | null;
  defaultAsset?: string;
  defaultTimeframe?: string;
}

export function ReviewForm({ onClose, onSuccess, parentReviewId, defaultAsset, defaultTimeframe }: Props) {
  const { user } = useAuth();
  const [asset, setAsset] = useState(defaultAsset || ASSETS[0]);
  const [timeframe, setTimeframe] = useState(defaultTimeframe || TIMEFRAMES[4]);
  const [requestType, setRequestType] = useState(REQUEST_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [userNote, setUserNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
            user_note: userNote.trim() || null,
            parent_review_id: parentReviewId || null,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) { toast.error(result.error || "Errore nell'analisi AI"); setSubmitting(false); return; }

      toast.success(parentReviewId ? "Riesame completato!" : "Review completata!");
      onClose();
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Errore di connessione");
    }
    setSubmitting(false);
  };

  return (
    <div className="card-premium p-6 mb-8 animate-fade-in">
      <h2 className="font-heading font-semibold text-foreground mb-4">
        {parentReviewId ? "Riesamina con più contesto" : "Richiedi una review"}
      </h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <Label className="text-foreground">Tipo di richiesta</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{REQUEST_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-foreground">Screenshot del grafico</Label>
          <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1.5" />
        </div>
        <div>
          <Label className="text-foreground">Nota personale <span className="text-muted-foreground font-normal">(facoltativa)</span></Label>
          <Textarea
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder="Questa era la mia idea sul setup..."
            className="mt-1.5"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Analisi in corso...</>) : "Invia richiesta"}
          </Button>
        </div>
      </form>
    </div>
  );
}
