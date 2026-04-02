import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Clock, LogOut, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";

export default function Pending() {
  const { user, profile, isApproved, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (!user && !loading) return <Navigate to="/login" replace />;
  if (isApproved || isAdmin) return <Navigate to="/dashboard" replace />;

  const isSuspended = profile?.status === "suspended";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm text-center animate-scale-in">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="md" />
        </div>
        <div className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-6 ${isSuspended ? 'bg-destructive/10 ring-1 ring-destructive/15' : 'bg-primary/10 ring-1 ring-primary/15'}`}>

          {isSuspended ? (
            <ShieldX className="h-8 w-8 text-destructive" />
          ) : (
            <Clock className="h-8 w-8 text-primary" />
          )}
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">
          {isSuspended ? "Accesso sospeso" : "Accesso in fase di attivazione"}
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {isSuspended
            ? "Il tuo accesso a EasyProp è stato sospeso. Contatta il supporto per maggiori informazioni."
            : "La tua richiesta è in fase di revisione da parte del team EasyProp. Riceverai una notifica non appena il tuo account sarà attivato."}
        </p>
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
