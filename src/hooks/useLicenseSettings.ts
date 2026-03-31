import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LicenseSettings, DEFAULT_LICENSE } from "@/config/licensePresets";

export interface LicenseUsage {
  standardReviewsUsed: number;
  premiumReviewsUsed: number;
  standardReviewsRemaining: number;
  premiumReviewsRemaining: number;
}

export function useLicenseSettings() {
  const { user, isAdmin } = useAuth();
  const [settings, setSettings] = useState<LicenseSettings>(DEFAULT_LICENSE);
  const [usage, setUsage] = useState<LicenseUsage>({
    standardReviewsUsed: 0,
    premiumReviewsUsed: 0,
    standardReviewsRemaining: 999,
    premiumReviewsRemaining: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }

    // Admin bypasses all limits
    if (isAdmin) {
      setSettings({
        ...DEFAULT_LICENSE,
        license_level: "live",
        training_access_level: "full",
        ai_assistant_enabled: true,
        chart_review_monthly_limit: 9999,
        premium_review_monthly_limit: 9999,
        account_center_enabled: true,
        trade_execution_enabled: true,
      });
      setUsage({ standardReviewsUsed: 0, premiumReviewsUsed: 0, standardReviewsRemaining: 9999, premiumReviewsRemaining: 9999 });
      setLoading(false);
      return;
    }

    // Fetch license settings
    const { data: licenseData } = await supabase
      .from("user_license_settings" as any)
      .select("*")
      .eq("user_id", user.id)
      .single();

    const ls: LicenseSettings = licenseData ? {
      license_level: (licenseData as any).license_level || "free",
      training_access_level: (licenseData as any).training_access_level || "partial",
      ai_assistant_enabled: (licenseData as any).ai_assistant_enabled ?? true,
      chart_review_monthly_limit: (licenseData as any).chart_review_monthly_limit ?? 5,
      premium_review_monthly_limit: (licenseData as any).premium_review_monthly_limit ?? 0,
      account_center_enabled: (licenseData as any).account_center_enabled ?? false,
      trade_execution_enabled: (licenseData as any).trade_execution_enabled ?? false,
    } : DEFAULT_LICENSE;

    setSettings(ls);

    // Fetch monthly usage
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [stdRes, premRes] = await Promise.all([
      supabase.from("standard_review_usage" as any).select("reviews_used").eq("user_id", user.id).eq("month_year", monthYear).single(),
      supabase.from("premium_review_usage" as any).select("reviews_used").eq("user_id", user.id).eq("month_year", monthYear).single(),
    ]);

    const stdUsed = (stdRes.data as any)?.reviews_used ?? 0;
    const premUsed = (premRes.data as any)?.reviews_used ?? 0;

    setUsage({
      standardReviewsUsed: stdUsed,
      premiumReviewsUsed: premUsed,
      standardReviewsRemaining: Math.max(0, ls.chart_review_monthly_limit - stdUsed),
      premiumReviewsRemaining: Math.max(0, ls.premium_review_monthly_limit - premUsed),
    });

    setLoading(false);
  };

  useEffect(() => { load(); }, [user, isAdmin]);

  return { settings, usage, loading, refresh: load };
}
