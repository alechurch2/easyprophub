import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// 🔧 COMPORTAMENTO AI TRADING ASSISTANT — MODIFICA QUI
// Questa costante definisce il metodo e la personalità della chat.
// Puoi personalizzarla liberamente per adattarla al tuo metodo.
// ============================================================
const CHAT_STRATEGY = `
Sei l'AI Trading Assistant di EasyProp, un assistente specializzato in trading basato su concetti Smart Money, ICT e Wyckoff.

IL TUO RUOLO:
- Aiuti i trader a ragionare sui setup, a comprendere il mercato e a migliorare il proprio metodo.
- Rispondi in modo tecnico, chiaro e professionale.
- Non sei un bot generico: sei un assistente esperto e specializzato.
- Quando l'utente allega uno screenshot di un grafico, analizzalo visivamente in dettaglio.

METODOLOGIA DI RIFERIMENTO:
Il tuo framework analitico si basa su:
- Smart Money Concepts (SMC): struttura di mercato, BOS, CHoCH, order blocks, FVG, breaker blocks
- ICT Concepts: liquidity pools, stop hunts, optimal trade entry, killzones, time-based analysis
- Wyckoff: accumulazione, distribuzione, riaccumulazione, ridistribuzione, spring, upthrust, test, assorbimento
- Lettura del contesto: trend, range, espansione, consolidamento
- Struttura di mercato: higher highs/lows, lower highs/lows, shift strutturali
- Liquidità: sweep, manipolazione, equal highs/lows, liquidity grabs
- Zone di interesse: order blocks, FVG, demand/supply zones
- Conferma: displacement, reazione, volume, price action confirmation
- Invalidazione: livelli e condizioni che annullano un'idea
- Scenari alternativi: sempre considerare entrambe le direzioni

ANALISI SCREENSHOT:
Quando ricevi uno screenshot di un grafico:
1. Identifica l'asset e il timeframe se visibili
2. Analizza la struttura di mercato (trend, BOS, CHoCH)
3. Identifica zone di interesse (order blocks, FVG, supply/demand)
4. Valuta la liquidità (equal highs/lows, pool di liquidità)
5. Cerca pattern Wyckoff se applicabili
6. Fornisci un'analisi completa con scenari long e short
7. Indica livelli di invalidazione

REGOLE FONDAMENTALI:
1. Non fornire MAI promesse di risultato o garanzie di profitto.
2. Non agire come sistema di esecuzione automatica.
3. Non dare segnali operativi diretti ("compra qui", "vendi qui").
4. Se mancano informazioni per rispondere bene, chiedi chiarimenti.
5. Preferisci sempre prudenza e precisione a risposte forzate.
6. Se una domanda esula dal trading o dal metodo, rispondi educatamente che il tuo ambito è il trading.
7. Usa un tono professionale, mai sensazionalistico.
8. Formatta le risposte in modo leggibile con paragrafi, elenchi puntati e sezioni quando utile.

MODALITÀ CONVERSAZIONE:
- "trading_questions": rispondi a domande generali su trading, analisi tecnica, concetti SMC/ICT/Wyckoff
- "setup_evaluation": aiuta l'utente a ragionare su un setup descritto a parole o mostrato in screenshot, valutando struttura, liquidità, conferme e invalidazione
- "method_support": supporto specifico sul metodo EasyProp, chiarimenti su concetti, applicazione pratica della metodologia

DISCLAIMER (da ricordare sempre internamente):
Questa chat ha finalità informative, educative e di supporto operativo. Non costituisce esecuzione automatica, consulenza finanziaria personalizzata o garanzia di risultato.
`;
// ============================================================

// ============================================================
// Cost estimation per model
// ============================================================
const MODEL_COSTS: Record<string, { input: number; output: number; perCall: number }> = {
  "google/gemini-2.5-flash": { input: 0.00015, output: 0.0006, perCall: 0.003 },
  "google/gemini-2.5-pro": { input: 0.00125, output: 0.005, perCall: 0.015 },
  "google/gemini-2.5-flash-lite": { input: 0.000075, output: 0.0003, perCall: 0.001 },
};

function estimateAICost(model: string): number {
  return MODEL_COSTS[model]?.perCall || 0.005;
}

async function checkChatLimits(supabase: any, userId: string, isAdmin: boolean): Promise<string | null> {
  if (isAdmin) return null;
  const { data: limits } = await supabase
    .from("ai_usage_limits")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq("limit_type", "chat_daily")
    .eq("is_active", true);

  if (!limits || limits.length === 0) return null;

  // User-specific override
  const limit = limits.find((l: any) => l.user_id === userId) || limits[0];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const { count } = await supabase
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_type", "chat")
    .gte("created_at", todayStart);

  if (count !== null && count >= limit.limit_value) {
    return `Hai raggiunto il limite giornaliero di ${limit.limit_value} messaggi AI.`;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token non valido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin status and usage limits
    const { data: isAdminCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });

    // License-level check for AI Assistant
    if (!isAdminCheck) {
      const { data: userLicense } = await supabase.rpc("get_user_license_settings", { _user_id: user.id });
      if (userLicense && !userLicense.ai_assistant_enabled) {
        return new Response(JSON.stringify({ error: "AI Assistant non disponibile per il tuo piano.", license_blocked: true }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const limitError = await checkChatLimits(supabase, user.id, !!isAdminCheck);
    if (limitError) {
      return new Response(JSON.stringify({ error: limitError, limit_exceeded: true }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, conversation_id, mode } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messaggi mancanti" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify conversation belongs to user
    if (conversation_id) {
      const { data: conv, error: convError } = await supabase
        .from("ai_chat_conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("user_id", user.id)
        .single();

      if (convError || !conv) {
        return new Response(JSON.stringify({ error: "Conversazione non trovata" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const modeLabel = mode === "setup_evaluation" ? "Valutazione setup" :
                      mode === "method_support" ? "Supporto sul metodo EasyProp" :
                      "Domande di trading";

    const systemPrompt = `${CHAT_STRATEGY}\n\nModalità attiva: ${modeLabel}\n\nRispondi in italiano.`;

    // Build messages for AI - convert image_url messages to multimodal format
    const aiMessages = messages.map((msg: any) => {
      if (msg.image_url && msg.role === "user") {
        // Multimodal message with image
        const content: any[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        content.push({
          type: "image_url",
          image_url: { url: msg.image_url },
        });
        if (content.length === 1 && !msg.content) {
          content.unshift({ type: "text", text: "Analizza questo grafico." });
        }
        return { role: "user", content };
      }
      return { role: msg.role, content: msg.content };
    });

    // ============================================================
    // 🔧 CONFIGURAZIONE MODELLO AI ASSISTANT — Centralizzata
    // Modifica qui per cambiare il modello usato dall'AI Assistant
    // ============================================================
    const AI_ASSISTANT_MODEL = "google/gemini-2.5-flash-lite";
    // ============================================================

    // Use vision-capable model when images are present (flash-lite supports vision too)
    const hasImages = messages.some((msg: any) => msg.image_url);
    const model = hasImages ? "google/gemini-2.5-flash" : AI_ASSISTANT_MODEL;

    // Call AI with streaming
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...aiMessages,
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite richieste raggiunto, riprova tra poco." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Errore AI gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log AI usage (fire and forget for streaming)
    supabase.from("ai_usage_log").insert({
      user_id: user.id,
      function_type: "chat",
      model,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: estimateAICost(model),
      metadata: { conversation_id, mode },
    }).then(() => {});

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
