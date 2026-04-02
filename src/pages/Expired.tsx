import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Clock, LogOut, ShieldX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";

export default function Expired() {
  const { user, profile, isLicenseValid, isAdmin, signOut, loading, licenseStatus, daysRemaining } = useAuth();
  const navigate = useNavigate();

  if (!user && !loading) return <Navigate to="/login" replace />;
  if (isLicenseValid || isAdmin) return <Navigate to="/dashboard" replace />;
  if (profile?.status !== "approved") return <Navigate to="/pending" replace />;

  const isSuspended = licenseStatus === "suspended";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm text-center animate-scale-in">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="md" />
        </div>
        <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-inset"
          style={{
            background: isSuspended ? 'hsl(var(--destructive) / 0.08)' : 'hsl(38 92% 50% / 0.08)',
            ringColor: isSuspended ? 'hsl(var(--destructive) / 0.15)' : 'hsl(38 92% 50% / 0.15)',
          }}
        >
          {isSuspended ? (
            <ShieldX className="h-8 w-8 text-destructive" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-warning" />
          )}
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">
          {isSuspended ? "Accesso sospeso" : "Licenza scaduta"}
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {isSuspended
            ? "Il tuo accesso a EasyProp è stato sospeso. Contatta il supporto per maggiori informazioni."
            : "Il tuo periodo di accesso alla piattaforma EasyProp è scaduto. Contatta il supporto per rinnovare la tua licenza."}
        </p>
        <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Per riattivare il tuo accesso, contatta il supporto EasyProp o il tuo amministratore di riferimento.
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-6"
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
