import { createClient } from 'npm:@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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
  }

  try {
    const body = await req.json()
    signal = body.signal
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
  })

  // ============================================
  // TELEGRAM NOTIFICATIONS
  // ============================================
  let telegramSent = 0
  let telegramFailed = 0
  let telegramSkipped = 0

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
      console.log('[notify-signal] Telegram recipients found:', telegramPrefs?.length || 0)

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

  // Get users with email signals enabled
  const { data: emailPrefs, error: emailPrefsErr } = await supabase
    .from('user_notification_preferences')
    .select('user_id, email_signals_enabled')
    .eq('email_signals_enabled', true)

  if (emailPrefsErr) {
    console.error('[notify-signal] Failed to fetch email preferences:', emailPrefsErr)
  } else {
    console.log('[notify-signal] Email-enabled users found:', emailPrefs?.length || 0)

    for (const pref of emailPrefs || []) {
      // Get user email
      const { data: userEmail } = await supabase.rpc('get_user_email_for_notification', {
        _user_id: pref.user_id,
      })

      if (!userEmail) {
        console.log('[notify-signal] No email for user:', pref.user_id)
        emailSkipped++
        continue
      }

      // Check user is approved
      const { data: userStatus } = await supabase.rpc('get_user_status', {
        _user_id: pref.user_id,
      })

      if (userStatus !== 'approved') {
        console.log('[notify-signal] User not approved, skipping email:', pref.user_id, 'status:', userStatus)
        emailSkipped++
        continue
      }

      try {
        const dirLabel = signal.direction.toLowerCase().includes('buy') ? '🟢 BUY' : '🔴 SELL'
        
        // Enqueue email via pgmq
        const emailPayload = {
          to: userEmail,
          subject: `Nuovo Segnale: ${signal.asset} ${signal.direction}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a2e; margin-bottom: 16px;">📊 Nuovo Segnale EasyProp</h2>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 4px 0;"><strong>Asset:</strong> ${signal.asset}</p>
                <p style="margin: 4px 0;"><strong>Direzione:</strong> ${dirLabel}</p>
                <p style="margin: 4px 0;"><strong>Tipo:</strong> ${signal.order_type}</p>
                <p style="margin: 4px 0;"><strong>Forza:</strong> ${signal.signal_strength}/5</p>
              </div>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 4px 0;"><strong>🎯 Entry:</strong> ${signal.entry_price}</p>
                <p style="margin: 4px 0;"><strong>🛑 Stop Loss:</strong> ${signal.stop_loss}</p>
                <p style="margin: 4px 0;"><strong>✅ Take Profit:</strong> ${signal.take_profit}</p>
              </div>
              <a href="https://easyprophub.lovable.app/dashboard" 
                 style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Vai alla Dashboard
              </a>
            </div>
          `,
          idempotency_key: `signal-${signal.id || Date.now()}-${pref.user_id}`,
        }

        // Log the email attempt
        await supabase.from('email_send_log').insert({
          template_name: 'signal-notification',
          recipient_email: userEmail,
          status: 'pending',
          message_id: emailPayload.idempotency_key,
          metadata: { signal_asset: signal.asset, signal_direction: signal.direction },
        })

        // Enqueue to transactional_emails queue
        const { error: enqueueErr } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: emailPayload,
        })

        if (enqueueErr) {
          console.error('[notify-signal] Email enqueue failed for:', userEmail, enqueueErr)
          emailFailed++
          // Update log
          await supabase.from('email_send_log').insert({
            template_name: 'signal-notification',
            recipient_email: userEmail,
            status: 'failed',
            message_id: emailPayload.idempotency_key,
            error_message: enqueueErr.message,
          })
        } else {
          console.log('[notify-signal] Email enqueued for:', userEmail)
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
    telegram: { sent: telegramSent, failed: telegramFailed, skipped: telegramSkipped },
    email: { enqueued: emailSent, failed: emailFailed, skipped: emailSkipped },
  }

  console.log('[notify-signal] FINAL SUMMARY:', JSON.stringify(summary))

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
