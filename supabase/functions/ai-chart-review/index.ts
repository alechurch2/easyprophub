import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// 🔧 STRATEGIA PERSONALIZZATA — MODIFICA QUI
// Inserisci qui sotto il testo completo della tua strategia.
// Questo testo viene iniettato nel prompt di sistema dell'AI
// e guida TUTTA l'analisi. L'AI non può uscire da questo schema.
// ============================================================
const CUSTOM_STRATEGY = `
[INSERISCI QUI LA TUA STRATEGIA PERSONALIZZATA]

Esempio di contenuto:
- La mia strategia si basa su supply & demand zones con conferma tramite 
  order flow e struttura di mercato (BOS/CHoCH).
- Timeframe principali: H4 per il bias, H1 per la struttura, M15 per l'entry.
- Cerco sempre confluenza tra zone di liquidità e livelli istituzionali.
- Entry solo dopo displacement + FVG + ritracciamento nella zona.
- Risk management: massimo 1% per trade, RR minimo 1:2.
`;
// ============================================================

const SYSTEM_PROMPT = `Sei un analista tecnico esperto. Il tuo compito è analizzare screenshot di grafici di trading seguendo ESCLUSIVAMENTE la strategia definita di seguito. Non dare opinioni libere, non inventare, non uscire dallo schema.

STRATEGIA DI RIFERIMENTO:
${CUSTOM_STRATEGY}

REGOLE FERREE:
1. Analizza SOLO ciò che vedi nell'immagine.
2. Se l'immagine non è leggibile o non mostra un grafico valido, dichiaralo nel campo "leggibilita_immagine".
3. Se mancano elementi chiave della strategia (es. timeframe sbagliato, nessuna zona visibile), segnalalo.
4. NON promettere risultati o profitti.
5. NON suggerire di eseguire operazioni.
6. Rispondi SOLO tramite la funzione "chart_analysis" con i campi strutturati richiesti.
7. Ogni campo deve essere compilato in modo conciso, professionale, e coerente con la strategia.
8. Se non puoi valutare un campo, scrivi "Non valutabile dall'immagine fornita".

CONTESTO AGGIUNTIVO: ti verranno forniti asset, timeframe e tipo di richiesta dell'utente. Usa questi metadati per contestualizzare la tua analisi.`;

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "chart_analysis",
    description:
      "Restituisce l'analisi strutturata di un grafico di trading secondo la strategia predefinita.",
    parameters: {
      type: "object",
      properties: {
        leggibilita_immagine: {
          type: "string",
          description:
            "Valutazione della qualità e leggibilità dell'immagine. Es: 'Chiara e leggibile', 'Parzialmente leggibile, manca il timeframe', 'Non leggibile'.",
        },
        contesto: {
          type: "string",
          description:
            "Contesto di mercato visibile dal grafico: trend generale, fase di mercato (accumulo, distribuzione, espansione, ritracciamento).",
        },
        bias: {
          type: "string",
          description:
            "Direzione probabile del prezzo secondo la strategia. Es: 'Rialzista', 'Ribassista', 'Neutro/Incerto'.",
        },
        struttura: {
          type: "string",
          description:
            "Analisi della struttura di mercato visibile: BOS, CHoCH, higher highs/lows, lower highs/lows, range.",
        },
        liquidita: {
          type: "string",
          description:
            "Zone di liquidità visibili: pool di liquidità sopra/sotto, stop hunt recenti, equal highs/lows.",
        },
        zona_interessante: {
          type: "string",
          description:
            "Zona o livello di prezzo più interessante per un potenziale setup secondo la strategia.",
        },
        conferma_richiesta: {
          type: "string",
          description:
            "Elementi di conferma necessari prima di considerare un'operazione (displacement, FVG, volume, candlestick pattern).",
        },
        invalidazione: {
          type: "string",
          description:
            "Livello o condizione che invaliderebbe lo scenario proposto.",
        },
        scenario_bullish: {
          type: "string",
          description:
            "Descrizione dello scenario rialzista: trigger, target, condizioni.",
        },
        scenario_bearish: {
          type: "string",
          description:
            "Descrizione dello scenario ribassista: trigger, target, condizioni.",
        },
        qualita_setup: {
          type: "integer",
          description:
            "Valutazione della qualità del setup da 1 a 10 secondo la strategia. 1 = nessun setup, 10 = setup ideale.",
        },
        warning: {
          type: "string",
          description:
            "Avvertenze e note di rischio: eventi macro imminenti, bassa liquidità, orario sfavorevole, condizioni anomale.",
        },
        conclusione: {
          type: "string",
          description:
            "Sintesi finale in 2-3 frasi. Deve essere coerente con tutti i campi precedenti. Non deve contenere raccomandazioni operative.",
        },
      },
      required: [
        "leggibilita_immagine",
        "contesto",
        "bias",
        "struttura",
        "liquidita",
        "zona_interessante",
        "conferma_richiesta",
        "invalidazione",
        "scenario_bullish",
        "scenario_bearish",
        "qualita_setup",
        "warning",
        "conclusione",
      ],
      additionalProperties: false,
    },
  },
};

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token non valido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { asset, timeframe, request_type, screenshot_url } = await req.json();

    if (!asset || !timeframe || !request_type) {
      return new Response(
        JSON.stringify({ error: "Parametri mancanti: asset, timeframe, request_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create pending review
    const { data: review, error: insertError } = await supabase
      .from("ai_chart_reviews")
      .insert({
        user_id: user.id,
        asset,
        timeframe,
        request_type,
        screenshot_url,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Errore nel salvataggio della richiesta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user prompt
    const userContent: any[] = [
      {
        type: "text",
        text: `Analizza questo grafico secondo la strategia predefinita.

METADATI:
- Asset: ${asset}
- Timeframe: ${timeframe}
- Tipo richiesta: ${request_type}

Usa ESCLUSIVAMENTE la funzione "chart_analysis" per restituire l'output strutturato.`,
      },
    ];

    if (screenshot_url) {
      userContent.push({
        type: "image_url",
        image_url: { url: screenshot_url },
      });
    }

    // Call AI with tool calling for structured output
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          tools: [ANALYSIS_TOOL],
          tool_choice: {
            type: "function",
            function: { name: "chart_analysis" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      // Update review as failed
      await supabase
        .from("ai_chart_reviews")
        .update({ status: "failed" })
        .eq("id", review.id);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite richieste AI raggiunto. Riprova tra qualche minuto." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti AI esauriti. Contatta l'amministratore." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Errore nella generazione dell'analisi AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();

    // Extract structured output from tool call
    let analysis: Record<string, any> | null = null;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    if (!analysis) {
      await supabase
        .from("ai_chart_reviews")
        .update({ status: "failed" })
        .eq("id", review.id);

      return new Response(
        JSON.stringify({ error: "L'AI non ha restituito un output strutturato valido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    const requiredFields = [
      "leggibilita_immagine", "contesto", "bias", "struttura", "liquidita",
      "zona_interessante", "conferma_richiesta", "invalidazione",
      "scenario_bullish", "scenario_bearish", "qualita_setup", "warning", "conclusione",
    ];
    const missingFields = requiredFields.filter((f) => !(f in analysis!));
    if (missingFields.length > 0) {
      console.error("Missing fields:", missingFields);
      // Fill missing fields with fallback
      for (const f of missingFields) {
        analysis![f] = f === "qualita_setup" ? 0 : "Non valutabile";
      }
    }

    // Ensure qualita_setup is a number 1-10
    if (typeof analysis.qualita_setup !== "number") {
      analysis.qualita_setup = parseInt(analysis.qualita_setup) || 0;
    }
    analysis.qualita_setup = Math.max(0, Math.min(10, analysis.qualita_setup));

    // Update review with analysis
    const { error: updateError } = await supabase
      .from("ai_chart_reviews")
      .update({ analysis, status: "completed" })
      .eq("id", review.id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return new Response(
      JSON.stringify({
        id: review.id,
        analysis,
        status: "completed",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
