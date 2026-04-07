import { createClient } from 'npm:@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'
const MAX_RUNTIME_MS = 55_000
const MIN_REMAINING_MS = 5_000

Deno.serve(async () => {
  const startTime = Date.now()

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), { status: 500 })
  }

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')
  if (!TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing TELEGRAM_API_KEY' }), { status: 500 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let totalProcessed = 0

  // Read initial offset
  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single()

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 })
  }

  let currentOffset = state.update_offset

  while (true) {
    const elapsed = Date.now() - startTime
    const remainingMs = MAX_RUNTIME_MS - elapsed
    if (remainingMs < MIN_REMAINING_MS) break

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5)
    if (timeout < 1) break

    let response: Response
    try {
      response = await fetch(`${GATEWAY_URL}/getUpdates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offset: currentOffset,
          timeout,
          allowed_updates: ['message'],
        }),
      })
    } catch (err) {
      console.error('getUpdates fetch error', err)
      break
    }

    const data = await response.json()
    if (!response.ok) {
      console.error('getUpdates failed', data)
      break
    }

    const updates = data.result ?? []
    if (updates.length === 0) continue

    for (const update of updates) {
      const msg = update.message
      if (!msg?.text) continue

      const chatId = String(msg.chat.id)
      const text = msg.text.trim()

      // Handle /start CODE
      if (text.startsWith('/start ')) {
        const token = text.substring(7).trim()
        if (!token) continue

        await handleLinkToken(supabase, token, chatId, msg.from?.first_name || 'Utente')
      }
    }

    // Advance offset
    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1

    await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1)

    currentOffset = newOffset
    totalProcessed += updates.length
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed }))
})

async function handleLinkToken(
  supabase: any,
  token: string,
  chatId: string,
  firstName: string,
) {
  // Find valid, unused, non-expired token
  const { data: linkToken, error } = await supabase
    .from('telegram_link_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !linkToken) {
    console.log('Invalid or expired link token:', token)
    await sendTelegramMessage(
      chatId,
      '❌ Codice non valido o scaduto. Genera un nuovo codice dal portale EasyProp.',
    )
    return
  }

  // Mark token as used
  await supabase
    .from('telegram_link_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', linkToken.id)

  // Save chat_id to user notification preferences
  const { error: upsertErr } = await supabase
    .from('user_notification_preferences')
    .upsert(
      {
        user_id: linkToken.user_id,
        telegram_chat_id: chatId,
        telegram_enabled: true,
      },
      { onConflict: 'user_id' },
    )

  if (upsertErr) {
    console.error('Failed to save telegram_chat_id', upsertErr)
    await sendTelegramMessage(chatId, '❌ Errore nel collegamento. Riprova dal portale.')
    return
  }

  await sendTelegramMessage(
    chatId,
    `✅ Collegamento riuscito, ${firstName}!\n\nRiceverai qui le notifiche dei segnali di trading EasyProp. 🚀`,
  )

  console.log('Telegram linked for user', linkToken.user_id, 'chat_id', chatId)
}

async function sendTelegramMessage(chatId: string, text: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')!

  try {
    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
  } catch (err) {
    console.error('sendMessage error', err)
  }
}
