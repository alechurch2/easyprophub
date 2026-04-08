import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RiskPreferences {
  risk_reference_type: "manual_account_size" | "linked_account";
  manual_account_size: number;
  linked_account_id: string | null;
  default_risk_percent: number;
}

const DEFAULTS: RiskPreferences = {
  risk_reference_type: "manual_account_size",
  manual_account_size: 100000,
  linked_account_id: null,
  default_risk_percent: 0.002,
};

interface LinkedAccountInfo {
  id: string;
  account_name: string;
  equity: number | null;
  balance: number | null;
}

export interface RiskContext {
  /** The effective account size to use for risk calculations */
  effectiveAccountSize: number;
  /** The risk percent to use */
  riskPercent: number;
  /** Whether a valid reference is configured */
  isConfigured: boolean;
  /** Source label for UI */
  sourceLabel: string;
}

export function useRiskPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<RiskPreferences>(DEFAULTS);
  const [linkedAccount, setLinkedAccount] = useState<LinkedAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Load prefs and linked accounts in parallel
    const [prefsResult, accountsResult] = await Promise.all([
      supabase
        .from("user_risk_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("trading_accounts")
        .select("id, account_name, equity, balance, connection_status")
        .eq("user_id", user.id)
        .eq("connection_status", "connected"),
    ]);

    if (prefsResult.data) {
      setPrefs({
        risk_reference_type: prefsResult.data.risk_reference_type as any,
        manual_account_size: Number(prefsResult.data.manual_account_size) || 100000,
        linked_account_id: prefsResult.data.linked_account_id,
        default_risk_percent: Number(prefsResult.data.default_risk_percent) || 0.002,
      });
    }

    if (accountsResult.data && accountsResult.data.length > 0) {
      const acc = accountsResult.data[0] as any;
      setLinkedAccount({
        id: acc.id,
        account_name: acc.account_name,
        equity: acc.equity,
        balance: acc.balance,
      });
    } else {
      setLinkedAccount(null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = async (updates: Partial<RiskPreferences>) => {
    if (!user) return;
    const merged = { ...prefs, ...updates };
    setPrefs(merged);

    const { error } = await supabase
      .from("user_risk_preferences")
      .upsert({
        user_id: user.id,
        risk_reference_type: merged.risk_reference_type,
        manual_account_size: merged.manual_account_size,
        linked_account_id: merged.linked_account_id,
        default_risk_percent: merged.default_risk_percent,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" });

    if (error) console.error("Error saving risk preferences:", error);
    return error;
  };

  // Compute effective context
  const getRiskContext = useCallback((): RiskContext => {
    if (prefs.risk_reference_type === "linked_account" && linkedAccount) {
      const eq = linkedAccount.equity && linkedAccount.equity > 0
        ? linkedAccount.equity
        : linkedAccount.balance || 0;
      return {
        effectiveAccountSize: eq,
        riskPercent: prefs.default_risk_percent,
        isConfigured: eq > 0,
        sourceLabel: linkedAccount.account_name,
      };
    }

    return {
      effectiveAccountSize: prefs.manual_account_size,
      riskPercent: prefs.default_risk_percent,
      isConfigured: prefs.manual_account_size > 0,
      sourceLabel: `$${prefs.manual_account_size.toLocaleString()}`,
    };
  }, [prefs, linkedAccount]);

  return {
    prefs,
    linkedAccount,
    loading,
    save,
    reload: load,
    getRiskContext,
  };
}
