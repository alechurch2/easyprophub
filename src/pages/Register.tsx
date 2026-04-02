import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/config/brand";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !fullName.trim()) return;
    if (password.length < 6) {
      toast.error("La password deve avere almeno 6 caratteri.");
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "registration-received",
          recipientEmail: email.trim(),
          idempotencyKey: `reg-confirm-${email.trim()}-${Date.now()}`,
          templateData: { name: fullName.trim() },
        },
      }).catch(() => {});
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center animate-scale-in">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mb-6 ring-1 ring-success/20">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">Richiesta ricevuta</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Grazie per la tua richiesta. Riceverai una conferma via email e il tuo accesso sarà attivato dopo la verifica del team EasyProp.
          </p>
          <Button className="mt-8" onClick={() => navigate("/login")}>
            Torna al login
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[380px] animate-fade-in">
        <div className="flex justify-center mb-10">
          <BrandLogo size="md" />
        </div>

        <h2 className="font-heading text-2xl font-bold text-foreground text-center tracking-tight">Richiedi accesso</h2>
        <p className="text-muted-foreground mt-1.5 mb-8 text-center text-sm">
          Compila il form per richiedere l'accesso all'area riservata EasyProp
        </p>

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground text-sm font-medium">Nome completo</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mario Rossi" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground text-sm font-medium">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground text-sm font-medium">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 6 caratteri" required />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Invia richiesta
            {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Hai già un account?{" "}
          <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
