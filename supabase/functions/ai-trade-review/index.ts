import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRADE_REVIEW_MODEL = "google/gemini-2.5-flash";

const TRADE_REVIEW_PROMPT = `
Sei un analista di trading esperto. Devi valutare un trade reale completato confrontandolo con l'analisi o il segnale che lo ha generato.

DATI DEL TRADE:
{trade_data}

ANALISI/SEGNALE DI ORIGINE:
{source_data}

Produci una valutazione strutturata in JSON con questi campi:

{
  "coerenza_setup": "Quanto il trade era coerente con il setup originale (1-10 con spiegazione breve)",
  "qualita_ingresso": "Valutazione dell'entry rispetto ai livelli suggeriti",
  "qualita_gestione": "Come è stato gestito il trade (SL/TP rispettati, durata, uscita)",
  "timing": "Se il timing dell'ingresso era sensato rispetto al contesto",
  "risultato_vs_idea": "Il risultato conferma o smentisce l'idea iniziale? Perché?",
  "cosa_ha_funzionato": "Cosa ha funzionato bene in questo trade",
  "errori_principali": "Errori o aree di miglioramento identificate",
  "lezione_finale": "La lezione chiave da portare a casa",
  "voto_complessivo": 7,
  "verdict": "POSITIVO | NEUTRO | NEGATIVO"
}

Rispondi SOLO con il JSON valido, senza markdown o testo aggiuntivo.
Sii diretto, concreto, critico ma costruttivo. Non fare complimenti generici.
Se i dati sono insufficienti per una valutazione completa, dillo chiaramente nei campi rilevanti.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessione non valida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { trade_id, review_record_id } = await req.json();
    if (!trade_id || !review_record_id) {
      return new Response(JSON.stringify({ error: "Parametri mancanti" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load trade
    const { data: trade, error: tradeErr } = await supabase
      .from("account_trade_history")
      .select("*")
      .eq("id", trade_id)
      .eq("user_id", user.id)
      .single();

    if (tradeErr || !trade) {
      return new Response(JSON.stringify({ error: "Trade non trovato" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load source data
    let sourceData = "Nessuna fonte collegata — trade manuale";
    
    if (trade.source_review_id) {
      const { data: review } = await supabase
        .from("ai_chart_reviews")
        .select("asset, timeframe, request_type, analysis, review_mode, review_tier, created_at")
        .eq("id", trade.source_review_id)
        .single();
      if (review) {
        sourceData = JSON.stringify({
          tipo: "AI Chart Review",
          asset: review.asset,
          timeframe: review.timeframe,
          modalita: review.review_mode,
          tier: review.review_tier,
          data_analisi: review.created_at,
          analisi: review.analysis,
        });
      }
    } else if (trade.source_signal_id) {
      const { data: signal } = await supabase
        .from("shared_signals")
        .select("asset, direction, order_type, entry_price, stop_loss, take_profit, signal_strength, signal_quality, explanation, published_at")
        .eq("id", trade.source_signal_id)
        .single();
      if (signal) {
        sourceData = JSON.stringify({
          tipo: "Segnale condiviso admin",
          ...signal,
        });
      }
    }

    // Build trade data string
    const tradeData = JSON.stringify({
      asset: trade.asset,
      direzione: trade.direction,
      lotto: trade.lot_size,
      entry: trade.entry_price,
      exit: trade.exit_price,
      stop_loss: trade.stop_loss,
      take_profit: trade.take_profit,
      pnl: trade.profit_loss,
      apertura: trade.opened_at,
      chiusura: trade.closed_at,
      durata_minuti: trade.duration_minutes,
      status: trade.status,
    });

    const prompt = TRADE_REVIEW_PROMPT
      .replace("{trade_data}", tradeData)
      .replace("{source_data}", sourceData);

    // Call AI
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      await supabase.from("trade_ai_reviews").update({ status: "failed" }).eq("id", review_record_id);
      return new Response(JSON.stringify({ error: "API key non configurata" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[TradeReview] Analyzing trade ${trade_id} for user ${user.id}`);

    const aiRes = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: TRADE_REVIEW_MODEL,
        messages: [
          { role: "system", content: "Sei un analista di trading professionale. Rispondi SOLO in JSON valido." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`[TradeReview] AI error: ${aiRes.status} ${errText}`);
      await supabase.from("trade_ai_reviews").update({ status: "failed" }).eq("id", review_record_id);
      return new Response(JSON.stringify({ error: "Errore AI" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    let analysis: any;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error(`[TradeReview] JSON parse error: ${rawContent.substring(0, 200)}`);
      await supabase.from("trade_ai_reviews").update({ status: "failed" }).eq("id", review_record_id);
      return new Response(JSON.stringify({ error: "Risposta AI non valida" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update review record
    await supabase.from("trade_ai_reviews").update({
      analysis,
      status: "completed",
      ai_model_used: TRADE_REVIEW_MODEL,
      updated_at: new Date().toISOString(),
    }).eq("id", review_record_id);

    // Log usage
    const tokensIn = aiData.usage?.prompt_tokens || 0;
    const tokensOut = aiData.usage?.completion_tokens || 0;
    await supabase.from("ai_usage_log").insert({
      user_id: user.id,
      function_type: "trade_review",
      model: TRADE_REVIEW_MODEL,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      estimated_cost: 0,
      metadata: { trade_id, source_type: trade.source_type },
    });

    console.log(`[TradeReview] Completed for trade ${trade_id}`);

    return new Response(JSON.stringify({ success: true, analysis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(`[TradeReview] Error: ${err}`);
    return new Response(JSON.stringify({ error: "Errore interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
