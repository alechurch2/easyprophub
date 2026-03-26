import { supabase } from "@/integrations/supabase/client";

interface TrackEventOptions {
  page?: string;
  section?: string;
  metadata?: Record<string, any>;
}

export async function trackEvent(eventName: string, options: TrackEventOptions = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("product_analytics_events" as any).insert({
      user_id: user.id,
      event_name: eventName,
      page: options.page || null,
      section: options.section || null,
      metadata: options.metadata || {},
    });
  } catch (e) {
    // Silent fail — analytics should never break the app
    console.warn("[analytics]", e);
  }
}
