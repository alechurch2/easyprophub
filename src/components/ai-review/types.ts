export interface Review {
  id: string;
  asset: string;
  timeframe: string;
  request_type: string;
  screenshot_url: string | null;
  analysis: any;
  status: string;
  created_at: string;
  user_id: string;
  user_note: string | null;
  parent_review_id: string | null;
  is_didactic_example: boolean;
  didactic_title: string | null;
  didactic_description: string | null;
  didactic_tags: string[] | null;
  didactic_visible: boolean;
  review_mode: string;
  account_size: number | null;
  custom_account_size: number | null;
  review_tier: string;
  ai_model_used: string | null;
}

export interface ReviewRating {
  id: string;
  review_id: string;
  user_id: string;
  is_useful: boolean;
  created_at: string;
}

export interface PremiumUsage {
  id: string;
  user_id: string;
  month_year: string;
  reviews_used: number;
  quota_limit: number;
}

export const ASSETS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "ETH/USD", "US30", "NAS100", "SPX500"];
export const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
export const REQUEST_TYPES = ["Analisi completa", "Setup check", "Bias confirmation", "Zone di interesse"];
