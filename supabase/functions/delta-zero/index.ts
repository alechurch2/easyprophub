import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sei Delta-Zero, un modulo di bias operativo ultra-rapido.

Il tuo compito è analizzare uno screenshot di un grafico di trading e restituire SOLO un bias operativo minimale.

REGOLE ASSOLUTE:
- NON fare una chart review completa
- NON parlare di struttura, liquidità, order blocks, FVG, ecc.
- NON dare spiegazioni lunghe
- NON fornire livelli di entry, SL, TP
- Rispondi SOLO con il formato richiesto

OUTPUT (usa ESATTAMENTE questo formato JSON):
{
  "bias": "buy" | "sell" | "no_trade",
  "confidence": 1-5,
  "reasoning": "una frase breve e concreta",
  "warning": "solo se il grafico è ambiguo, poco leggibile o non adatto" | null
}

CRITERI PER IL BIAS:
- "buy": il prezzo mostra chiaramente intenzione rialzista
- "sell": il prezzo mostra chiaramente intenzione ribassista
- "no_trade": grafico ambiguo, laterale, o senza direzione chiara

CRITERI PER CONFIDENCE (1-5):
- 1: molto incerto
- 2: leggermente inclinato
- 3: moderatamente chiaro
- 4: chiaro
- 5: fortemente chiaro

CRITERI PER WARNING:
- grafico poco leggibile o risoluzione bassa
- timeframe troppo basso per una lettura affidabile
- asset non riconosciuto
- grafico in range stretto senza contesto
- Se non c'è warning, metti null

Rispondi SOLO con il JSON, nessun altro testo.`;

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

    const { asset, timeframe, screenshot_url } = await req.json();
    if (!asset || !timeframe || !screenshot_url) {
      return new Response(JSON.stringify({ error: "Campi mancanti: asset, timeframe, screenshot_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Asset: ${asset}\nTimeframe: ${timeframe}\n\nAnalizza lo screenshot del grafico e restituisci il bias operativo.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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

    // Parse JSON from AI response
    let parsed: { bias: string; confidence: number; reasoning: string; warning: string | null };
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
      parsed = { bias: "no_trade", confidence: 1, reasoning: "Errore nell'analisi del grafico.", warning: "Risposta AI non interpretabile" };
    }

    // Validate
    if (!["buy", "sell", "no_trade"].includes(parsed.bias)) parsed.bias = "no_trade";
    parsed.confidence = Math.max(1, Math.min(5, Math.round(parsed.confidence || 1)));

    // Save to DB
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
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ error: "Errore salvataggio analisi" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log usage
    supabase.from("ai_usage_log").insert({
      user_id: user.id,
      function_type: "delta_zero",
      model: MODEL,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: 0.003,
      metadata: { asset, timeframe },
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
