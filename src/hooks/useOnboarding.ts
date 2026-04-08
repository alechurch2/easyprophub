import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  path: string;
  status: "not_started" | "completed";
}

const ONBOARDING_STEPS: Omit<OnboardingStep, "status">[] = [
  { key: "profile_complete", title: "Completa il profilo", description: "Accedi e verifica il tuo account", path: "/dashboard" },
  { key: "first_training", title: "Esplora la Formazione", description: "Guarda la prima sezione consigliata", path: "/training" },
  { key: "first_review", title: "Prova una AI Chart Review", description: "Analizza il tuo primo grafico con l'AI", path: "/ai-review" },
  { key: "first_chat", title: "Usa l'AI Assistant", description: "Apri una conversazione con l'assistente", path: "/ai-assistant" },
  { key: "connect_account", title: "Collega un conto", description: "Collega il tuo conto trading (opzionale)", path: "/account-center" },
];

const DISMISS_KEY = "onboarding_dismissed";

export function useOnboarding() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissedState] = useState(false);

  // Persist dismiss: check DB first, fallback to localStorage
  const setDismissed = useCallback(async (val: boolean) => {
    setDismissedState(val);
    if (!val || !user) return;
    // Persist in localStorage immediately
    localStorage.setItem(`${DISMISS_KEY}_${user.id}`, "true");
    // Also persist in DB
    await supabase.from("user_onboarding_progress" as any).upsert({
      user_id: user.id,
      step_key: DISMISS_KEY,
      status: "dismissed",
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,step_key" });
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;

    // Check if dismissed (localStorage first for speed)
    if (localStorage.getItem(`${DISMISS_KEY}_${user.id}`) === "true") {
      setDismissedState(true);
      setLoading(false);
      return;
    }

    // Get saved progress
    const { data: progress } = await supabase
      .from("user_onboarding_progress" as any)
      .select("step_key, status")
      .eq("user_id", user.id);

    const progressList = (progress as any[] || []);

    // Check DB dismiss
    const dbDismissed = progressList.find((p: any) => p.step_key === DISMISS_KEY && p.status === "dismissed");
    if (dbDismissed) {
      localStorage.setItem(`${DISMISS_KEY}_${user.id}`, "true");
      setDismissedState(true);
      setLoading(false);
      return;
    }

    const completedKeys = new Set(
      progressList.filter((p: any) => p.status === "completed").map((p: any) => p.step_key)
    );

    // Auto-detect completed steps
    const [reviewCount, chatCount, accountCount, lessonCount] = await Promise.all([
      supabase.from("ai_chart_reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("ai_chat_conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("trading_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
    ]);

    completedKeys.add("profile_complete");
    if ((reviewCount.count || 0) > 0) completedKeys.add("first_review");
    if ((chatCount.count || 0) > 0) completedKeys.add("first_chat");
    if ((accountCount.count || 0) > 0) completedKeys.add("connect_account");
    if ((lessonCount.count || 0) > 0) completedKeys.add("first_training");

    // Persist auto-detected completions
    for (const key of completedKeys) {
      const existing = progressList.find((p: any) => p.step_key === key);
      if (!existing) {
        await supabase.from("user_onboarding_progress" as any).insert({
          user_id: user.id,
          step_key: key,
          status: "completed",
          completed_at: new Date().toISOString(),
        });
      }
    }

    const builtSteps = ONBOARDING_STEPS.map((s) => ({
      ...s,
      status: completedKeys.has(s.key) ? "completed" as const : "not_started" as const,
    }));

    setSteps(builtSteps);

    const allDone = builtSteps.every((s) => s.status === "completed");
    if (allDone) {
      const { count: completedEvent } = await supabase
        .from("product_analytics_events" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("event_name", "onboarding_completed");
      if ((completedEvent || 0) === 0) {
        trackEvent("onboarding_completed", { page: "dashboard", section: "onboarding" });
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextStep = steps.find((s) => s.status === "not_started");
  const isComplete = completedCount === totalCount && totalCount > 0;

  return { steps, loading, completedCount, totalCount, progress, nextStep, isComplete, dismissed, setDismissed, refresh: load };
}
