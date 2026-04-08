import { supabase } from "@/integrations/supabase/client";
import { getValidFunctionAuthToken } from "@/lib/getValidFunctionAuthToken";

export interface NotifiableSignal {
  id?: string;
  asset: string;
  direction: string;
  order_type: string;
  signal_strength: number | null;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  signal_status?: string;
  is_published?: boolean | null;
  published_at?: string | null;
  created_at?: string | null;
}

export interface SignalNotificationResponse {
  success?: boolean;
  trigger_notifications?: boolean;
  trigger_reason?: string;
  duplicate_suppression_detected?: boolean;
  telegram?: {
    targeted?: number;
    sent?: number;
    failed?: number;
    skipped?: number;
  };
  email?: {
    targeted?: number;
    enqueued?: number;
    failed?: number;
    skipped?: number;
  };
}

interface InvokeSignalNotificationArgs {
  signal: NotifiableSignal;
  currentPublished: boolean;
  nextPublished: boolean;
  source: string;
}

interface InvokeStatusChangeNotificationArgs {
  signal: NotifiableSignal;
  oldStatus: string;
  newStatus: string;
  source: string;
}

function getTriggerReason(currentPublished: boolean, nextPublished: boolean) {
  if (!currentPublished && nextPublished) return "signal transitioned from unpublished to published";
  if (currentPublished && !nextPublished) return "signal withdrawn";
  if (currentPublished && nextPublished) return "signal already published";
  return "signal remained unpublished";
}

export function formatSignalNotificationToast(result?: SignalNotificationResponse) {
  const telegramSent = result?.telegram?.sent ?? 0;
  const telegramFailed = result?.telegram?.failed ?? 0;
  const telegramSkipped = result?.telegram?.skipped ?? 0;
  const emailEnqueued = result?.email?.enqueued ?? 0;
  const emailFailed = result?.email?.failed ?? 0;
  const emailSkipped = result?.email?.skipped ?? 0;
  const duplicateSuppression = result?.duplicate_suppression_detected ? "sì" : "no";

  return `Telegram ${telegramSent} inviate, Email ${emailEnqueued} in coda, Telegram fail ${telegramFailed}, Email fail ${emailFailed}, Telegram skip ${telegramSkipped}, Email skip ${emailSkipped}, deduplica ${duplicateSuppression}`;
}

export async function invokeSignalNotification({
  signal,
  currentPublished,
  nextPublished,
  source,
}: InvokeSignalNotificationArgs) {
  const reason = getTriggerReason(currentPublished, nextPublished);
  const shouldTrigger = !currentPublished && nextPublished;

  console.log("[SignalNotifications] Publish action", {
    signal_id: signal.id,
    current_value: currentPublished,
    new_value: nextPublished,
    signal_status: signal.signal_status,
    trigger_notifications: shouldTrigger ? "yes" : "no",
    reason,
    source,
  });

  if (!shouldTrigger) {
    return {
      triggerNotifications: false,
      reason,
      result: {
        success: true,
        trigger_notifications: false,
        trigger_reason: reason,
        duplicate_suppression_detected: false,
        telegram: { targeted: 0, sent: 0, failed: 0, skipped: 0 },
        email: { targeted: 0, enqueued: 0, failed: 0, skipped: 0 },
      } satisfies SignalNotificationResponse,
      error: null,
    };
  }

  const sessionCheck = await getValidFunctionAuthToken();
  if (sessionCheck.error || !sessionCheck.token) {
    console.error("[SignalNotifications] Failed to validate auth token", {
      signal_id: signal.id,
      error: sessionCheck.error,
    });

    return {
      triggerNotifications: true,
      reason,
      result: null,
      error: sessionCheck.error || "Autenticazione non valida per le notifiche",
    };
  }

  console.log("[SignalNotifications] notify-signal invoked", {
    signal_id: signal.id,
    source,
    trigger_notifications: "yes",
  });

  const { data, error } = await supabase.functions.invoke("notify-signal", {
    body: {
      signal,
      meta: {
        source,
        current_published: currentPublished,
        new_published: nextPublished,
      },
    },
  });

  if (error) {
    console.error("[SignalNotifications] notify-signal error", {
      signal_id: signal.id,
      error,
    });

    return {
      triggerNotifications: true,
      reason,
      result: null,
      error: error.message || "Errore sconosciuto durante l'invio notifiche",
    };
  }

  console.log("[SignalNotifications] notify-signal result", {
    signal_id: signal.id,
    result: data,
    duplicate_suppression_detected: Boolean(data?.duplicate_suppression_detected),
  });

  return {
    triggerNotifications: true,
    reason,
    result: (data || null) as SignalNotificationResponse | null,
    error: null,
  };
}