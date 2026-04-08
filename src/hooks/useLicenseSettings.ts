import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LicenseSettings, DEFAULT_LICENSE } from "@/config/licensePresets";

export interface LicenseUsage {
  standardReviewsUsed: number;
  premiumReviewsUsed: number;
  standardReviewsRemaining: number;
  premiumReviewsRemaining: number;
}

const EMPTY_USAGE: LicenseUsage = {
  standardReviewsUsed: 0,
  premiumReviewsUsed: 0,
  standardReviewsRemaining: 0,
  premiumReviewsRemaining: 0,
};

const ADMIN_SETTINGS: LicenseSettings = {
  ...DEFAULT_LICENSE,
  license_level: "live",
  training_access_level: "full",
  ai_assistant_enabled: true,
  chart_review_monthly_limit: 9999,
  premium_review_monthly_limit: 9999,
  account_center_enabled: true,
  trade_execution_enabled: true,
};

const ADMIN_USAGE: LicenseUsage = {
  standardReviewsUsed: 0,
  premiumReviewsUsed: 0,
  standardReviewsRemaining: 9999,
  premiumReviewsRemaining: 9999,
};

function normalizeLicenseSettings(licenseData: any): LicenseSettings {
  if (!licenseData) return DEFAULT_LICENSE;

  return {
    license_level: licenseData.license_level || "free",
    training_access_level: licenseData.training_access_level || "partial",
    ai_assistant_enabled: licenseData.ai_assistant_enabled ?? true,
    chart_review_monthly_limit: licenseData.chart_review_monthly_limit ?? 5,
    premium_review_monthly_limit: licenseData.premium_review_monthly_limit ?? 0,
    account_center_enabled: licenseData.account_center_enabled ?? false,
    trade_execution_enabled: licenseData.trade_execution_enabled ?? false,
  };
}

export function useLicenseSettings() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<LicenseSettings>(DEFAULT_LICENSE);
  const [usage, setUsage] = useState<LicenseUsage>(EMPTY_USAGE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setSettings(DEFAULT_LICENSE);
      setUsage(EMPTY_USAGE);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isAdmin) {
      setSettings(ADMIN_SETTINGS);
      setUsage(ADMIN_USAGE);
      setLoading(false);
      return;
    }

    try {
      const { data: licenseData } = await supabase
        .from("user_license_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      const normalizedSettings = normalizeLicenseSettings(licenseData);
      setSettings(normalizedSettings);

      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [stdRes, premRes] = await Promise.all([
        supabase
          .from("standard_review_usage" as any)
          .select("reviews_used")
          .eq("user_id", user.id)
          .eq("month_year", monthYear)
          .single(),
        supabase
          .from("premium_review_usage" as any)
          .select("reviews_used")
          .eq("user_id", user.id)
          .eq("month_year", monthYear)
          .single(),
      ]);

      const stdUsed = (stdRes.data as any)?.reviews_used ?? 0;
      const premUsed = (premRes.data as any)?.reviews_used ?? 0;

      setUsage({
        standardReviewsUsed: stdUsed,
        premiumReviewsUsed: premUsed,
        standardReviewsRemaining: Math.max(0, normalizedSettings.chart_review_monthly_limit - stdUsed),
        premiumReviewsRemaining: Math.max(0, normalizedSettings.premium_review_monthly_limit - premUsed),
      });
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAdmin, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { settings, usage, loading, refresh: load };
}
