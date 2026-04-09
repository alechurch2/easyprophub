export type LicenseLevel = "free" | "pro" | "live";

export interface LicenseSettings {
  license_level: LicenseLevel;
  training_access_level: "partial" | "full";
  ai_assistant_enabled: boolean;
  chart_review_monthly_limit: number;
  premium_review_monthly_limit: number;
  account_center_enabled: boolean;
  trade_execution_enabled: boolean;
  delta_zero_enabled: boolean;
}

export const LICENSE_PRESETS: Record<LicenseLevel, LicenseSettings> = {
  free: {
    license_level: "free",
    training_access_level: "partial",
    ai_assistant_enabled: true,
    chart_review_monthly_limit: 5,
    premium_review_monthly_limit: 1,
    account_center_enabled: false,
    trade_execution_enabled: false,
  },
  pro: {
    license_level: "pro",
    training_access_level: "full",
    ai_assistant_enabled: true,
    chart_review_monthly_limit: 100,
    premium_review_monthly_limit: 3,
    account_center_enabled: false,
    trade_execution_enabled: false,
  },
  live: {
    license_level: "live",
    training_access_level: "full",
    ai_assistant_enabled: true,
    chart_review_monthly_limit: 200,
    premium_review_monthly_limit: 10,
    account_center_enabled: true,
    trade_execution_enabled: true,
  },
};

export const LICENSE_LABELS: Record<LicenseLevel, string> = {
  free: "Free",
  pro: "Pro",
  live: "Live",
};

export const LICENSE_LEVEL_ORDER: LicenseLevel[] = ["free", "pro", "live"];

export function getLicenseLevelIndex(level: LicenseLevel): number {
  return LICENSE_LEVEL_ORDER.indexOf(level);
}

export function isLevelSufficient(userLevel: LicenseLevel, requiredLevel: LicenseLevel): boolean {
  return getLicenseLevelIndex(userLevel) >= getLicenseLevelIndex(requiredLevel);
}

export const DEFAULT_LICENSE: LicenseSettings = LICENSE_PRESETS.free;
