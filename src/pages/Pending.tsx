import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Clock, LogOut, ShieldX, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { BRAND } from "@/config/brand";

export default function Pending() {
  const { user, profile, isApproved, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (!user && !loading) return <Navigate to="/login" replace />;
  if (isApproved || isAdmin) return <Navigate to="/dashboard" replace />;

  const isSuspended = profile?.status === "suspended";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm text-center animate-fade-in">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="md" />
        </div>
        <div className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-6 ${isSuspended ? 'bg-destructive/8 ring-1 ring-destructive/15' : 'bg-warning/8 ring-1 ring-warning/15 animate-glow-pulse'}`}>
          {isSuspended ? (
            <ShieldX className="h-8 w-8 text-destructive" />
          ) : (
            <Clock className="h-8 w-8 text-warning" />
          )}
        </div>
        <p className="text-label uppercase text-muted-foreground/50 font-semibold mb-2">
          {isSuspended ? "Sospeso" : "In attesa"}
        </p>
        <h2 className="font-heading text-display-sm font-bold text-foreground">
          {isSuspended ? "Accesso sospeso" : "Account in approvazione"}
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {isSuspended
            ? "Il tuo accesso a EasyProp è stato sospeso. Contatta il supporto per maggiori informazioni."
            : "La tua richiesta è in fase di revisione da parte del team EasyProp. Riceverai una notifica non appena il tuo account sarà attivato."}
        </p>

        {!isSuspended && (
          <div className="panel-inset p-4 text-left space-y-3 mt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span className="text-[13px] text-foreground">Registrazione completata</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-warning shrink-0" />
              <span className="text-[13px] text-foreground">In attesa di approvazione</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground/30 shrink-0" />
              <span className="text-[13px] text-muted-foreground/50">Accesso alla piattaforma</span>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="mt-8"
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Esci
        </Button>
      </div>
    </div>
  );
}
