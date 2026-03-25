import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserStatus = "pending" | "approved" | "suspended" | null;
type UserRole = "admin" | "member" | null;
type LicenseStatus = "active" | "expired" | "suspended" | "lifetime" | "pending" | null;

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  license_status: LicenseStatus;
  access_started_at: string | null;
  access_expires_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileData | null;
  role: UserRole;
  isAdmin: boolean;
  isApproved: boolean;
  isLicenseValid: boolean;
  licenseStatus: LicenseStatus;
  accessExpiresAt: string | null;
  daysRemaining: number | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function computeLicenseValid(profile: ProfileData | null, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (!profile) return false;
  if (profile.status !== "approved") return false;
  const ls = profile.license_status;
  if (ls === "lifetime") return true;
  if (ls !== "active") return false;
  if (!profile.access_expires_at) return true; // no expiry = valid
  return new Date(profile.access_expires_at) > new Date();
}

function computeDaysRemaining(profile: ProfileData | null): number | null {
  if (!profile?.access_expires_at) return null;
  if (profile.license_status === "lifetime") return null;
  const diff = new Date(profile.access_expires_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [role, setRole] = useState<UserRole>(null);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, status, license_status, access_started_at, access_expires_at")
      .eq("user_id", userId)
      .single();

    if (profileData) {
      setProfile({
        full_name: profileData.full_name,
        avatar_url: profileData.avatar_url,
        status: profileData.status as UserStatus,
        license_status: (profileData as any).license_status as LicenseStatus,
        access_started_at: (profileData as any).access_started_at,
        access_expires_at: (profileData as any).access_expires_at,
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roleData && roleData.length > 0) {
      const isAdmin = roleData.some((r) => r.role === "admin");
      setRole(isAdmin ? "admin" : "member");
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile,
        role,
        isAdmin,
        isApproved: profile?.status === "approved",
        isLicenseValid: computeLicenseValid(profile, isAdmin),
        licenseStatus: profile?.license_status ?? null,
        accessExpiresAt: profile?.access_expires_at ?? null,
        daysRemaining: computeDaysRemaining(profile),
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
