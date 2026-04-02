import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/config/brand";
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
  ChevronRight,
  Bot,
  GraduationCap,
  Wallet,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  { label: "Libreria Didattica", icon: GraduationCap, path: "/case-studies" },
  { label: "AI Chart Review", icon: BarChart3, path: "/ai-review" },
  { label: "AI Assistant", icon: Bot, path: "/ai-assistant", requireKey: "ai_assistant_enabled" },
  { label: "Account Center", icon: Wallet, path: "/account-center", requireKey: "account_center_enabled" },
  { label: "Supporto", icon: HeadphonesIcon, path: "/support" },
  { label: "Admin", icon: Shield, path: "/admin", adminOnly: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const { settings: licenseSettings } = useLicenseSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.requireKey && !isAdmin && !licenseSettings[item.requireKey]) return false;
    return true;
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/60 bg-card/80 glass-subtle">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-border/60">
          <Link to="/dashboard" className="transition-opacity hover:opacity-80">
            <BrandLogo size="sm" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {filteredItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group relative",
                  active
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                )}
                <item.icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border/60">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary ring-1 ring-primary/10">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || "Utente"}</p>
              <p className="text-[11px] text-muted-foreground">{isAdmin ? "Admin" : "Membro"}</p>
            </div>
            <Link to="/account-settings" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50" title="Impostazioni account">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground text-xs"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Esci
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card/90 glass-subtle border-b border-border/60 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-foreground p-1.5 -ml-1.5 rounded-lg active:bg-muted transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <BrandLogo size="sm" />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full bg-card border-r border-border/60 flex flex-col animate-slide-in-left shadow-2xl">
            <div className="flex h-14 items-center justify-between px-4 border-b border-border/60">
              <BrandLogo size="sm" />
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {filteredItems.map((item) => {
                const active = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative",
                      active
                        ? "bg-primary/8 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                    )}
                    <item.icon className={cn("h-5 w-5", active ? "text-primary" : "")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-border/60 space-y-1">
              <Link
                to="/account-settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Settings className="h-5 w-5" />
                Impostazioni account
              </Link>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground text-xs" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-[260px]">
        <div className="pt-14 lg:pt-0 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
