import { createClient } from 'npm:@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'
const APP_URL = 'https://easyprophub.lovable.app/dashboard'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function buildSignalEmailIdempotencyKey(
  signalId: string | undefined,
  publishEventAt: string,
  userId: string
) {
  return `signal-${signalId || 'unknown'}-${publishEventAt}-${userId}`
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

  // Use getUser instead of getClaims for compatibility
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token)
  if (userError || !userData?.user) {
    console.error('[notify-signal] Auth failed:', userError?.message || 'No user')
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userId = userData.user.id
  console.log('[notify-signal] Authenticated user:', userId)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Check admin role
  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  })

  if (!isAdmin) {
    console.error('[notify-signal] User is not admin:', userId)
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('[notify-signal] Admin verified')

  // Parse signal data
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

  console.log('[notify-signal] Signal data:', {
    id: signal.id,
    asset: signal.asset,
    direction: signal.direction,
    order_type: signal.order_type,
    signal_strength: signal.signal_strength,
    signal_status: signal.signal_status,
    is_published: signal.is_published,
    published_at: signal.published_at,
    source: meta.source,
    current_value: meta.current_published,
    new_value: meta.new_published,
    trigger_notifications: 'yes',
  })

  // ============================================
  // TELEGRAM NOTIFICATIONS
  // ============================================
  let telegramSent = 0
  let telegramFailed = 0
  let telegramSkipped = 0
  let telegramTargeted = 0

  if (!LOVABLE_API_KEY) {
    console.error('[notify-signal] LOVABLE_API_KEY not configured - skipping Telegram')
  } else if (!TELEGRAM_API_KEY) {
    console.error('[notify-signal] TELEGRAM_API_KEY not configured - skipping Telegram')
  } else {
    // Get all users with telegram enabled
    const { data: telegramPrefs, error: telegramPrefsErr } = await supabase
      .from('user_notification_preferences')
      .select('user_id, telegram_chat_id, telegram_enabled')
      .eq('telegram_enabled', true)
      .not('telegram_chat_id', 'is', null)

    if (telegramPrefsErr) {
      console.error('[notify-signal] Failed to fetch Telegram preferences:', telegramPrefsErr)
    } else {
      telegramTargeted = telegramPrefs?.length || 0
      console.log('[notify-signal] Telegram recipients found:', telegramTargeted)

      const dirEmoji = signal.direction.toLowerCase().includes('buy') ? '🟢' : '🔴'
      const strengthStars = '⭐'.repeat(Math.min(signal.signal_strength || 0, 5))

      const message =
        `${dirEmoji} <b>Nuovo Segnale EasyProp</b>\n\n` +
        `📊 <b>Asset:</b> ${signal.asset}\n` +
        `📈 <b>Direzione:</b> ${signal.direction}\n` +
        `📋 <b>Tipo:</b> ${signal.order_type}\n` +
        `💪 <b>Forza:</b> ${strengthStars} (${signal.signal_strength}/5)\n\n` +
        `🎯 <b>Entry:</b> ${signal.entry_price}\n` +
        `🛑 <b>Stop Loss:</b> ${signal.stop_loss}\n` +
        `✅ <b>Take Profit:</b> ${signal.take_profit}\n\n` +
        `🔗 <a href="https://easyprophub.lovable.app/dashboard">Vai alla Dashboard</a>`

      for (const pref of telegramPrefs || []) {
        if (!pref.telegram_chat_id) {
          console.log('[notify-signal] Skipping user (no chat_id):', pref.user_id)
          telegramSkipped++
          continue
        }

        if (!pref.telegram_enabled) {
          console.log('[notify-signal] Skipping user (telegram disabled):', pref.user_id)
          telegramSkipped++
          continue
        }

        try {
          console.log('[notify-signal] Sending Telegram to chat_id:', pref.telegram_chat_id)
          const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': TELEGRAM_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: pref.telegram_chat_id,
              text: message,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
            }),
          })

          const data = await response.json()
          console.log('[notify-signal] Telegram provider response:', {
            signal_id: signal.id,
            chat_id: pref.telegram_chat_id,
            status: response.status,
            response: data,
          })
          if (response.ok && data.ok) {
            console.log('[notify-signal] Telegram sent OK to:', pref.telegram_chat_id)
            telegramSent++
          } else {
            console.error('[notify-signal] Telegram send failed:', {
              chat_id: pref.telegram_chat_id,
              status: response.status,
              error: JSON.stringify(data),
            })
            telegramFailed++
          }
        } catch (err) {
          console.error('[notify-signal] Telegram send error:', {
            chat_id: pref.telegram_chat_id,
            error: String(err),
          })
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
  const publishEventAt = signal.published_at || signal.created_at || new Date().toISOString()
  const sendTransactionalEmailUrl = `${supabaseUrl}/functions/v1/send-transactional-email`

  // Get users with email signals enabled
  const { data: emailPrefs, error: emailPrefsErr } = await supabase
    .from('user_notification_preferences')
    .select('user_id, email_signals_enabled')
    .eq('email_signals_enabled', true)

  if (emailPrefsErr) {
    console.error('[notify-signal] Failed to fetch email preferences:', emailPrefsErr)
  } else {
    emailTargeted = emailPrefs?.length || 0
    console.log('[notify-signal] signal email trigger started', {
      signal_id: signal.id,
      recipient_count: emailTargeted,
      template: 'signal-notification',
      publish_event_at: publishEventAt,
    })

    for (const pref of emailPrefs || []) {
      // Get user email
      const { data: userEmail, error: userEmailErr } = await supabase.rpc('get_user_email_for_notification', {
        _user_id: pref.user_id,
      })

      if (userEmailErr) {
        console.error('[notify-signal] Failed to fetch user email:', {
          signal_id: signal.id,
          user_id: pref.user_id,
          error: userEmailErr,
        })
        emailSkipped++
        continue
      }

      if (!userEmail) {
        console.log('[notify-signal] No email for user:', pref.user_id)
        emailSkipped++
        continue
      }

      // Check user is approved
      const { data: userStatus, error: userStatusErr } = await supabase.rpc('get_user_status', {
        _user_id: pref.user_id,
      })

      if (userStatusErr) {
        console.error('[notify-signal] Failed to fetch user status:', {
          signal_id: signal.id,
          user_id: pref.user_id,
          error: userStatusErr,
        })
        emailSkipped++
        continue
      }

      if (userStatus !== 'approved') {
        console.log('[notify-signal] User not approved, skipping email:', pref.user_id, 'status:', userStatus)
        emailSkipped++
        continue
      }

      try {
        const idempotencyKey = buildSignalEmailIdempotencyKey(
          signal.id,
          publishEventAt,
          pref.user_id
        )

        console.log('[notify-signal] Enqueueing signal email', {
          signal_id: signal.id,
          recipient: userEmail,
          template: 'signal-notification',
          idempotency_key: idempotencyKey,
        })

        const response = await fetch(sendTransactionalEmailUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseServiceKey,
          },
          body: JSON.stringify({
            templateName: 'signal-notification',
            recipientEmail: userEmail,
            idempotencyKey,
            templateData: {
              asset: signal.asset,
              direction: signal.direction,
              orderType: signal.order_type,
              signalStrength: signal.signal_strength || 0,
              entryPrice: signal.entry_price,
              stopLoss: signal.stop_loss,
              takeProfit: signal.take_profit,
              dashboardUrl: APP_URL,
            },
          }),
        })

        const rawResponse = await response.text()
        let providerResponse: unknown = rawResponse

        try {
          providerResponse = rawResponse ? JSON.parse(rawResponse) : null
        } catch {
          providerResponse = rawResponse
        }

        console.log('[notify-signal] Signal email provider response', {
          signal_id: signal.id,
          recipient: userEmail,
          status: response.status,
          provider_response: providerResponse,
        })

        if (!response.ok) {
          console.error('[notify-signal] Email enqueue failed for:', userEmail, providerResponse)
          emailFailed++
          continue
        } else {
          console.log('[notify-signal] Email enqueued for:', userEmail)
          duplicateSuppressionDetected =
            duplicateSuppressionDetected || Boolean((providerResponse as { duplicate_suppression_detected?: boolean })?.duplicate_suppression_detected)
          emailSent++
        }
      } catch (err) {
        console.error('[notify-signal] Email error for user:', pref.user_id, String(err))
        emailFailed++
      }
    }
  }

  const summary = {
    success: true,
    signal_id: signal.id || null,
    trigger_notifications: true,
    trigger_reason: 'signal publication',
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
