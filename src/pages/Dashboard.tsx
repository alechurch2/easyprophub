import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/config/brand";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, HeadphonesIcon, BarChart3, Megaphone, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setAnnouncements(data);
      });
  }, []);

  const cards = [
    {
      title: "Formazione",
      description: "Percorsi formativi e moduli dedicati",
      icon: BookOpen,
      path: "/training",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Supporto",
      description: "Assistenza dedicata e FAQ",
      icon: HeadphonesIcon,
      path: "/support",
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      title: "AI Chart Review",
      description: "Analisi strutturata dei tuoi grafici",
      icon: BarChart3,
      path: "/ai-review",
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
            Bentornato, {profile?.full_name?.split(" ")[0] || "Utente"}
          </h1>
          <p className="text-muted-foreground mt-1">{BRAND.description}</p>
        </div>

        {/* Status */}
        <div className="card-premium p-4 mb-6 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-sm text-foreground">Stato account:</span>
          <Badge variant="secondary" className="text-xs">
            {isAdmin ? "Amministratore" : "Attivo"}
          </Badge>
        </div>

        {/* Quick cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {cards.map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className="card-premium p-5 hover:border-primary/30 transition-all group"
            >
              <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center mb-4`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <h3 className="font-heading font-semibold text-foreground">{card.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Accedi <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="h-4 w-4 text-primary" />
              <h2 className="font-heading font-semibold text-foreground">Aggiornamenti</h2>
            </div>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="card-premium p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm text-foreground">{a.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
