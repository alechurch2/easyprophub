import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { OVERLAY_PROMPT_ADDON } from "../_shared/overlay-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Sei Delta-Zero, un modulo di bias operativo ultra-rapido.

Il tuo compito è analizzare uno screenshot di un grafico di trading e restituire SOLO un bias operativo minimale.

REGOLE ASSOLUTE:
- NON fare una chart review completa
- NON parlare di struttura, liquidità, order blocks, FVG, ecc. a meno che non sia strettamente necessario per il bias
- NON dare spiegazioni lunghe
- NON fornire livelli di entry, SL, TP
- NON inventare pattern che non si vedono chiaramente
- Analizza SOLO ciò che è visibile nello screenshot
- Se il contesto non è chiaro, preferisci "no_trade" piuttosto che forzare una direzione
- Rispondi SOLO con il formato richiesto

PROCESSO DI ANALISI:
1. Guarda la price action recente: dove sta andando il prezzo? Sta facendo higher highs/lows o lower highs/lows?
2. Identifica la tendenza dominante visibile nel timeframe dello screenshot
3. Valuta se c'è momentum chiaro o se il prezzo è in consolidamento/range
4. Se vedi una direzione chiara, indica buy o sell. Se non è chiaro, indica no_trade
5. Sii onesto con il confidence score: non gonfiarlo

OUTPUT (usa ESATTAMENTE questo formato JSON):
{
  "bias": "buy" | "sell" | "no_trade",
  "confidence": 1-5,
  "reasoning": "una o due frasi brevi, concrete e utili",
  "warning": "solo se c'è un problema reale" | null,
  "current_price": numero decimale del prezzo corrente visibile sul grafico (l'ultimo prezzo/candela visibile). Se non riesci a leggerlo, usa null
}

CRITERI PER IL BIAS:
- "buy": il prezzo mostra chiaramente intenzione rialzista (higher lows, rottura resistenze, momentum up)
- "sell": il prezzo mostra chiaramente intenzione ribassista (lower highs, rottura supporti, momentum down)
- "no_trade": grafico ambiguo, laterale, in range stretto, o senza direzione chiara

CRITERI PER CONFIDENCE (1-5):
- 1: molto incerto, quasi impossibile determinare una direzione
- 2: leggermente inclinato verso una direzione ma debole
- 3: moderatamente chiaro, qualche segnale ma non forte
- 4: chiaro, la direzione è evidente
- 5: fortemente chiaro, momentum inequivocabile

CRITERI PER WARNING (null se non serve):
- grafico poco leggibile o risoluzione bassa
- timeframe troppo basso per una lettura affidabile del bias
- asset non riconosciuto
- grafico in range stretto senza contesto sufficiente
- prezzo vicino a zone di inversione importanti

CRITERI PER REASONING:
- Sii specifico: "prezzo sta facendo higher lows dopo rottura struttura" NON "il grafico sembra rialzista"
- Fai riferimento a ciò che si VEDE, non a ciò che "potrebbe" succedere
- Massimo 2 frasi
- Linguaggio diretto, senza gergo inutile

Rispondi SOLO con il JSON, nessun altro testo.`;

const OVERLAY_DELTA_ADDON = `

===== DELTA-ZERO OVERLAY MODE =====

Lo screenshot usa l'indicatore AI Overlay di EasyProp. In aggiunta alle regole base di Delta-Zero:

- Leggi il pannello contestuale come fonte primaria per il bias
- Usa i colori dell'overlay per confermare o smentire la direzione
- Se il pannello indica un bias chiaro e la price action lo conferma, aumenta il confidence
- Se pannello e price action sono in conflitto, riduci il confidence e spiega brevemente nel reasoning
- Continua a restituire SOLO il formato JSON minimale di Delta-Zero
- NON trasformare l'output in una review completa

${OVERLAY_PROMPT_ADDON}

===== FINE DELTA-ZERO OVERLAY =====
`;

const MODEL = "google/gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token non valido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { asset, timeframe, screenshot_url, uses_overlay } = await req.json();
    if (!asset || !timeframe || !screenshot_url) {
      return new Response(JSON.stringify({ error: "Campi mancanti: asset, timeframe, screenshot_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build system prompt based on overlay mode
    const systemPrompt = uses_overlay
      ? BASE_SYSTEM_PROMPT + OVERLAY_DELTA_ADDON
      : BASE_SYSTEM_PROMPT;

    const userPrompt = uses_overlay
      ? `Asset: ${asset}\nTimeframe: ${timeframe}\n\nLo screenshot usa l'indicatore AI Overlay. Analizza il grafico considerando pannello e annotazioni overlay, e restituisci il bias operativo.`
      : `Asset: ${asset}\nTimeframe: ${timeframe}\n\nAnalizza lo screenshot del grafico e restituisci il bias operativo.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: screenshot_url } },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite richieste raggiunto, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "Errore AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let parsed: { bias: string; confidence: number; reasoning: string; warning: string | null; current_price?: number | null };
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
      parsed = { bias: "no_trade", confidence: 1, reasoning: "Errore nell'analisi del grafico.", warning: "Risposta AI non interpretabile", current_price: null };
    }

    if (!["buy", "sell", "no_trade"].includes(parsed.bias)) parsed.bias = "no_trade";
    parsed.confidence = Math.max(1, Math.min(5, Math.round(parsed.confidence || 1)));
    const currentPrice = typeof parsed.current_price === "number" && parsed.current_price > 0 ? parsed.current_price : null;

    const { data: analysis, error: dbError } = await supabase
      .from("delta_zero_analyses")
      .insert({
        user_id: user.id,
        asset,
        timeframe,
        screenshot_url,
        bias: parsed.bias,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || null,
        warning: parsed.warning || null,
        ai_model_used: MODEL,
        uses_overlay: !!uses_overlay,
        current_price: currentPrice,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ error: "Errore salvataggio analisi" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    supabase.from("ai_usage_log").insert({
      user_id: user.id,
      function_type: "delta_zero",
      model: MODEL,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: 0.003,
      metadata: { asset, timeframe, uses_overlay: !!uses_overlay },
    }).then(() => {});

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Delta-Zero error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
