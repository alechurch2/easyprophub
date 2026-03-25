import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/config/brand";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      toast.error("Credenziali non valide. Riprova.");
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border flex-col justify-between p-12">
        <BrandLogo size="md" />
        <div>
          <h1 className="font-heading text-4xl font-bold text-foreground leading-tight">
            Formazione, analisi
            <br />
            e <span className="text-gradient-gold">supporto operativo</span>
            <br />
            in un unico portale.
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-md">
            Accedi all'area riservata EasyProp per strumenti esclusivi, AI Chart Review e percorsi formativi dedicati.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{BRAND.copyright}</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <BrandLogo size="md" />
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground">Bentornato</h2>
          <p className="text-muted-foreground mt-1 mb-8">Accedi alla tua area riservata</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@email.com"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Accedi
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Non hai un account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Richiedi accesso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
