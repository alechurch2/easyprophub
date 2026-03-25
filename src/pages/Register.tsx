import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/config/brand";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
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
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Richiesta ricevuta</h2>
          <p className="text-muted-foreground mt-3">
            Grazie per la tua richiesta. Riceverai una conferma via email e il tuo accesso sarà attivato dopo la verifica del team EasyProp.
          </p>
          <Button className="mt-6" onClick={() => navigate("/login")}>
            Torna al login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <BrandLogo size="md" />
        </div>

        <h2 className="font-heading text-2xl font-bold text-foreground text-center">Richiedi accesso</h2>
        <p className="text-muted-foreground mt-1 mb-8 text-center">
          Compila il form per richiedere l'accesso all'area riservata EasyProp
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="fullName" className="text-foreground">Nome completo</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mario Rossi" className="mt-1.5" required />
          </div>
          <div>
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.com" className="mt-1.5" required />
          </div>
          <div>
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 6 caratteri" className="mt-1.5" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Invia richiesta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Hai già un account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
