import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BRAND } from "@/config/brand";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, ArrowRight, BarChart3, BookOpen, Bot } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
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
      {/* ── Left panel — immersive brand ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col">
        {/* Deep layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-background" />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-primary/[0.04] rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-gold-light/[0.02] rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Logo */}
          <BrandLogo size="md" />
          
          {/* Central hero */}
          <div className="flex-1 flex items-center">
            <div className="max-w-lg">
              <p className="text-label uppercase text-primary/70 font-semibold mb-4">Area riservata</p>
              <h1 className="font-heading text-display-lg font-bold text-foreground leading-[1.05]">
                Formazione,
                <br />
                analisi e
                <br />
                <span className="text-gradient-gold">supporto operativo.</span>
              </h1>
              <p className="mt-6 text-muted-foreground text-base leading-relaxed max-w-md">
                Accedi al portale EasyProp per strumenti esclusivi, AI Chart Review e percorsi formativi dedicati.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mt-8">
                {[
                  { icon: BarChart3, label: "AI Chart Review" },
                  { icon: BookOpen, label: "Formazione" },
                  { icon: Bot, label: "AI Assistant" },
                ].map((f) => (
                  <div key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/80 border border-border/50 text-xs text-muted-foreground">
                    <f.icon className="h-3 w-3 text-primary/60" />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-[11px] text-muted-foreground/40">{BRAND.copyright}</p>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-12">
            <BrandLogo size="md" />
          </div>

          <p className="text-label uppercase text-muted-foreground/50 font-semibold mb-2">Accesso</p>
          <h2 className="font-heading text-display-sm font-bold text-foreground">Bentornato</h2>
          <p className="text-muted-foreground mt-1 mb-8 text-sm">Inserisci le tue credenziali per continuare</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@email.com"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Accedi
                {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </form>

          <div className="divider-fade my-8" />

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-2"
            disabled={googleLoading}
            onClick={async () => {
              setGoogleLoading(true);
              try {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) {
                  toast.error("Errore durante l'accesso con Google.");
                  return;
                }
                if (result.redirected) return;
                navigate("/dashboard");
              } catch {
                toast.error("Errore durante l'accesso con Google.");
              } finally {
                setGoogleLoading(false);
              }
            }}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Accedi con Google
          </Button>


          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">oppure</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Non hai un account?{" "}
            <Link to="/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Richiedi accesso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
