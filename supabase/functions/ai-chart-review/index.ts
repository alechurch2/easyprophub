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

Analizza esclusivamente lo screenshot del grafico seguendo questa metodologia di lettura del mercato, basata su concetti Smart Money, ICT e Wyckoff.

OBIETTIVO

Fornire una chart review tecnica, strutturata e coerente con:

- struttura del mercato

- liquidità

- manipolazione

- possibili fasi di accumulazione o distribuzione

- contesto operativo

Non inventare segnali casuali.

Non forzare una direzione se il grafico non è chiaro.

Non dare garanzie di risultato.

Non trasformare l'analisi in esecuzione automatica.

PRINCIPI DA SEGUIRE

L'analisi deve concentrarsi su:

- market structure

- liquidity pools

- sweep di liquidità

- manipolazione del prezzo

- possibili cambi di carattere del mercato

- zone premium e discount se leggibili

- aree di interesse coerenti con il contesto

- logica Wyckoff: accumulazione, distribuzione, riaccumulazione, ridistribuzione, spring, upthrust, fake breakout, assorbimento, manipolazione

- contesto generale del prezzo, non singola candela isolata

ORDINE OBBLIGATORIO DI ANALISI

1. LEGGIBILITÀ IMMAGINE

- Valuta per prima cosa se lo screenshot è abbastanza chiaro.

- Se il grafico è tagliato, troppo zoomato, poco leggibile, senza contesto sufficiente o con elementi grafici confusi, dichiaralo apertamente.

- Se la leggibilità è bassa, riduci la confidenza dell'analisi.

- Se il contesto è insufficiente, non forzare conclusioni.

2. CONTESTO GENERALE

- Identifica il contesto visibile: rialzista, ribassista o laterale.

- Valuta se il prezzo sta espandendo, consolidando o mostrando possibile transizione.

- Non inventare timeframe superiori non visibili: usa solo ciò che si vede nello screenshot e i metadati forniti.

3. STRUTTURA DI MERCATO

- Analizza massimi e minimi visibili.

- Valuta se la struttura suggerisce continuazione, consolidamento o potenziale inversione.

- Cerca eventuali segnali di shift o change of character solo se realmente plausibili dal grafico.

- Se la struttura non è chiara, dichiaralo.

4. LIQUIDITÀ

- Cerca liquidità sopra massimi evidenti, sotto minimi evidenti, equal highs, equal lows, swing highs e swing lows.

- Valuta se il prezzo sembra aver effettuato uno sweep di liquidità o una manipolazione prima di reagire.

- Se non c'è una presa di liquidità chiara, non inventarla.

- Distingui tra semplice rottura e possibile sweep/manipolazione.

5. MANIPOLAZIONE E LOGICA ICT / SMART MONEY

- Valuta se il movimento recente può rappresentare una manipolazione del prezzo per prendere liquidità prima di una possibile inversione o continuazione.

- Cerca segnali di falsa rottura, presa di liquidità, espansione impulsiva dopo lo sweep, rientro in area significativa.

- Se non ci sono conferme sufficienti, mantieni prudenza.

6. LETTURA WYCKOFF

- Valuta se il comportamento del prezzo può essere coerente con:

  - accumulazione

  - distribuzione

  - riaccumulazione

  - ridistribuzione

- Cerca eventuali segnali compatibili con:

  - spring

  - upthrust

  - test

  - fake breakout

  - assorbimento

  - compressione del prezzo

- Non assegnare una fase Wyckoff in modo forzato se il grafico non mostra abbastanza elementi.

7. ZONA INTERESSANTE

- Identifica una possibile area di interesse solo se coerente con struttura, liquidità e contesto.

- La zona interessante deve essere descritta in modo realistico e non casuale.

- Se non esiste una zona chiara, dichiararlo.

8. CONFERMA RICHIESTA

- Specifica cosa dovrebbe accadere per validare meglio il setup.

- Esempi:

  - reazione pulita in una zona di interesse

  - shift strutturale

  - mantenimento sopra o sotto un livello chiave

  - conferma dopo sweep di liquidità

  - rifiuto netto di una zona

- Se il grafico non è pronto, dillo chiaramente.

9. INVALIDAZIONE

- Indica quale comportamento del prezzo invaliderebbe l'idea principale.

- L'invalidazione deve essere coerente con struttura e contesto, non casuale.

10. SCENARI

- Fornisci sia scenario bullish sia scenario bearish, quando ha senso.

- Dai priorità allo scenario più coerente con il contesto visibile.

- Se uno dei due scenari è molto debole, dichiaralo.

CRITERI PER LA QUALITÀ DEL SETUP

Valuta la qualità del setup così:

- Alta: immagine leggibile, contesto chiaro, struttura coerente, liquidità evidente, manipolazione plausibile, zona interessante sensata, conferma ben definita

- Media: alcuni elementi presenti ma quadro non pienamente pulito

- Bassa: lettura incerta, contesto limitato, immagine debole, mancano elementi fondamentali

- Molto bassa: immagine o struttura troppo poco chiare per una review affidabile

REGOLE FONDAMENTALI

- Non inventare concetti non visibili sul grafico

- Non affermare con certezza assoluta qualcosa che è solo ipotesi

- Non dare segnali operativi secchi se il contesto non lo giustifica

- Non promettere risultati

- Se il grafico è ambiguo, dirlo chiaramente

- Se mancano dati, dirlo chiaramente

- Meglio una risposta prudente e accurata che una risposta forzata

STILE DELLA RISPOSTA

- Tono tecnico, chiaro, professionale

- Linguaggio comprensibile ma preciso

- Nessuna esagerazione

- Nessun sensazionalismo

- Analisi ordinata e coerente con la metodologia

INTERPRETAZIONE DEI CAMPI

Compila i campi richiesti in questo modo:

- leggibilità_immagine: valuta quanto il grafico sia leggibile e utile

- contesto: descrivi il contesto generale

- bias: indica il bias prevalente, ma solo se giustificato

- struttura: descrivi la struttura di mercato visibile

- liquidità: indica dove si trova la liquidità e se è stata presa

- zona_interessante: indica l'area di interesse se presente

- conferma_richiesta: spiega cosa serve per aumentare validità del setup

- invalidazione: spiega cosa invaliderebbe l'idea

- scenario_bullish: descrivi il possibile scenario rialzista

- scenario_bearish: descrivi il possibile scenario ribassista

- qualità_setup: alta, media, bassa o molto bassa

- warning: segnala dubbi, limiti, problemi di leggibilità o contesto

- conclusione: riassunto finale breve e coerente

Se il grafico è troppo confuso o incompleto, privilegia prudenza, chiarezza e onestà analitica.

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

    const { asset, timeframe, request_type, screenshot_url, user_note, parent_review_id } = await req.json();

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

    // Download image from storage and convert to base64 (bucket is private)
    if (screenshot_url) {
      try {
        // Extract file path from the URL
        const bucketPath = screenshot_url.split("/chart-screenshots/").pop();
        if (bucketPath) {
          const decodedPath = decodeURIComponent(bucketPath);
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("chart-screenshots")
            .download(decodedPath);

          if (downloadError) {
            console.error("Storage download error:", downloadError);
          } else if (fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);
            const mimeType = fileData.type || "image/png";
            userContent.push({
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            });
          }
        }
      } catch (imgErr) {
        console.error("Image processing error:", imgErr);
      }
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
