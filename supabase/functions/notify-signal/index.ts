import { createClient } from 'npm:@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'
const APP_URL = 'https://easyprophub.lovable.app/dashboard'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Attivo',
  triggered: 'Aperto',
  won: 'Vinto ✅',
  lost: 'Perso ❌',
  expired: 'Scaduto',
  withdrawn: 'Ritirato',
}

function buildEmailIdempotencyKey(
  signalId: string | undefined,
  eventKey: string,
  userId: string
) {
  return `signal-${signalId || 'unknown'}-${eventKey}-${userId}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')

  console.log('[notify-signal] Function invoked')

  // Validate caller is admin via Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[notify-signal] No Authorization header')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token)
  if (userError || !userData?.user) {
    console.error('[notify-signal] Auth failed:', userError?.message || 'No user')
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userId = userData.user.id
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  })

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse request body
  let signal: {
    id?: string
    asset: string
    direction: string
    order_type: string
    signal_strength: number
    entry_price: number
    stop_loss: number
    take_profit: number
    signal_status?: string
    is_published?: boolean
    published_at?: string
    created_at?: string
  }
  let meta: {
    source?: string
    current_published?: boolean
    new_published?: boolean
    notification_type?: 'publication' | 'status_change'
    old_status?: string
    new_status?: string
  } = {}

  try {
    const body = await req.json()
    signal = body.signal
    meta = body.meta || {}
    if (!signal?.asset) throw new Error('Missing signal data')
  } catch (err) {
    console.error('[notify-signal] Invalid request body:', String(err))
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const notificationType = meta.notification_type || 'publication'
  const isStatusChange = notificationType === 'status_change'

  console.log('[notify-signal] Signal data:', {
    id: signal.id,
    asset: signal.asset,
    notification_type: notificationType,
    old_status: meta.old_status,
    new_status: meta.new_status,
    source: meta.source,
  })

  // ============================================
  // BUILD MESSAGES
  // ============================================
  let telegramMessage: string
  let emailTemplateName: string
  let emailTemplateData: Record<string, unknown>
  let emailEventKey: string

  if (isStatusChange && meta.old_status && meta.new_status) {
    const oldLabel = STATUS_LABELS[meta.old_status] || meta.old_status
    const newLabel = STATUS_LABELS[meta.new_status] || meta.new_status
    const dirEmoji = signal.direction.toLowerCase().includes('buy') ? '🟢' : '🔴'
    const statusEmoji = meta.new_status === 'won' ? '🏆' : meta.new_status === 'lost' ? '💔' : '📢'

    telegramMessage =
      `${statusEmoji} <b>Aggiornamento Segnale</b>\n\n` +
      `${dirEmoji} <b>Asset:</b> ${signal.asset}\n` +
      `📈 <b>Direzione:</b> ${signal.direction}\n` +
      `🔄 <b>Stato:</b> ${oldLabel} → <b>${newLabel}</b>\n\n` +
      `🎯 <b>Entry:</b> ${signal.entry_price}\n` +
      `🛑 <b>Stop Loss:</b> ${signal.stop_loss}\n` +
      `✅ <b>Take Profit:</b> ${signal.take_profit}\n\n` +
      `🔗 <a href="${APP_URL}">Vai alla Dashboard</a>`

    emailTemplateName = 'signal-status-update'
    emailTemplateData = {
      asset: signal.asset,
      direction: signal.direction,
      oldStatus: meta.old_status,
      newStatus: meta.new_status,
      entryPrice: signal.entry_price,
      stopLoss: signal.stop_loss,
      takeProfit: signal.take_profit,
    }
    emailEventKey = `status-${meta.old_status}-${meta.new_status}`
  } else {
    const dirEmoji = signal.direction.toLowerCase().includes('buy') ? '🟢' : '🔴'
    const strengthStars = '⭐'.repeat(Math.min(signal.signal_strength || 0, 5))

    telegramMessage =
      `${dirEmoji} <b>Nuovo Segnale EasyProp</b>\n\n` +
      `📊 <b>Asset:</b> ${signal.asset}\n` +
      `📈 <b>Direzione:</b> ${signal.direction}\n` +
      `📋 <b>Tipo:</b> ${signal.order_type}\n` +
      `💪 <b>Forza:</b> ${strengthStars} (${signal.signal_strength}/5)\n\n` +
      `🎯 <b>Entry:</b> ${signal.entry_price}\n` +
      `🛑 <b>Stop Loss:</b> ${signal.stop_loss}\n` +
      `✅ <b>Take Profit:</b> ${signal.take_profit}\n\n` +
      `🔗 <a href="${APP_URL}">Vai alla Dashboard</a>`

    emailTemplateName = 'signal-notification'
    emailTemplateData = {
      asset: signal.asset,
      direction: signal.direction,
      orderType: signal.order_type,
      signalStrength: signal.signal_strength || 0,
      entryPrice: signal.entry_price,
      stopLoss: signal.stop_loss,
      takeProfit: signal.take_profit,
      dashboardUrl: APP_URL,
    }
    emailEventKey = `pub-${signal.published_at || signal.created_at || new Date().toISOString()}`
  }

  // ============================================
  // TELEGRAM NOTIFICATIONS
  // ============================================
  let telegramSent = 0
  let telegramFailed = 0
  let telegramSkipped = 0
  let telegramTargeted = 0

  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    console.error('[notify-signal] Telegram keys missing - skipping')
  } else {
    const { data: telegramPrefs, error: telegramPrefsErr } = await supabase
      .from('user_notification_preferences')
      .select('user_id, telegram_chat_id, telegram_enabled')
      .eq('telegram_enabled', true)
      .not('telegram_chat_id', 'is', null)

    if (telegramPrefsErr) {
      console.error('[notify-signal] Failed to fetch Telegram preferences:', telegramPrefsErr)
    } else {
      telegramTargeted = telegramPrefs?.length || 0

      for (const pref of telegramPrefs || []) {
        if (!pref.telegram_chat_id || !pref.telegram_enabled) {
          telegramSkipped++
          continue
        }

        try {
          const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': TELEGRAM_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: pref.telegram_chat_id,
              text: telegramMessage,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
            }),
          })

          const data = await response.json()
          if (response.ok && data.ok) {
            telegramSent++
          } else {
            console.error('[notify-signal] Telegram send failed:', pref.telegram_chat_id, data)
            telegramFailed++
          }
        } catch (err) {
          console.error('[notify-signal] Telegram error:', pref.telegram_chat_id, String(err))
          telegramFailed++
        }
      }
    }
  }

  // ============================================
  // EMAIL NOTIFICATIONS
  // ============================================
  let emailSent = 0
  let emailFailed = 0
  let emailSkipped = 0
  let emailTargeted = 0
  let duplicateSuppressionDetected = false
  const sendTransactionalEmailUrl = `${supabaseUrl}/functions/v1/send-transactional-email`

  const { data: emailPrefs, error: emailPrefsErr } = await supabase
    .from('user_notification_preferences')
    .select('user_id, email_signals_enabled')
    .eq('email_signals_enabled', true)

  if (emailPrefsErr) {
    console.error('[notify-signal] Failed to fetch email preferences:', emailPrefsErr)
  } else {
    emailTargeted = emailPrefs?.length || 0

    for (const pref of emailPrefs || []) {
      const { data: userEmail } = await supabase.rpc('get_user_email_for_notification', {
        _user_id: pref.user_id,
      })

      if (!userEmail) { emailSkipped++; continue }

      const { data: userStatus } = await supabase.rpc('get_user_status', {
        _user_id: pref.user_id,
      })

      if (userStatus !== 'approved') { emailSkipped++; continue }

      try {
        const idempotencyKey = buildEmailIdempotencyKey(signal.id, emailEventKey, pref.user_id)

        const response = await fetch(sendTransactionalEmailUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseServiceKey,
          },
          body: JSON.stringify({
            templateName: emailTemplateName,
            recipientEmail: userEmail,
            idempotencyKey,
            templateData: emailTemplateData,
          }),
        })

        const rawResponse = await response.text()
        let providerResponse: unknown = rawResponse
        try { providerResponse = rawResponse ? JSON.parse(rawResponse) : null } catch { providerResponse = rawResponse }

        if (!response.ok) {
          console.error('[notify-signal] Email enqueue failed:', userEmail, providerResponse)
          emailFailed++
        } else {
          duplicateSuppressionDetected = duplicateSuppressionDetected ||
            Boolean((providerResponse as any)?.duplicate_suppression_detected)
          emailSent++
        }
      } catch (err) {
        console.error('[notify-signal] Email error:', pref.user_id, String(err))
        emailFailed++
      }
    }
  }

  const summary = {
    success: true,
    signal_id: signal.id || null,
    notification_type: notificationType,
    trigger_notifications: true,
    trigger_reason: isStatusChange
      ? `status change: ${meta.old_status} → ${meta.new_status}`
      : 'signal publication',
    duplicate_suppression_detected: duplicateSuppressionDetected,
    telegram: { targeted: telegramTargeted, sent: telegramSent, failed: telegramFailed, skipped: telegramSkipped },
    email: { targeted: emailTargeted, enqueued: emailSent, failed: emailFailed, skipped: emailSkipped },
  }

  console.log('[notify-signal] FINAL SUMMARY:', JSON.stringify(summary))

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
