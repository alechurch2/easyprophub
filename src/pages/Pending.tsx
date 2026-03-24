import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Clock, LogOut, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Pending() {
  const { user, profile, isApproved, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (!user && !loading) return <Navigate to="/login" replace />;
  if (isApproved || isAdmin) return <Navigate to="/dashboard" replace />;

  const isSuspended = profile?.status === "suspended";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          {isSuspended ? (
            <BarChart3 className="h-8 w-8 text-destructive" />
          ) : (
            <Clock className="h-8 w-8 text-primary" />
          )}
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          {isSuspended ? "Account sospeso" : "In attesa di approvazione"}
        </h2>
        <p className="text-muted-foreground mt-3">
          {isSuspended
            ? "Il tuo account è stato sospeso. Contatta l'amministratore per maggiori informazioni."
            : "La tua richiesta di accesso è in fase di revisione. Riceverai una notifica una volta approvata."}
        </p>
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
