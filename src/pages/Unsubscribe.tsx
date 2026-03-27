import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";
import { BRAND } from "@/config/brand";

type State = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const data = await res.json();
      if (data.valid === false && data.reason === "already_unsubscribed") setState("already");
      else if (data.valid) setState("valid");
      else setState("invalid");
    } catch {
      setState("invalid");
    }
  };

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) setState("error");
      else if (data?.success) setState("success");
      else if (data?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch { setState("error"); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full card-premium p-8 text-center space-y-6">
        <h1 className="font-heading text-xl font-bold text-foreground">{BRAND.name}</h1>

        {state === "loading" && (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Verifica in corso...</p>
          </div>
        )}

        {state === "valid" && (
          <div className="space-y-4">
            <MailX className="h-10 w-10 text-warning mx-auto" />
            <p className="text-sm text-foreground">Vuoi annullare l'iscrizione alle email di {BRAND.name}?</p>
            <Button onClick={handleUnsubscribe} disabled={processing} className="w-full">
              {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Elaborazione...</> : "Conferma disiscrizione"}
            </Button>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-3">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="text-sm text-foreground font-medium">Disiscrizione completata</p>
            <p className="text-xs text-muted-foreground">Non riceverai più email da {BRAND.name}.</p>
          </div>
        )}

        {state === "already" && (
          <div className="space-y-3">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-foreground">Sei già stato disiscritto.</p>
          </div>
        )}

        {state === "invalid" && (
          <div className="space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm text-foreground">Link non valido o scaduto.</p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm text-foreground">Si è verificato un errore. Riprova più tardi.</p>
          </div>
        )}
      </div>
    </div>
  );
}
