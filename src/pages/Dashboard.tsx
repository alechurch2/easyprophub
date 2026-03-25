import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/config/brand";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, HeadphonesIcon, BarChart3, Megaphone, ArrowRight, Bot, GraduationCap, TrendingUp, Zap, Target, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface ReviewStats {
  totalPro: number;
  totalEasy: number;
  avgQuality: number | null;
  topAssets: { asset: string; count: number }[];
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ totalPro: 0, totalEasy: 0, avgQuality: null, topAssets: [] });

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

    // Fetch user's review stats
    supabase
      .from("ai_chart_reviews")
      .select("review_mode, asset, analysis, status")
      .eq("status", "completed")
      .then(({ data }) => {
        if (!data) return;
        const totalPro = data.filter((r) => r.review_mode === "pro").length;
        const totalEasy = data.filter((r) => r.review_mode === "easy").length;

        // Average quality from analysis JSON
        const qualities = data
          .map((r) => {
            const a = r.analysis as any;
            if (!a) return null;
            // Pro mode quality
            if (a.qualita_setup != null) return Number(a.qualita_setup);
            // Easy mode quality from setups
            if (a.setups?.length) {
              const q = a.setups.map((s: any) =>
                s.signal_quality === "alta" ? 9 : s.signal_quality === "media" ? 6 : 3
              );
              return q.reduce((sum: number, v: number) => sum + v, 0) / q.length;
            }
            return null;
          })
          .filter((v): v is number => v !== null);
        const avgQuality = qualities.length ? Math.round((qualities.reduce((a, b) => a + b, 0) / qualities.length) * 10) / 10 : null;

        // Top assets
        const assetCounts: Record<string, number> = {};
        data.forEach((r) => { assetCounts[r.asset] = (assetCounts[r.asset] || 0) + 1; });
        const topAssets = Object.entries(assetCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([asset, count]) => ({ asset, count }));

        setStats({ totalPro, totalEasy, avgQuality, topAssets });
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
    {
      title: "AI Assistant",
      description: "Chat AI per trading e supporto operativo",
      icon: Bot,
      path: "/ai-assistant",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Libreria Didattica",
      description: "Esempi selezionati di analisi AI",
      icon: GraduationCap,
      path: "/case-studies",
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      title: "Account Center",
      description: "Monitora i tuoi conti trading",
      icon: Wallet,
      path: "/account-center",
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

        {/* Review Stats */}
        {(stats.totalPro > 0 || stats.totalEasy > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Pro vs Easy */}
            <div className="card-premium p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Le tue Review</span>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalPro + stats.totalEasy}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">totali completate</p>
                </div>
                <div className="flex gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{stats.totalPro} Pro</Badge>
                  <Badge variant="secondary" className="text-xs">{stats.totalEasy} Easy</Badge>
                </div>
              </div>
            </div>

            {/* Average Quality */}
            <div className="card-premium p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-success" />
                </div>
                <span className="text-sm font-medium text-foreground">Qualità Media</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stats.avgQuality != null ? `${stats.avgQuality}/10` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">su tutte le review</p>
            </div>

            {/* Top Assets */}
            <div className="card-premium p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-info" />
                </div>
                <span className="text-sm font-medium text-foreground">Asset più analizzati</span>
              </div>
              {stats.topAssets.length > 0 ? (
                <div className="space-y-1.5">
                  {stats.topAssets.map((a) => (
                    <div key={a.asset} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{a.asset}</span>
                      <span className="text-xs text-muted-foreground">{a.count} review</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          </div>
        )}

        {/* Quick cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
