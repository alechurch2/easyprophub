import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import { useLicenseSettings } from "@/hooks/useLicenseSettings";
import {
  BookOpen,
  HeadphonesIcon,
  BarChart3,
  LayoutDashboard,
  Shield,
  LogOut,
  Menu,
  X,
  Bot,
  Radio,
  Wallet,
  Settings,
  ChevronRight,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  adminOnly?: boolean;
  requireKey?: keyof Pick<import("@/config/licensePresets").LicenseSettings, "account_center_enabled" | "ai_assistant_enabled">;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Formazione", icon: BookOpen, path: "/training" },
  { label: "Segnali", icon: Radio, path: "/signals" },
  { label: "AI Chart Review", icon: BarChart3, path: "/ai-review" },
  { label: "AI Assistant", icon: Bot, path: "/ai-assistant", requireKey: "ai_assistant_enabled" },
  { label: "Account Center", icon: Wallet, path: "/account-center", requireKey: "account_center_enabled" },
  { label: "Supporto", icon: HeadphonesIcon, path: "/support" },
  { label: "Admin", icon: Shield, path: "/admin", adminOnly: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const { settings: licenseSettings, loading: licenseLoading } = useLicenseSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const isItemPending = (item: NavItem): boolean => {
    if (isAdmin) return false;
    return licenseLoading && Boolean(item.requireKey);
  };

  const isItemLocked = (item: NavItem): boolean => {
    if (isAdmin) return false;
    if (!item.requireKey) return false;
    if (isItemPending(item)) return false;
    return !licenseSettings[item.requireKey];
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex lg:w-[240px] lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
        <div className="h-[60px] flex items-center px-5">
          <Link to="/dashboard" className="transition-opacity hover:opacity-80">
            <BrandLogo size="sm" />
          </Link>
        </div>

        <div className="divider-fade mx-5" />

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-label uppercase text-muted-foreground/60 font-semibold px-3 mb-2 mt-1">Navigazione</p>
          {filteredItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const pending = isItemPending(item);
            const locked = !pending && isItemLocked(item);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group relative",
                  active
                    ? "bg-primary/10 text-primary"
                    : pending
                    ? "text-muted-foreground/50 pointer-events-none animate-pulse"
                    : locked
                    ? "text-muted-foreground/50 hover:text-muted-foreground/70 hover:bg-muted/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-primary" />
                )}
                <item.icon
                  className={cn(
                    "h-4 w-4 transition-colors shrink-0",
                    active
                      ? "text-primary"
                      : pending
                      ? "text-muted-foreground/30"
                      : locked
                      ? "text-muted-foreground/40"
                      : "text-muted-foreground/70 group-hover:text-foreground"
                  )}
                />
                <span className={cn((locked || pending) && "opacity-70")}>{item.label}</span>
                {locked && (
                  <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/8 border border-primary/10">
                    <Crown className="h-2.5 w-2.5 text-primary/70" />
                    <span className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">Pro</span>
                  </span>
                )}
                {active && !locked && !pending && <ChevronRight className="h-3 w-3 ml-auto text-primary/50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Link
            to="/account-settings"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-all duration-200 group"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[11px] font-bold text-primary ring-1 ring-primary/10">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate leading-tight">
                {profile?.full_name || "Utente"}
              </p>
              <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
                {isAdmin ? "Admin" : "Membro"}
              </p>
            </div>
            <Settings className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
          </Link>
          <ThemeToggle className="w-full" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 mt-1 rounded-lg text-[12px] text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 transition-all duration-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Esci
          </button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-background/90 glass-subtle border-b border-border/60 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-foreground p-1.5 -ml-1.5 rounded-lg active:bg-muted transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <BrandLogo size="sm" />
        <div className="w-8" />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[280px] h-full bg-card border-r border-border/60 flex flex-col animate-slide-in-left shadow-2xl">
            <div className="flex h-12 items-center justify-between px-4 border-b border-border/60">
              <BrandLogo size="sm" />
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {filteredItems.map((item) => {
                const active = location.pathname.startsWith(item.path);
                const pending = isItemPending(item);
                const locked = !pending && isItemLocked(item);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => !pending && setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                      active
                        ? "bg-primary/10 text-primary"
                        : pending
                        ? "text-muted-foreground/50 pointer-events-none animate-pulse"
                        : locked
                        ? "text-muted-foreground/50 hover:text-muted-foreground/70 hover:bg-muted/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-primary" />
                    )}
                    <item.icon className={cn(
                      "h-4.5 w-4.5",
                      active
                        ? "text-primary"
                        : pending
                        ? "text-muted-foreground/30"
                        : locked
                        ? "text-muted-foreground/40"
                        : ""
                    )} />
                    <span className={cn((locked || pending) && "opacity-70")}>{item.label}</span>
                    {locked && (
                      <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/8 border border-primary/10">
                        <Crown className="h-2.5 w-2.5 text-primary/70" />
                        <span className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">Pro</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-border/60 space-y-1">
              <Link
                to="/account-settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Impostazioni
              </Link>
              <ThemeToggle className="w-full justify-start px-3 py-2 text-sm" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Esci
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-[240px]">
        <div className="pt-12 lg:pt-0 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
