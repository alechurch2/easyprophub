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

  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!TELEGRAM_API_KEY) {
    console.error('TELEGRAM_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Missing TELEGRAM_API_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Validate caller is admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })

  const token = authHeader.replace('Bearer ', '')
  const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token)
  if (claimsErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userId = claims.claims.sub as string
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Check admin role
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

  // Parse signal data
  let signal: {
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
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get all users with telegram enabled
  const { data: prefs, error: prefsErr } = await supabase
    .from('user_notification_preferences')
    .select('telegram_chat_id')
    .eq('telegram_enabled', true)
    .not('telegram_chat_id', 'is', null)

  if (prefsErr) {
    console.error('Failed to fetch notification preferences', prefsErr)
    return new Response(JSON.stringify({ error: 'Failed to fetch preferences' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

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

  let sent = 0
  let failed = 0

  for (const pref of prefs || []) {
    if (!pref.telegram_chat_id) continue

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
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })

      const data = await response.json()
      if (response.ok && data.ok) {
        sent++
      } else {
        console.error('Telegram send failed', {
          chat_id: pref.telegram_chat_id,
          status: response.status,
          error: data,
        })
        failed++
      }
    } catch (err) {
      console.error('Telegram send error', {
        chat_id: pref.telegram_chat_id,
        error: String(err),
      })
      failed++
    }
  }

  console.log('Signal notifications sent', { sent, failed, total: prefs?.length || 0 })

  return new Response(
    JSON.stringify({ success: true, sent, failed }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
