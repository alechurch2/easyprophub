import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/config/brand";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, HeadphonesIcon, BarChart3, Megaphone, ArrowRight, Bot, Radio, TrendingUp, Zap, Target, Wallet, Crown, Clock, Shield, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { trackEvent } from "@/lib/analytics";
import { SharedSignals } from "@/components/dashboard/SharedSignals";
import { SignalHistory } from "@/components/dashboard/SignalHistory";

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
  const { profile, isAdmin, licenseStatus, accessExpiresAt, daysRemaining, user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ totalPro: 0, totalEasy: 0, avgQuality: null, topAssets: [] });
  const [premiumUsage, setPremiumUsage] = useState<{ used: number; limit: number } | null>(null);

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

    if (user) {
    supabase
      .from("ai_chart_reviews")
      .select("review_mode, asset, analysis, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .then(({ data }) => {
        if (!data) return;
        const totalPro = data.filter((r) => r.review_mode === "pro").length;
        const totalEasy = data.filter((r) => r.review_mode === "easy").length;

        const qualities = data
          .map((r) => {
            const a = r.analysis as any;
            if (!a) return null;
            if (a.qualita_setup != null) return Number(a.qualita_setup);
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

        const assetCounts: Record<string, number> = {};
        data.forEach((r) => { assetCounts[r.asset] = (assetCounts[r.asset] || 0) + 1; });
        const topAssets = Object.entries(assetCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([asset, count]) => ({ asset, count }));

        setStats({ totalPro, totalEasy, avgQuality, topAssets });
      });
    }

    if (user) {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      supabase
        .from("premium_review_usage")
        .select("reviews_used, quota_limit")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .single()
        .then(({ data }) => {
          if (data) setPremiumUsage({ used: (data as any).reviews_used, limit: (data as any).quota_limit });
        });
    }
  }, [user]);

  const quickLinks = [
    { title: "Formazione", desc: "Percorsi e moduli dedicati", icon: BookOpen, path: "/training", accent: "primary" },
    { title: "Libreria Didattica", desc: "Esempi selezionati di analisi AI", icon: GraduationCap, path: "/case-studies", accent: "info" },
    { title: "AI Chart Review", desc: "Analisi strutturata dei grafici", icon: BarChart3, path: "/ai-review", accent: "success" },
    { title: "AI Assistant", desc: "Chat AI per supporto operativo", icon: Bot, path: "/ai-assistant", accent: "primary" },
    { title: "Account Center", desc: "Monitora i tuoi conti", icon: Wallet, path: "/account-center", accent: "success" },
    { title: "Supporto", desc: "Assistenza dedicata", icon: HeadphonesIcon, path: "/support", accent: "info" },
  ];

  const totalReviews = stats.totalPro + stats.totalEasy;

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* ═══ HERO SECTION ═══ */}
        <div className="relative overflow-hidden">
          {/* Background texture */}
          <div className="absolute inset-0 bg-gradient-to-br from-card via-background to-card" />
          <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-primary/[0.03] rounded-full blur-[100px] -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-primary/[0.02] rounded-full blur-[80px] translate-y-1/2" />
          
          <div className="relative px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
            <div className="max-w-5xl mx-auto">
              {/* Greeting + Status row */}
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-2">
                <div>
                  <p className="text-label uppercase text-muted-foreground/60 font-semibold mb-2">Dashboard</p>
                  <h1 className="font-heading text-display-sm sm:text-display font-bold text-foreground">
                    Bentornato, <span className="text-gradient-gold">{profile?.full_name?.split(" ")[0] || "Utente"}</span>
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm max-w-md">{BRAND.description}</p>
                </div>

                {/* Status badges — floating right on desktop */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/5 border border-success/15">
                    <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
                    <span className="text-[11px] font-medium text-success">
                      {isAdmin ? "Admin" : "Attivo"}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/60">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className={cn("text-[11px] font-medium",
                      licenseStatus === "lifetime" ? "text-primary" :
                      daysRemaining !== null && daysRemaining <= 7 ? "text-warning" : "text-foreground"
                    )}>
                      {licenseStatus === "lifetime" ? "♾️ Lifetime" :
                       daysRemaining !== null ? `${daysRemaining}g rimasti` : "Attiva"}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/60">
                    <Crown className="h-3 w-3 text-primary" />
                    <span className="text-[11px] font-medium text-foreground">
                      Premium: {premiumUsage ? `${Math.max(0, premiumUsage.limit - premiumUsage.used)}/${premiumUsage.limit}` : "3/3"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="divider-fade" />
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="px-6 sm:px-8 lg:px-10 py-6 lg:py-8 max-w-5xl mx-auto">
          
          {/* Onboarding */}
          <OnboardingChecklist />

          {/* ── Signals section ── */}
          <SharedSignals />
          <SignalHistory />

          {/* ── Stats row — asymmetric layout ── */}
          {totalReviews > 0 && (
            <div className="mb-10">
              <p className="text-label uppercase text-muted-foreground/50 font-semibold mb-4">Le tue statistiche</p>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Main stat — large */}
                <div className="md:col-span-5 card-elevated p-6 relative overflow-hidden accent-line-top">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-label-lg text-muted-foreground font-medium">Review completate</span>
                  </div>
                  <p className="font-heading text-display font-bold text-foreground tracking-tight">{totalReviews}</p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/8 text-primary font-medium">{stats.totalPro} Pro</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{stats.totalEasy} Easy</span>
                  </div>
                </div>

                {/* Quality */}
                <div className="md:col-span-3 card-premium p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-success" />
                    <span className="text-label-lg text-muted-foreground font-medium">Qualità media</span>
                  </div>
                  <div>
                    <p className="font-heading text-data text-foreground">
                      {stats.avgQuality != null ? `${stats.avgQuality}` : "—"}
                      <span className="text-muted-foreground text-sm font-normal">/10</span>
                    </p>
                  </div>
                </div>

                {/* Top assets */}
                <div className="md:col-span-4 card-premium p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-info" />
                    <span className="text-label-lg text-muted-foreground font-medium">Top asset</span>
                  </div>
                  {stats.topAssets.length > 0 ? (
                    <div className="space-y-2.5">
                      {stats.topAssets.map((a, i) => (
                        <div key={a.asset} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground/50 font-mono-data w-3">{i + 1}</span>
                            <span className="text-sm font-semibold text-foreground">{a.asset}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono-data">{a.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Quick links — editorial grid ── */}
          <div className="mb-10">
            <p className="text-label uppercase text-muted-foreground/50 font-semibold mb-4">Accesso rapido</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickLinks.map((item, i) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="card-premium p-4 group hover:border-primary/20 transition-all duration-300"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105",
                      item.accent === "primary" ? "bg-primary/8" :
                      item.accent === "success" ? "bg-success/8" :
                      "bg-info/8"
                    )}>
                      <item.icon className={cn(
                        "h-4 w-4",
                        item.accent === "primary" ? "text-primary" :
                        item.accent === "success" ? "text-success" :
                        "text-info"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-foreground text-sm leading-tight">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/60 transition-all duration-300 shrink-0 mt-0.5 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Announcements ── */}
          {announcements.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="h-4 w-4 text-primary" />
                <p className="text-label uppercase text-muted-foreground/50 font-semibold">Aggiornamenti</p>
              </div>
              <div className="space-y-2">
                {announcements.map((a) => (
                  <div key={a.id} className="card-premium p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm text-foreground">{a.title}</h3>
                      <span className="text-[10px] text-muted-foreground/50 font-mono-data">
                        {new Date(a.created_at).toLocaleDateString("it-IT")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
