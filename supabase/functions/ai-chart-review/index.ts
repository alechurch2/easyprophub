import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// 🔧 CONFIGURAZIONE MODELLI AI — Centralizzata
// ============================================================
const CHART_REVIEW_MODEL_STANDARD = "google/gemini-2.5-flash";
const CHART_REVIEW_MODEL_PREMIUM = "google/gemini-2.5-pro";
// ============================================================

// ============================================================
// 🔧 STRATEGIA PRO — Analisi tecnica SINTETICA
// ============================================================
const CUSTOM_STRATEGY_PRO = `

Analizza lo screenshot del grafico seguendo la metodologia Smart Money / ICT / Wyckoff.

OBIETTIVO: Chart review tecnica, strutturata, CONCISA. Ogni sezione deve essere breve e ad alta densità informativa. Niente giri di parole, niente ripetizioni tra sezioni.

REGOLE DI STILE:
- Ogni campo: massimo 2-3 frasi dense. No paragrafi lunghi.
- Non ripetere lo stesso concetto in contesto, bias e conclusione.
- Vai dritto al punto. Privilegia informazioni azionabili.
- Se un elemento non è valutabile, scrivi "Non valutabile" e basta.

ORDINE DI ANALISI:

1. LEGGIBILITÀ IMMAGINE — Qualità dello screenshot in una frase.

2. CONTESTO — Trend dominante e fase attuale (espansione, consolidamento, transizione). Solo ciò che si vede.

3. BIAS — Direzione prevalente con motivazione in una frase.

4. STRUTTURA — Massimi/minimi chiave, eventuali BOS o CHoCH. Sintesi strutturale.

5. LIQUIDITÀ — Dove si trova (EQH, EQL, swing points), se è stata presa o meno.

6. ZONA INTERESSANTE — Area di interesse operativo se presente, altrimenti "Nessuna zona chiara".

7. CONFERMA RICHIESTA — Cosa serve per validare il setup, in 1-2 punti.

8. INVALIDAZIONE — Livello o condizione che invalida lo scenario principale.

9. SCENARIO BULLISH — Sintesi dello scenario rialzista in 1-2 frasi.

10. SCENARIO BEARISH — Sintesi dello scenario ribassista in 1-2 frasi.

QUALITÀ SETUP: 1-10. Alta (8-10): contesto chiaro, confluenze multiple. Media (5-7): alcuni elementi ma quadro incompleto. Bassa (1-4): lettura incerta.

CONCLUSIONE: Sintesi finale in 1-2 frasi che integra gli elementi principali SENZA ripetere ciò già detto nelle altre sezioni.

REGOLE FONDAMENTALI:
- Non inventare ciò che non si vede
- Non promettere risultati
- Non dare segnali operativi diretti
- Se il grafico è ambiguo, dirlo
`;

// ============================================================
// 🔧 STRATEGIA EASY — Sempre market order principale + pending opzionali
// ============================================================
const CUSTOM_STRATEGY_EASY = `

Analizza lo screenshot del grafico e fornisci un'analisi SEMPLIFICATA e OPERATIVA.

OBIETTIVO: Fornire SEMPRE un segnale principale a mercato (Buy o Sell), con un livello di forza da 1 a 5. In aggiunta, puoi proporre ordini pending come alternative di precisione.

STRUTTURA OBBLIGATORIA DELL'OUTPUT:

A. SEGNALE PRINCIPALE (SEMPRE PRESENTE — obbligatorio):
- Deve essere SEMPRE un ordine a mercato: "Buy" o "Sell"
- Con entry di riferimento (prezzo attuale approssimativo), stop_loss, take_profit
- Con setup_strength da 1 a 5:
  1 = molto debole / no operatività consigliata
  2 = debole / alta prudenza
  3 = discreto / minimo consigliabile
  4 = buono / segnale affidabile
  5 = forte / alta convinzione
- Se setup_strength < 3: il segnale è da considerare solo informativo, non consigliato per il copy
- Se setup_strength >= 3: il segnale è copiabile con prudenza

B. ORDINI PENDING AGGIUNTIVI (OPZIONALI — 0, 1 o 2):
- Possono essere: Buy Limit, Sell Limit, Buy Stop, Sell Stop
- Sono alternative di precisione o ingressi migliori
- NON sostituiscono il segnale principale
- Hanno il loro livello di forza indipendente (pending_strength 1-5)

LOGICA DI DECISIONE:
1. Analizza il grafico e determina il bias direzionale
2. Genera SEMPRE il segnale principale a mercato nella direzione del bias
3. Assegna la forza del segnale onestamente (1-5)
4. Se esistono livelli di prezzo migliori per entrare, aggiungi ordini pending
5. Se il contesto è molto debole (forza 1-2), fornisci comunque il segnale market ma con warning chiaro

ADATTAMENTO AL TIMEFRAME:
- M1-M15: setup intraday brevi, SL/TP stretti
- M30-H1: setup intraday medi
- H4-D1: setup swing, SL/TP ampi
- W1: setup di posizione

Per ogni setup indica:
- tipo, entry_range, stop_loss, take_profit, sl_pips, tp_pips
- spiegazione: perché questo setup? Cosa sta vedendo il sistema? (2-3 frasi semplici)

QUALITÀ DEL SEGNALE (signal_quality):
- "alta": contesto chiaro, struttura coerente, livelli precisi
- "media": elementi presenti ma contesto non perfetto
- "bassa": pochi elementi, massima prudenza

STILE: Linguaggio semplice, diretto, comprensibile per chi inizia. Frasi brevi.
NON inventare livelli. NON promettere risultati.
`;

// ============================================================
// 🔧 STRATEGIA PREMIUM — Enhancement
// ============================================================
const PREMIUM_ENHANCEMENT = `

ISTRUZIONI AGGIUNTIVE PER ANALISI PREMIUM:
1. APPROFONDIMENTO: ogni sezione più dettagliata e ragionata.
2. MULTI-TIMEFRAME REASONING: ragiona su come il contesto si inserisce in TF superiori/inferiori.
3. CONFLUENZE: cerca attivamente confluenze tra struttura, liquidità, Wyckoff e zone di interesse.
4. SCORING DETTAGLIATO: spiega il ragionamento dietro il punteggio.
5. SCENARI ELABORATI: descrivi condizioni di transizione tra scenari.
6. GESTIONE RISCHIO: aggiungi considerazioni sulla gestione del rischio.
7. SINTESI STRATEGICA: conclusione più elaborata che integri tutti gli elementi.

Mantieni sempre prudenza, nessuna promessa di risultato.
`;

// ============================================================
// System prompts
// ============================================================
const SYSTEM_PROMPT_PRO = `Sei un analista tecnico esperto. Analizza screenshot di grafici di trading seguendo ESCLUSIVAMENTE la strategia definita.

STRATEGIA:
${CUSTOM_STRATEGY_PRO}

REGOLE:
1. Analizza SOLO ciò che vedi nell'immagine.
2. Se l'immagine non è leggibile, dichiaralo in "leggibilita_immagine".
3. NON promettere risultati. NON suggerire esecuzione.
4. Rispondi SOLO tramite la funzione "chart_analysis".
5. Ogni campo: CONCISO, professionale, no ridondanza.
6. IMPORTANTE: non ripetere le stesse informazioni in campi diversi. Ogni campo deve aggiungere valore unico.

CONTESTO: ti verranno forniti asset, timeframe e tipo di richiesta.`;

const SYSTEM_PROMPT_PRO_PREMIUM = `Sei un analista tecnico SENIOR. Fornisci un'analisi PREMIUM approfondita ma SINTETICA di screenshot di grafici.

STRATEGIA:
${CUSTOM_STRATEGY_PRO}

${PREMIUM_ENHANCEMENT}

REGOLE:
1. Analizza SOLO ciò che vedi nell'immagine.
2. Se l'immagine non è leggibile, dichiaralo in "leggibilita_immagine".
3. NON promettere risultati. NON suggerire esecuzione.
4. Rispondi SOLO tramite la funzione "chart_analysis".
5. Ogni campo: DETTAGLIATO ma senza ridondanza. Più profondità, non più parole inutili.

CONTESTO: ti verranno forniti asset, timeframe e tipo di richiesta.`;

const SYSTEM_PROMPT_EASY = `Sei un analista tecnico che comunica in modo semplice e diretto. Analizza screenshot di grafici e fornisci SEMPRE un segnale principale a mercato, più eventuali ordini pending aggiuntivi.

STRATEGIA:
${CUSTOM_STRATEGY_EASY}

REGOLE:
1. Analizza SOLO ciò che vedi nell'immagine.
2. Se l'immagine non è leggibile, dichiaralo ma fornisci comunque il segnale principale basato su ciò che riesci a leggere.
3. Rispondi SOLO tramite la funzione "easy_chart_analysis".
4. Il campo "primary_signal" è OBBLIGATORIO e deve essere SEMPRE un ordine a mercato (Buy o Sell).
5. Il campo "pending_setups" è opzionale (0-2 ordini pending aggiuntivi).
6. Linguaggio semplice e comprensibile.
7. Assegna setup_strength onestamente: se il segnale è debole, dì 1 o 2. Non gonfiare il punteggio.

CONTESTO: ti verranno forniti asset, timeframe e dimensione del conto.`;

const SYSTEM_PROMPT_EASY_PREMIUM = `Sei un analista tecnico SENIOR. Fornisci un'analisi PREMIUM semplificata ma più approfondita. Comunichi in modo chiaro con un livello di dettaglio superiore.

STRATEGIA:
${CUSTOM_STRATEGY_EASY}

${PREMIUM_ENHANCEMENT}

REGOLE:
1. Analizza SOLO ciò che vedi nell'immagine.
2. Se l'immagine non è leggibile, dichiaralo ma fornisci comunque il segnale principale.
3. Rispondi SOLO tramite la funzione "easy_chart_analysis".
4. Il campo "primary_signal" è OBBLIGATORIO.
5. Linguaggio chiaro, dettagliato ma comprensibile.
6. Le spiegazioni devono essere più articolate rispetto alla versione standard.

CONTESTO: ti verranno forniti asset, timeframe e dimensione del conto.`;

// ============================================================
// Tool definitions
// ============================================================
const ANALYSIS_TOOL_PRO = {
  type: "function",
  function: {
    name: "chart_analysis",
    description: "Restituisce l'analisi strutturata e SINTETICA di un grafico di trading.",
    parameters: {
      type: "object",
      properties: {
        leggibilita_immagine: { type: "string", description: "Qualità dell'immagine in 1 frase." },
        contesto: { type: "string", description: "Contesto di mercato in 1-2 frasi." },
        bias: { type: "string", description: "Direzione probabile con motivazione breve." },
        struttura: { type: "string", description: "Struttura di mercato in 1-2 frasi." },
        liquidita: { type: "string", description: "Zone di liquidità in 1-2 frasi." },
        zona_interessante: { type: "string", description: "Zona di interesse operativo in 1 frase." },
        conferma_richiesta: { type: "string", description: "Elementi di conferma in 1-2 punti." },
        invalidazione: { type: "string", description: "Condizione di invalidazione in 1 frase." },
        scenario_bullish: { type: "string", description: "Scenario rialzista in 1-2 frasi." },
        scenario_bearish: { type: "string", description: "Scenario ribassista in 1-2 frasi." },
        qualita_setup: { type: "integer", description: "Qualità del setup da 1 a 10." },
        warning: { type: "string", description: "Avvertenze brevi." },
        conclusione: { type: "string", description: "Sintesi finale UNICA in 1-2 frasi, senza ripetere le altre sezioni." },
      },
      required: ["leggibilita_immagine", "contesto", "bias", "struttura", "liquidita", "zona_interessante", "conferma_richiesta", "invalidazione", "scenario_bullish", "scenario_bearish", "qualita_setup", "warning", "conclusione"],
      additionalProperties: false,
    },
  },
};

const SETUP_SCHEMA = {
  type: "object",
  properties: {
    tipo: { type: "string", description: "Tipo di operazione." },
    entry_range: { type: "string", description: "Livello o range di entrata." },
    stop_loss: { type: "string", description: "Livello dello stop loss." },
    take_profit: { type: "string", description: "Livello del take profit." },
    sl_pips: { type: "number", description: "Distanza SL in pips." },
    tp_pips: { type: "number", description: "Distanza TP in pips." },
    spiegazione: { type: "string", description: "Spiegazione breve: perché questo setup? (2-3 frasi)" },
  },
  required: ["tipo", "entry_range", "stop_loss", "take_profit", "sl_pips", "tp_pips", "spiegazione"],
};

const ANALYSIS_TOOL_EASY = {
  type: "function",
  function: {
    name: "easy_chart_analysis",
    description: "Restituisce un'analisi Easy con segnale principale a mercato obbligatorio + pending opzionali.",
    parameters: {
      type: "object",
      properties: {
        leggibilita_immagine: { type: "string", description: "Qualità dell'immagine. Es: 'Chiara', 'Parziale', 'Non leggibile'." },
        signal_quality: { type: "string", enum: ["alta", "media", "bassa"], description: "Qualità complessiva del segnale." },
        setup_strength: { type: "integer", description: "Forza del segnale principale da 1 a 5. 1=molto debole, 2=debole, 3=discreto/minimo consigliabile, 4=buono, 5=forte." },
        primary_signal: {
          type: "object",
          description: "Segnale principale OBBLIGATORIO — sempre a mercato (Buy o Sell).",
          properties: {
            tipo: { type: "string", enum: ["Buy", "Sell"], description: "Direzione: Buy o Sell. Sempre market order." },
            entry_range: { type: "string", description: "Prezzo di riferimento corrente per l'entry." },
            stop_loss: { type: "string", description: "Livello dello stop loss." },
            take_profit: { type: "string", description: "Livello del take profit." },
            sl_pips: { type: "number", description: "Distanza SL in pips." },
            tp_pips: { type: "number", description: "Distanza TP in pips." },
            spiegazione: { type: "string", description: "Perché questo segnale? Cosa vede il sistema? (2-3 frasi)" },
          },
          required: ["tipo", "entry_range", "stop_loss", "take_profit", "sl_pips", "tp_pips", "spiegazione"],
        },
        pending_setups: {
          type: "array",
          description: "Ordini pending aggiuntivi opzionali (0-2). Alternative di precisione.",
          items: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["Buy Limit", "Sell Limit", "Buy Stop", "Sell Stop"], description: "Tipo di ordine pending." },
              pending_strength: { type: "integer", description: "Forza di questo setup pending da 1 a 5." },
              entry_range: { type: "string", description: "Livello di entrata del pending." },
              stop_loss: { type: "string", description: "Livello dello stop loss." },
              take_profit: { type: "string", description: "Livello del take profit." },
              sl_pips: { type: "number", description: "Distanza SL in pips." },
              tp_pips: { type: "number", description: "Distanza TP in pips." },
              spiegazione: { type: "string", description: "Perché questo ordine pending? (2-3 frasi)" },
            },
            required: ["tipo", "pending_strength", "entry_range", "stop_loss", "take_profit", "sl_pips", "tp_pips", "spiegazione"],
          },
        },
        expected_duration: { type: "string", description: "Durata attesa del trade (es: '2-4 ore', '1-3 giorni')." },
        warning: { type: "string", description: "Eventuali avvertenze." },
        conclusione: { type: "string", description: "Conclusione sintetica." },
        contesto_mercato: { type: "string", description: "Cosa sta facendo il prezzo adesso (1-2 frasi semplici)." },
      },
      required: ["leggibilita_immagine", "signal_quality", "setup_strength", "primary_signal", "expected_duration", "conclusione"],
      additionalProperties: false,
    },
  },
};

// ============================================================
// Cost estimation per model (USD per 1K tokens)
// ============================================================
const MODEL_COSTS: Record<string, { input: number; output: number; perCall: number }> = {
  "google/gemini-2.5-flash": { input: 0.00015, output: 0.0006, perCall: 0.003 },
  "google/gemini-2.5-pro": { input: 0.00125, output: 0.005, perCall: 0.015 },
  "google/gemini-2.5-flash-lite": { input: 0.000075, output: 0.0003, perCall: 0.001 },
};

function estimateAICost(model: string, tokensIn: number, tokensOut: number): number {
  const costs = MODEL_COSTS[model];
  if (!costs) return 0.005;
  if (tokensIn > 0 || tokensOut > 0) {
    return (tokensIn / 1000) * costs.input + (tokensOut / 1000) * costs.output;
  }
  return costs.perCall;
}

async function checkUsageLimits(supabase: any, userId: string, functionType: string, isAdmin: boolean): Promise<string | null> {
  if (isAdmin) return null;

  const { data: limits } = await supabase
    .from("ai_usage_limits")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq("is_active", true);

  if (!limits || limits.length === 0) return null;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  for (const limit of limits) {
    const hasUserOverride = limits.some((l: any) => l.user_id === userId && l.limit_type === limit.limit_type);
    if (limit.user_id === null && hasUserOverride) continue;

    let matchType = "";
    let since = "";
    if (limit.limit_type === "chat_daily" && functionType === "chat") { matchType = "chat"; since = todayStart; }
    else if (limit.limit_type === "chart_review_standard_daily" && functionType === "chart_review_standard") { matchType = functionType; since = todayStart; }
    else if (limit.limit_type === "chart_review_standard_monthly" && functionType === "chart_review_standard") { matchType = functionType; since = monthStart; }
    else if (limit.limit_type === "chart_review_premium_monthly" && functionType === "chart_review_premium") { matchType = functionType; since = monthStart; }
    else continue;

    const { count } = await supabase
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("function_type", matchType)
      .gte("created_at", since);

    if (count !== null && count >= limit.limit_value) {
      const period = limit.limit_type.includes("daily") ? "giornaliero" : "mensile";
      return `Hai raggiunto il limite ${period} di ${limit.limit_value} richieste per questa funzione.`;
    }
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "").trim();

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      console.error("[AUTH] getClaims failed:", claimsError?.message, "token length:", token?.length);
      return new Response(JSON.stringify({ error: "Token non valido", detail: claimsError?.message || "claims missing" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.warn("[AUTH] getUser warning, continuing with verified JWT claims:", authError.message, "user_id:", userId);
    }

    const user = { id: userId };

    // Check license validity server-side
    const { data: licenseCheck } = await supabase.rpc("is_license_valid", { _user_id: user.id });
    const { data: isAdminCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!licenseCheck && !isAdminCheck) {
      return new Response(
        JSON.stringify({ error: "La tua licenza è scaduta o sospesa. Contatta il supporto.", license_expired: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { asset, timeframe, request_type, screenshot_url, user_note, parent_review_id, review_mode, account_size, review_tier, risk_percent } = body;

    if (!asset || !timeframe || !request_type) {
      return new Response(
        JSON.stringify({ error: "Parametri mancanti: asset, timeframe, request_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isEasy = review_mode === "easy";
    const isPremium = review_tier === "premium";

    // Check premium quota if premium
    if (isPremium) {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: usage } = await supabase
        .from("premium_review_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .single();

      if (usage && usage.reviews_used >= usage.quota_limit) {
        return new Response(
          JSON.stringify({ error: "Hai esaurito le review premium disponibili per questo mese.", quota_exceeded: true }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check AI usage limits
    const functionType = isPremium ? "chart_review_premium" : "chart_review_standard";
    const limitCheckResult = await checkUsageLimits(supabase, user.id, functionType, isAdminCheck);
    if (limitCheckResult) {
      return new Response(
        JSON.stringify({ error: limitCheckResult, limit_exceeded: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Select model based on tier
    const model = isPremium ? CHART_REVIEW_MODEL_PREMIUM : CHART_REVIEW_MODEL_STANDARD;

    // Create pending review
    const insertData: any = {
      user_id: user.id,
      asset,
      timeframe,
      request_type,
      screenshot_url,
      status: "pending",
      user_note: user_note || null,
      parent_review_id: parent_review_id || null,
      review_mode: isEasy ? "easy" : "pro",
      review_tier: isPremium ? "premium" : "standard",
      ai_model_used: model,
    };
    if (isEasy && account_size) {
      insertData.account_size = account_size;
    }

    const { data: review, error: insertError } = await supabase
      .from("ai_chart_reviews")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Errore nel salvataggio della richiesta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user prompt
    const tierLabel = isPremium ? " (ANALISI PREMIUM — massimo dettaglio e approfondimento)" : "";
    const userText = isEasy
      ? `Analizza questo grafico in modalità Easy.${tierLabel}

METADATI:
- Asset: ${asset}
- Timeframe: ${timeframe}
- Dimensione conto: $${account_size || "non specificata"}

${user_note ? `NOTA UTENTE: ${user_note}` : ""}

ISTRUZIONI CRITICHE:
1. DEVI sempre fornire un "primary_signal" con tipo "Buy" o "Sell" (ordine a mercato).
2. Assegna setup_strength da 1 a 5 onestamente.
3. Se vuoi suggerire ingressi più precisi, aggiungili come "pending_setups".
4. Fornisci anche contesto_mercato per dare valore informativo.

Usa ESCLUSIVAMENTE la funzione "easy_chart_analysis" per restituire l'output.`
      : `Analizza questo grafico secondo la strategia predefinita.${tierLabel}

METADATI:
- Asset: ${asset}
- Timeframe: ${timeframe}
- Tipo richiesta: ${request_type}

IMPORTANTE: Sii CONCISO. Ogni campo massimo 2-3 frasi. Non ripetere informazioni tra campi diversi.

Usa ESCLUSIVAMENTE la funzione "chart_analysis" per restituire l'output strutturato.`;

    const userContent: any[] = [{ type: "text", text: userText }];

    // Download image and convert to base64
    if (screenshot_url) {
      try {
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

    // Select system prompt based on mode + tier
    let systemPrompt: string;
    if (isEasy) {
      systemPrompt = isPremium ? SYSTEM_PROMPT_EASY_PREMIUM : SYSTEM_PROMPT_EASY;
    } else {
      systemPrompt = isPremium ? SYSTEM_PROMPT_PRO_PREMIUM : SYSTEM_PROMPT_PRO;
    }
    const analysisTool = isEasy ? ANALYSIS_TOOL_EASY : ANALYSIS_TOOL_PRO;
    const toolName = isEasy ? "easy_chart_analysis" : "chart_analysis";

    console.log(`[AI Chart Review] Mode: ${isEasy ? "easy" : "pro"}, Tier: ${isPremium ? "premium" : "standard"}, Model: ${model}`);

    // Call AI
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [analysisTool],
          tool_choice: { type: "function", function: { name: toolName } },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      await supabase.from("ai_chart_reviews").update({ status: "failed" }).eq("id", review.id);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite richieste AI raggiunto. Riprova tra qualche minuto." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti. Contatta l'amministratore." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Errore nella generazione dell'analisi AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();

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
      await supabase.from("ai_chart_reviews").update({ status: "failed" }).eq("id", review.id);
      return new Response(JSON.stringify({ error: "L'AI non ha restituito un output strutturato valido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate and normalize
    if (isEasy) {
      // Ensure primary_signal exists
      if (!analysis.primary_signal) {
        // Backward compat: if old format with setups array, migrate first setup as primary
        if (analysis.setups && analysis.setups.length > 0) {
          const first = analysis.setups[0];
          analysis.primary_signal = {
            tipo: first.tipo?.includes("Buy") ? "Buy" : "Sell",
            entry_range: first.entry_range,
            stop_loss: first.stop_loss,
            take_profit: first.take_profit,
            sl_pips: first.sl_pips,
            tp_pips: first.tp_pips,
            spiegazione: first.spiegazione,
          };
          // Remaining setups become pending
          if (analysis.setups.length > 1) {
            analysis.pending_setups = analysis.setups.slice(1).map((s: any) => ({
              ...s,
              pending_strength: analysis.setup_strength || 3,
            }));
          }
          delete analysis.setups;
        } else {
          // Fallback: create a minimal primary signal
          analysis.primary_signal = {
            tipo: "Buy",
            entry_range: "N/A",
            stop_loss: "N/A",
            take_profit: "N/A",
            sl_pips: 0,
            tp_pips: 0,
            spiegazione: "Segnale non determinabile dal grafico fornito.",
          };
          if (!analysis.setup_strength) analysis.setup_strength = 1;
        }
      }

      // Ensure primary_signal.tipo is pure market (Buy or Sell)
      const pt = analysis.primary_signal.tipo?.toLowerCase() || "";
      if (pt.includes("buy")) analysis.primary_signal.tipo = "Buy";
      else analysis.primary_signal.tipo = "Sell";

      // Normalize setup_strength
      if (!analysis.signal_quality) analysis.signal_quality = "media";
      if (!analysis.setup_strength) analysis.setup_strength = 3;
      analysis.setup_strength = Math.max(1, Math.min(5, Math.round(analysis.setup_strength)));

      if (!analysis.expected_duration) analysis.expected_duration = "Non determinabile";
      if (!analysis.pending_setups) analysis.pending_setups = [];
      if (analysis.pending_setups.length > 2) analysis.pending_setups = analysis.pending_setups.slice(0, 2);

      // Normalize pending setups
      for (const s of analysis.pending_setups) {
        if (!s.pending_strength) s.pending_strength = 3;
        s.pending_strength = Math.max(1, Math.min(5, Math.round(s.pending_strength)));
      }

      // Remove legacy setups field if present
      delete analysis.setups;
    } else {
      const requiredFields = [
        "leggibilita_immagine", "contesto", "bias", "struttura", "liquidita",
        "zona_interessante", "conferma_richiesta", "invalidazione",
        "scenario_bullish", "scenario_bearish", "qualita_setup", "warning", "conclusione",
      ];
      const missingFields = requiredFields.filter((f) => !(f in analysis!));
      for (const f of missingFields) {
        analysis![f] = f === "qualita_setup" ? 0 : "Non valutabile";
      }
      if (typeof analysis.qualita_setup !== "number") {
        analysis.qualita_setup = parseInt(analysis.qualita_setup) || 0;
      }
      analysis.qualita_setup = Math.max(0, Math.min(10, analysis.qualita_setup));
    }

    // Update review
    const { error: updateError } = await supabase
      .from("ai_chart_reviews")
      .update({ analysis, status: "completed" })
      .eq("id", review.id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    // Increment premium usage if premium
    if (isPremium) {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: existing } = await supabase
        .from("premium_review_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .single();

      if (existing) {
        await supabase
          .from("premium_review_usage")
          .update({ reviews_used: existing.reviews_used + 1, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("premium_review_usage")
          .insert({ user_id: user.id, month_year: monthYear, reviews_used: 1, quota_limit: 3 });
      }
    }

    // Log AI usage
    const tokensInput = aiData.usage?.prompt_tokens || 0;
    const tokensOutput = aiData.usage?.completion_tokens || 0;
    const estimatedCost = estimateAICost(model, tokensInput, tokensOutput);
    await supabase.from("ai_usage_log").insert({
      user_id: user.id,
      function_type: functionType,
      model,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      estimated_cost: estimatedCost,
      metadata: { review_id: review.id, review_mode: isEasy ? "easy" : "pro" },
    });

    return new Response(
      JSON.stringify({ id: review.id, analysis, status: "completed", review_tier: isPremium ? "premium" : "standard" }),
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
