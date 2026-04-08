import { ReactNode } from "react";
import { Lock, Crown, Sparkles, Wallet, Bot, Layers, BarChart3 } from "lucide-react";
import { LicenseLevel, LICENSE_LABELS } from "@/config/licensePresets";
import { cn } from "@/lib/utils";

interface PremiumFeatureInfo {
  title: string;
  description: string;
  benefits: string[];
  icon: React.ElementType;
  requiredLevel: LicenseLevel;
}

const FEATURE_INFO: Record<string, PremiumFeatureInfo> = {
  account_center: {
    title: "Account Center",
    description: "Collega i tuoi conti MT4/MT5, monitora le performance in tempo reale e tieni traccia di ogni operazione con il trading journal integrato.",
    benefits: [
      "Collegamento diretto ai conti broker",
      "Metriche e statistiche in tempo reale",
      "Storico operazioni sincronizzato",
      "Trading journal con analisi AI",
      "Esecuzione ordini dal portale",
    ],
    icon: Wallet,
    requiredLevel: "live",
  },
  ai_assistant: {
    title: "AI Assistant",
    description: "Chat AI dedicata al trading: fai domande sulla metodologia, valuta setup e ricevi supporto operativo personalizzato.",
    benefits: [
      "Chat AI contestuale sulla metodologia",
      "Valutazione setup con immagini",
      "Supporto operativo in tempo reale",
      "Storico conversazioni salvato",
      "Modalità multiple (domande, valutazione, metodo)",
    ],
    icon: Bot,
    requiredLevel: "pro",
  },
  ai_overlay: {
    title: "AI Overlay Mode",
    description: "Attiva l'analisi avanzata basata sull'indicatore proprietario EasyProp per review più precise e contestualizzate.",
    benefits: [
      "Interpretazione automatica dell'indicatore",
      "Analisi bias e struttura avanzata",
      "Livelli chiave riconosciuti automaticamente",
      "Review più precise e operative",
    ],
    icon: Layers,
    requiredLevel: "pro",
  },
  premium_review: {
    title: "Premium Review",
    description: "Accedi alle review premium con modelli AI più potenti per analisi di livello superiore.",
    benefits: [
      "Modelli AI di ultima generazione",
      "Analisi più dettagliata e precisa",
      "Quota mensile dedicata",
      "Priorità nell'elaborazione",
    ],
    icon: BarChart3,
    requiredLevel: "pro",
  },
};

interface LicenseGateProps {
  allowed: boolean;
  requiredLevel?: LicenseLevel;
  featureKey?: keyof typeof FEATURE_INFO;
  message?: string;
  children?: ReactNode;
}

export default function LicenseGate({ allowed, requiredLevel, featureKey, message, children }: LicenseGateProps) {
  if (allowed) return <>{children}</>;

  const feature = featureKey ? FEATURE_INFO[featureKey] : null;
  const level = requiredLevel || feature?.requiredLevel || "pro";
  const FeatureIcon = feature?.icon || Lock;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6 animate-fade-in">
      <div className="max-w-lg w-full">
        {/* Premium card */}
        <div className="card-elevated relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-primary/[0.03] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />

          <div className="relative p-8 sm:p-10">
            {/* Icon + badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                <FeatureIcon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Crown className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-primary">
                    Piano {LICENSE_LABELS[level]}
                  </span>
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {feature?.title || "Funzione Premium"}
                </h2>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {message || feature?.description || `Questa funzione è disponibile con il piano ${LICENSE_LABELS[level]}.`}
            </p>

            {/* Benefits list */}
            {feature?.benefits && (
              <div className="space-y-2.5 mb-8">
                {feature.benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-md bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground/80">{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CTA area */}
            <div className="panel-inset p-4 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[11px] font-medium text-muted-foreground/80">
                  Disponibile con licenza {LICENSE_LABELS[level]}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/50">
                Contatta il supporto per aggiornare il tuo piano
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { FEATURE_INFO };
