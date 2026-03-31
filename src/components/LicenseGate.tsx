import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { LicenseLevel, LICENSE_LABELS } from "@/config/licensePresets";

interface LicenseGateProps {
  allowed: boolean;
  requiredLevel?: LicenseLevel;
  message?: string;
  children: ReactNode;
}

export default function LicenseGate({ allowed, requiredLevel, message, children }: LicenseGateProps) {
  if (allowed) return <>{children}</>;

  const defaultMsg = requiredLevel
    ? `Funzione disponibile dal piano ${LICENSE_LABELS[requiredLevel]}`
    : "Funzione non disponibile per il tuo piano attuale";

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 animate-fade-in">
      <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Accesso limitato</h2>
      <p className="text-sm text-muted-foreground max-w-md">{message || defaultMsg}</p>
    </div>
  );
}
