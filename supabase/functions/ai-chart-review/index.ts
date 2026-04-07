import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { OVERLAY_PROMPT_ADDON } from "../_shared/overlay-prompt.ts";

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
Analizza lo screenshot del grafico seguendo una metodologia principalmente Smart Money / ICT. Wyckoff va usato solo come contesto secondario e solo sui timeframe superiori a 30 minuti, quando è davvero supportato da ciò che si vede.

OBIETTIVO:
Fornire una chart review tecnica, selettiva, sintetica e ad alta densità informativa. La risposta deve sembrare quella di un trader esperto, severo e concreto, non di un assistente neutro o didattico generico.

PRIORITÀ DI LETTURA (ordine di importanza):
1. Liquidità
2. Sweep / manipolazione
3. Struttura del timeframe visibile
4. Sessione / timing, se leggibile
5. Displacement / reazione impulsiva
6. Volume, se leggibile
7. Contesto Wyckoff solo su TF > 30m
8. Change of Character / shift strutturale

PRINCIPI FONDAMENTALI:
- Non vedere setup ovunque
- Non chiamare BOS se non c’è una rottura strutturale reale e difendibile
- Non chiamare CHoCH / shift se il cambio struttura non è chiaro
- Non confondere consolidamento con accumulazione/distribuzione
- Non usare termini ICT/SMC per riempire i campi
- Non forzare zone, sweep, displacement o contesto se non sono visibili
- Se il materiale è insufficiente, dillo chiaramente
- Se non c’è edge, dillo chiaramente

DEFINIZIONE DI CONTESTO VALIDO:
Un contesto buono richiede preferibilmente più elementi coerenti tra loro, ad esempio:
- liquidità chiaramente identificabile
- sweep/manipolazione leggibile
- reazione o displacement credibile
- struttura coerente con lo scenario prevalente
- timing/sessione coerente, se visibile
Un singolo elemento isolato non basta.

DISTINZIONE PER TIMEFRAME:
- TF bassi (M1-M15): maggiore peso a sweep, timing, displacement, shift rapido, reazione immediata
- TF medi/alti (M30-H4+): maggiore peso a struttura generale, liquidità HTF, range, contesto Wyckoff, estremi significativi
- Se il timeframe non è leggibile, non inventarlo

REGOLE DI STILE:
- Solo informazioni importanti
- Ogni campo: 1-2 frasi dense, massimo 3 solo se indispensabile
- Nessun paragrafo lungo
- Nessuna ripetizione inutile tra campi
- Ogni campo deve aggiungere valore unico
- Se non valutabile: scrivi "Non valutabile"
- Se non esiste una zona difendibile o un edge, dichiaralo senza esitazione

ORDINE DI ANALISI:

1. LEGGIBILITÀ IMMAGINE
Valuta se lo screenshot consente una review seria. Se è insufficiente, dirlo in modo netto.

2. CONTESTO
Definisci fase e stato del mercato visibile: trend, compressione, consolidamento, transizione, espansione. Solo ciò che si vede chiaramente.

3. BIAS
Indica lo scenario prevalente:
- rialzista
- ribassista
- neutrale / non tradabile
Motivalo in modo secco.

4. STRUTTURA
Indica massimi/minimi chiave, continuità o perdita di struttura, eventuale BOS/CHoCH solo se chiaramente presente.

5. LIQUIDITÀ
Indica dove si trova la liquidità rilevante:
- interna / esterna se leggibile
- EQH / EQL
- swing high / low
- estremi di range
Specifica se è stata presa oppure no.

6. SWEEP / MANIPOLAZIONE
Indica se c’è stato uno sweep/manipolazione reale. Se non si vede, scrivilo chiaramente.

7. SESSIONE / TIMING
Se leggibile, indica se orario/sessione aiutano o penalizzano il contesto. Se non leggibile: "Non valutabile".

8. DISPLACEMENT / REAZIONE
Indica se dopo sweep o zona chiave c’è stata una reazione impulsiva credibile. Se il movimento è debole o sporco, dillo.

9. VOLUME
Solo se leggibile. Indica se conferma o no il movimento. Se non leggibile: "Non valutabile".

10. CONTESTO WYCKOFF
Compilalo solo se TF > 30m e il contesto lo consente davvero. Indica se il mercato appare più vicino a:
- accumulazione
- distribuzione
- semplice range
- non valutabile
Non forzarlo mai.

11. ZONA INTERESSANTE
Indica l’unica area davvero interessante, se esiste. Se non c’è una zona chiara e difendibile: "Nessuna zona chiara".

12. COSA MANCA
Indica cosa manca per avere un contesto più forte o tradabile:
- sweep
- displacement
- reclaim
- conferma strutturale
- timing
- livelli HTF
Se il contesto è già ben definito, scrivi: "Contesto già ben definito".

13. INVALIDAZIONE
Indica il livello o la condizione che invalida lo scenario prevalente.

14. SCENARIO PREVALENTE
Descrivi in 1-2 frasi lo scenario più sensato e difendibile in base a ciò che si vede.

15. SCENARIO ALTERNATIVO
Descrivi in 1 frase cosa dovrebbe cambiare perché lo scenario opposto diventi più probabile.

QUALITÀ SETUP:
Valuta da 1 a 10 con criterio medio, non commerciale.
- 8-10: contesto chiaro, liquidità leggibile, sweep/manipolazione credibile, struttura coerente, reazione valida
- 5-7: lettura sensata ma incompleta o non ancora matura
- 1-4: contesto debole, ambiguo, sporco o poco leggibile

CONCLUSIONE:
Chiudi con una sintesi breve e decisionale:
- scenario prevalente
- contesto tradabile / da confermare / poco interessante
Niente ripetizioni.

RICHIESTA SCREEN MIGLIORE:
Usala solo se davvero utile.
Se lo screenshot è leggibile ma incompleto per una review di qualità, indica in 1 frase cosa l’utente dovrebbe tracciare o mostrare meglio, ad esempio:
- massimo/minimo rilevante
- supporti/resistenze principali
- area di liquidità
- range di riferimento
- sweep
- livelli HTF
- sessione/orario

DIVIETI:
- Non dare segnali operativi diretti
- Non promettere risultati
- Non compensare con sicurezza artificiale quando manca contesto
- Non riempire i campi se lo screenshot non supporta l’analisi

REGOLE DI UTILITÀ REALE:
- La risposta deve aiutare davvero il cliente a capire cosa sta succedendo sul grafico, non deve sembrare una spiegazione teorica o piena di termini messi solo per suonare tecnici.
- Evita formulazioni vaghe, astratte o decorative. Ogni frase deve spiegare qualcosa di concreto e visibile.
- Se citi liquidità, sweep, struttura, displacement o Wyckoff, devi collegarli subito a ciò che implicano operativamente o contestualmente.
- Non limitarti a nominare i concetti: spiega in modo semplice e diretto perché contano in questo caso specifico.
- Privilegia frasi come:
  - "il prezzo ha preso liquidità sopra il massimo e poi ha reagito"
  - "la struttura al momento resta rialzista ma manca conferma"
  - "la zona è interessante solo se il prezzo reagisce con decisione"
  - "al momento il contesto è leggibile ma non abbastanza pulito per avere edge"
- Evita frasi che suonano tecniche ma aggiungono poco valore pratico.
- Se il contesto non offre un vantaggio chiaro, dillo in modo semplice.
- L’utente deve finire la lettura capendo:
  1. cosa sta facendo il prezzo
  2. perché conta
  3. cosa manca, se manca qualcosa
  4. se il contesto è davvero interessante oppure no
  Non scrivere mai una frase solo perché "suona bene": ogni frase deve essere concreta, specifica e utile.
`;

// ============================================================
// 🔧 STRATEGIA EASY — Sempre market order principale + pending opzionali
// ============================================================
const CUSTOM_STRATEGY_EASY = `
Analizza lo screenshot del grafico e fornisci un'analisi SEMPLICE, CONCRETA e OPERATIVA.

OBIETTIVO:
Fornire SEMPRE un segnale principale a mercato (Buy o Sell), con un livello di forza da 1 a 5.
In aggiunta, puoi proporre ordini pending come alternative di precisione, ma solo se migliorano davvero il setup.

PRINCIPI FONDAMENTALI:
- Il segnale principale a mercato deve essere sempre presente
- Il segnale deve essere utile, concreto e comprensibile
- Non usare parole tecniche solo per sembrare esperto
- Non inventare livelli o setup
- Se il contesto è debole, il segnale principale va comunque dato, ma deve essere chiaramente descritto come NON consigliato da copiare
- Se il contesto è confuso o lo screenshot è insufficiente, dillo in modo semplice e chiaro
- L’utente deve capire:
  1. cosa sta facendo il prezzo
  2. perché il segnale è buy o sell
  3. quanto è forte davvero
  4. se vale la pena copiarlo oppure no

STILE:
- Linguaggio semplice, diretto, concreto
- Frasi brevi
- Niente supercazzola
- Niente spiegazioni teoriche inutili
- Ogni frase deve aiutare il cliente a capire cosa fare o perché NON fare nulla

STRUTTURA OBBLIGATORIA DELL’OUTPUT:

A. SEGNALE PRINCIPALE (SEMPRE PRESENTE — obbligatorio)
- Deve essere sempre un ordine a mercato:
  - Buy
  - Sell
- Deve contenere:
  - tipo
  - entry_range (prezzo attuale o area molto vicina)
  - stop_loss
  - take_profit
  - sl_pips
  - tp_pips
  - setup_strength (1-5)
  - signal_quality (alta / media / bassa)
  - spiegazione breve e concreta

SCALA setup_strength:
1 = molto debole / direzione solo teorica / non copiabile
2 = debole / prudenza alta / non consigliato
3 = discreto / minimo accettabile / copiabile con prudenza
4 = buono / contesto solido / copiabile
5 = forte / contesto molto chiaro / alta convinzione

REGOLA IMPORTANTE:
- Se setup_strength è 1 o 2:
  - il segnale va comunque dato
  - ma deve essere chiaramente definito NON consigliato da copiare
  - la spiegazione deve dire cosa manca
- Se setup_strength è 3 o più:
  - il segnale può essere considerato copiabile con prudenza

B. ORDINI PENDING AGGIUNTIVI (OPZIONALI — 0, 1 o 2)
- Possono essere:
  - Buy Limit
  - Sell Limit
  - Buy Stop
  - Sell Stop
- Sono setup alternativi, non sostituiscono il segnale principale
- Devono essere proposti solo se hanno un senso reale:
  - prezzo di ingresso migliore
  - rischio migliore
  - conferma più pulita
- Non aggiungere pending orders “tanto per”
- Ogni pending deve avere:
  - tipo
  - entry_range
  - stop_loss
  - take_profit
  - sl_pips
  - tp_pips
  - pending_strength (1-5)
  - spiegazione breve

LOGICA DI DECISIONE:
1. Leggi il contesto e il bias principale del grafico
2. Genera SEMPRE un segnale principale a mercato nella direzione che ritieni più probabile
3. Assegna il livello di forza in modo onesto, non commerciale
4. Se esiste un livello migliore per entrare, aggiungi uno o due pending
5. Se il contesto è debole, il market va comunque dato ma con warning chiaro
6. Se il contesto è molto brutto o ambiguo, non fingere che sia buono: dai comunque la direzione principale ma spiega chiaramente che manca edge

ADATTAMENTO AL TIMEFRAME:
- M1-M15: setup intraday brevi, entrate veloci, stop/target più stretti
- M30-H1: setup intraday medi
- H4-D1: setup swing, stop/target più ampi
- W1: contesto di posizione, non lettura da esecuzione immediata

LOGICA DELLA SPIEGAZIONE:
Per ogni setup, la spiegazione deve rispondere in modo semplice a queste domande:
- cosa sta facendo il prezzo?
- perché il bias è buy o sell?
- perché questo setup ha senso adesso?
- se il segnale è debole, cosa manca?

Esempi di tono corretto:
- "Il prezzo sta reagendo dopo aver preso liquidità sotto il minimo e per ora la spinta resta rialzista."
- "La direzione short è possibile, ma al momento manca una conferma più pulita e il contesto resta sporco."
- "Il setup long ha senso solo se il prezzo difende questa zona, altrimenti perde qualità."
- "Il segnale c’è, ma la struttura non è abbastanza pulita per copiarlo con fiducia."

QUALITÀ DEL SEGNALE (signal_quality):
- alta = contesto chiaro, struttura coerente, livelli puliti
- media = lettura sensata ma non perfetta
- bassa = pochi elementi, contesto sporco o poco difendibile

REGOLE FONDAMENTALI:
- Non promettere risultati
- Non dire mai che un segnale è sicuro
- Non trasformare un contesto mediocre in un setup forte
- Non usare frasi vaghe o decorative
- Non scrivere mai una frase solo perché “suona bene”
- Ogni frase deve essere concreta, specifica e utile
`;

// ============================================================
// 🔧 STRATEGIA PREMIUM — Enhancement
// ============================================================
const PREMIUM_ENHANCEMENT = `

ISTRUZIONI AGGIUNTIVE PER ANALISI PREMIUM:

OBIETTIVO:
La versione Premium deve essere più utile, più profonda e più strategica della Standard, non semplicemente più lunga.
Ogni approfondimento deve aggiungere valore reale e aiutare a capire meglio contesto, qualità del setup e condizioni che rendono lo scenario valido o invalido.

REGOLE PREMIUM:
1. APPROFONDIMENTO UTILE
- Approfondisci solo ciò che migliora davvero la lettura.
- Non allungare l’analisi con spiegazioni decorative o ripetitive.

2. CONTESTO STRATEGICO
- Inquadra meglio dove si trova il prezzo nel contesto generale.
- Se utile, spiega se il prezzo è in espansione, compressione, fase di transizione, estremi di range o zona sensibile.

3. MULTI-TIMEFRAME RAGIONATO
- Usa il ragionamento multi-timeframe solo se supportato dallo screenshot e dal timeframe fornito.
- Non inventare il timeframe superiore/inferiore: puoi solo spiegare come il contesto visibile potrebbe inserirsi in una struttura più ampia.
- Se non è valutabile, dillo chiaramente.

4. CONFLUENZE REALI
- Cerca confluenze tra:
  - liquidità
  - sweep/manipolazione
  - struttura
  - displacement
  - timing/sessione
  - volume se visibile
  - contesto Wyckoff se pertinente
- Cita solo confluenze reali, non teoriche.

5. SCORING SPIEGATO
- Il punteggio del setup deve essere accompagnato da una motivazione concreta:
  - cosa lo alza
  - cosa lo abbassa
- Niente punteggi “sparati” senza spiegazione.

6. SCENARIO PRINCIPALE E TRANSIZIONE
- Descrivi meglio cosa deve succedere perché lo scenario principale resti valido.
- Descrivi cosa deve cambiare perché il mercato passi allo scenario alternativo.

7. GESTIONE DEL RISCHIO CONTESTUALE
- Aggiungi considerazioni qualitative sulla gestione del rischio:
  - contesto pulito o sporco
  - invalidazione vicina o lontana
  - struttura facile o difficile da difendere
- Non dare istruzioni di esecuzione, ma fai capire quanto il contesto è gestibile o fragile.

8. SINTESI STRATEGICA
- La conclusione premium deve integrare il quadro in modo più maturo:
  - scenario prevalente
  - qualità reale del contesto
  - cosa rende il setup interessante
  - cosa impone prudenza
  - La versione Premium deve sembrare più lucida, non più prolissa.

REGOLE FONDAMENTALI:
- Niente supercazzola
- Niente ripetizioni tra sezioni
- Niente promesse di risultato
- Nessuna sicurezza artificiale
- Se il materiale è scarso, dillo chiaramente anche in Premium
`;
// ============================================================
// System prompts
// ============================================================
const SYSTEM_PROMPT_PRO = `Sei un analista tecnico esperto specializzato in Smart Money / ICT. Devi analizzare screenshot di grafici in modo severo, tecnico, sintetico e selettivo.

STRATEGIA DA SEGUIRE:
${CUSTOM_STRATEGY_PRO}

REGOLE DI COMPORTAMENTO:
1. Analizza solo ciò che è davvero visibile nell’immagine.
2. Non inventare sweep, BOS, CHoCH, displacement, Wyckoff o zone se non sono chiaramente supportati dallo screenshot.
3. Se l’immagine è insufficiente, dichiaralo chiaramente in "leggibilita_immagine" e limita il resto dell’analisi.
4. Se il contesto è ambiguo o non c’è edge, dillo in modo netto. Non essere neutro per riempire i campi.
5. Non usare linguaggio da marketing, non promettere risultati, non suggerire esecuzione.
6. Non dare segnali operativi diretti.
7. Rispondi solo tramite la funzione "chart_analysis".
8. Ogni campo deve essere conciso, professionale, ad alta densità informativa.
9. Non ripetere lo stesso concetto in campi diversi: ogni campo deve aggiungere valore unico.
10. Se un elemento non è valutabile, scrivi "Non valutabile".
11. Se il materiale è leggibile ma incompleto, puoi usare il campo finale per indicare cosa tracciare meglio, ma solo se davvero utile.
12. Dai priorità a: liquidità, sweep/manipolazione, struttura, sessione/timing, displacement.
13. Wyckoff è secondario e va usato solo sui timeframe superiori a 30 minuti quando è davvero supportato dal grafico.

CONTESTO INPUT:
Ti verranno forniti asset, timeframe e tipo di richiesta. Usali solo come supporto interpretativo, senza sostituire ciò che è visibile nello screenshot.`;

const SYSTEM_PROMPT_PRO_PREMIUM = `Sei un analista tecnico esperto specializzato in Smart Money / ICT. Devi fornire una chart review Premium: più profonda, più rigorosa e più strategica della versione standard, ma sempre concreta, sintetica e utile.

STRATEGIA DA SEGUIRE:
${CUSTOM_STRATEGY_PRO}

ISTRUZIONI PREMIUM:
${PREMIUM_ENHANCEMENT}

REGOLE DI COMPORTAMENTO:
1. Analizza solo ciò che è davvero supportato dallo screenshot.
2. Non inventare BOS, CHoCH, sweep, displacement, contesto Wyckoff o zone operative se non sono chiaramente leggibili.
3. Se il materiale è insufficiente, dichiaralo chiaramente: la versione Premium non deve riempire i vuoti con linguaggio tecnico.
4. La differenza Premium non è “più lunga”, ma “più utile e più strategica”.
5. Ogni campo deve aggiungere valore unico: niente ripetizioni tra contesto, bias, struttura e conclusione.
6. Dai priorità a:
   - liquidità
   - sweep/manipolazione
   - struttura
   - timing/sessione
   - displacement
7. Wyckoff è secondario e va usato solo se realmente pertinente, soprattutto su timeframe superiori a 30 minuti.
8. Quando assegni il punteggio, spiega cosa lo sostiene e cosa lo indebolisce.
9. Lo scenario prevalente deve essere chiaro, ma non forzato.
10. Se non c’è edge, dillo in modo netto anche in Premium.
11. Non dare segnali operativi diretti.
12. Non promettere risultati.
13. Rispondi solo tramite la funzione "chart_analysis".

- La versione Premium deve sembrare più lucida, non più prolissa.

CONTESTO INPUT:
Ti verranno forniti asset, timeframe e tipo di richiesta. Usali solo come supporto interpretativo, senza sostituire ciò che è visibile nello screenshot.`;

const SYSTEM_PROMPT_EASY = `Sei un analista tecnico operativo che deve trasformare uno screenshot di grafico in una risposta semplice, concreta e utile per un utente non esperto.

STRATEGIA DA SEGUIRE:
${CUSTOM_STRATEGY_EASY}

REGOLE DI COMPORTAMENTO:
1. Analizza solo ciò che è davvero visibile nello screenshot.
2. Devi sempre fornire un segnale principale a mercato (Buy o Sell), ma la sua forza deve essere onesta.
3. Se il contesto è debole, devi dirlo chiaramente e spiegare perché il segnale non è consigliato da copiare.
4. Non inventare livelli, segnali o conferme che non si vedono.
5. Non usare parole tecniche solo per sembrare esperto.
6. Ogni frase deve essere concreta, utile e comprensibile.
7. Non fare supercazzola: l’utente deve capire subito cosa sta facendo il prezzo e quanto è forte il setup.
8. I pending orders sono opzionali e vanno aggiunti solo se migliorano davvero il setup.
9. Non promettere risultati.
10. Rispondi solo tramite la funzione prevista.
11. Se l’immagine è leggibile ma il contesto è brutto, il segnale principale va comunque dato ma con warning forte.
12. Se l’immagine è davvero insufficiente, dillo chiaramente nella leggibilità e limita l’analisi a ciò che è possibile vedere.

CONTESTO INPUT:
Ti verranno forniti asset, timeframe e tipo di richiesta. Usali solo come supporto, senza sostituire ciò che è visibile nello screenshot.`;

const SYSTEM_PROMPT_EASY_PREMIUM = `Sei un analista tecnico operativo che deve fornire una Easy Review Premium: semplice da capire, concreta e orientata all’azione, ma più profonda e più ragionata della Easy standard.

STRATEGIA DA SEGUIRE:
${CUSTOM_STRATEGY_EASY}

ISTRUZIONI PREMIUM:
${PREMIUM_ENHANCEMENT}

REGOLE DI COMPORTAMENTO:
1. Analizza solo ciò che è davvero visibile nello screenshot.
2. Devi sempre fornire un segnale principale a mercato (Buy o Sell), ma la sua forza deve essere onesta.
3. La versione Premium deve essere più utile della Easy standard, non solo più lunga:
   - spiegazione più chiara
   - contesto più leggibile
   - motivazione migliore del setup
   - scenari più ordinati
4. Se il contesto è debole, devi dirlo chiaramente e spiegare perché il segnale non è consigliato da copiare.
5. Non inventare livelli, conferme o setup che non si vedono.
6. Non usare linguaggio troppo tecnico o inutile: deve restare comprensibile anche per utenti poco esperti.
7. I pending orders sono opzionali e vanno aggiunti solo se migliorano davvero il setup.
8. Se assegni un livello di forza, spiega in modo semplice perché non è più alto o più basso.
9. Se il contesto è buono, spiega cosa lo rende tale.
10. Se il contesto è sporco o fragile, spiega cosa lo rende meno affidabile.
11. Non promettere risultati.
12. Non dare un tono commerciale.
13. Rispondi solo tramite la funzione prevista.

- La versione Premium deve sembrare più lucida, non più prolissa.

CONTESTO INPUT:
Ti verranno forniti asset, timeframe e tipo di richiesta. Usali solo come supporto, senza sostituire ciò che è visibile nello screenshot.`;

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
        conclusione: {
          type: "string",
          description: "Sintesi finale UNICA in 1-2 frasi, senza ripetere le altre sezioni.",
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
        leggibilita_immagine: {
          type: "string",
          description: "Qualità dell'immagine. Es: 'Chiara', 'Parziale', 'Non leggibile'.",
        },
        signal_quality: {
          type: "string",
          enum: ["alta", "media", "bassa"],
          description: "Qualità complessiva del segnale.",
        },
        setup_strength: {
          type: "integer",
          description:
            "Forza del segnale principale da 1 a 5. 1=molto debole, 2=debole, 3=discreto/minimo consigliabile, 4=buono, 5=forte.",
        },
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
              tipo: {
                type: "string",
                enum: ["Buy Limit", "Sell Limit", "Buy Stop", "Sell Stop"],
                description: "Tipo di ordine pending.",
              },
              pending_strength: { type: "integer", description: "Forza di questo setup pending da 1 a 5." },
              entry_range: { type: "string", description: "Livello di entrata del pending." },
              stop_loss: { type: "string", description: "Livello dello stop loss." },
              take_profit: { type: "string", description: "Livello del take profit." },
              sl_pips: { type: "number", description: "Distanza SL in pips." },
              tp_pips: { type: "number", description: "Distanza TP in pips." },
              spiegazione: { type: "string", description: "Perché questo ordine pending? (2-3 frasi)" },
            },
            required: [
              "tipo",
              "pending_strength",
              "entry_range",
              "stop_loss",
              "take_profit",
              "sl_pips",
              "tp_pips",
              "spiegazione",
            ],
          },
        },
        expected_duration: { type: "string", description: "Durata attesa del trade (es: '2-4 ore', '1-3 giorni')." },
        warning: { type: "string", description: "Eventuali avvertenze." },
        conclusione: { type: "string", description: "Conclusione sintetica." },
        contesto_mercato: { type: "string", description: "Cosa sta facendo il prezzo adesso (1-2 frasi semplici)." },
      },
      required: [
        "leggibilita_immagine",
        "signal_quality",
        "setup_strength",
        "primary_signal",
        "expected_duration",
        "conclusione",
      ],
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

async function checkUsageLimits(
  supabase: any,
  userId: string,
  functionType: string,
  isAdmin: boolean,
): Promise<string | null> {
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
    if (limit.limit_type === "chat_daily" && functionType === "chat") {
      matchType = "chat";
      since = todayStart;
    } else if (limit.limit_type === "chart_review_standard_daily" && functionType === "chart_review_standard") {
      matchType = functionType;
      since = todayStart;
    } else if (limit.limit_type === "chart_review_standard_monthly" && functionType === "chart_review_standard") {
      matchType = functionType;
      since = monthStart;
    } else if (limit.limit_type === "chart_review_premium_monthly" && functionType === "chart_review_premium") {
      matchType = functionType;
      since = monthStart;
    } else continue;

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "").trim();

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      console.error("[AUTH] getClaims failed:", claimsError?.message, "token length:", token?.length);
      return new Response(
        JSON.stringify({ error: "Token non valido", detail: claimsError?.message || "claims missing" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.warn(
        "[AUTH] getUser warning, continuing with verified JWT claims:",
        authError.message,
        "user_id:",
        userId,
      );
    }

    const user = { id: userId };

    // Check license validity server-side
    const { data: licenseCheck } = await supabase.rpc("is_license_valid", { _user_id: user.id });
    const { data: isAdminCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!licenseCheck && !isAdminCheck) {
      return new Response(
        JSON.stringify({ error: "La tua licenza è scaduta o sospesa. Contatta il supporto.", license_expired: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch license settings for enforcement
    const { data: userLicense } = await supabase.rpc("get_user_license_settings", { _user_id: user.id });
    const licenseSettings = userLicense || { chart_review_monthly_limit: 5, premium_review_monthly_limit: 0 };

    const body = await req.json();
    const {
      asset,
      timeframe,
      request_type,
      screenshot_url,
      user_note,
      parent_review_id,
      review_mode,
      account_size,
      review_tier,
      risk_percent,
      uses_ai_overlay,
    } = body;

    if (!asset || !timeframe || !request_type) {
      return new Response(JSON.stringify({ error: "Parametri mancanti: asset, timeframe, request_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEasy = review_mode === "easy";
    const isPremium = review_tier === "premium";

    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Check standard review limit from license settings
    if (!isPremium && !isAdminCheck) {
      const { data: stdUsage } = await supabase
        .from("standard_review_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .single();

      if (stdUsage && stdUsage.reviews_used >= licenseSettings.chart_review_monthly_limit) {
        return new Response(
          JSON.stringify({
            error: `Hai esaurito le ${licenseSettings.chart_review_monthly_limit} review standard disponibili per questo mese.`,
            quota_exceeded: true,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Check premium quota if premium
    if (isPremium && !isAdminCheck) {
      if (licenseSettings.premium_review_monthly_limit <= 0) {
        return new Response(
          JSON.stringify({ error: "Le review premium non sono disponibili per il tuo piano.", quota_exceeded: true }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: usage } = await supabase
        .from("premium_review_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .single();

      if (usage && usage.reviews_used >= licenseSettings.premium_review_monthly_limit) {
        return new Response(
          JSON.stringify({
            error: "Hai esaurito le review premium disponibili per questo mese.",
            quota_exceeded: true,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Check AI usage limits
    const functionType = isPremium ? "chart_review_premium" : "chart_review_standard";
    const limitCheckResult = await checkUsageLimits(supabase, user.id, functionType, isAdminCheck);
    if (limitCheckResult) {
      return new Response(JSON.stringify({ error: limitCheckResult, limit_exceeded: true }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    if (isEasy && risk_percent && risk_percent > 0 && risk_percent <= 0.05) {
      insertData.risk_percent = risk_percent;
    }

    const { data: review, error: insertError } = await supabase
      .from("ai_chart_reviews")
      .insert(insertData)
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

    console.log(
      `[AI Chart Review] Mode: ${isEasy ? "easy" : "pro"}, Tier: ${isPremium ? "premium" : "standard"}, Model: ${model}`,
    );

    // Call AI
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
          { role: "user", content: userContent },
        ],
        tools: [analysisTool],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      await supabase.from("ai_chart_reviews").update({ status: "failed" }).eq("id", review.id);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite richieste AI raggiunto. Riprova tra qualche minuto." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti. Contatta l'amministratore." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Errore nella generazione dell'analisi AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "L'AI non ha restituito un output strutturato valido" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Increment standard review usage if not premium
    if (!isPremium && !isAdminCheck) {
      const { data: stdExisting } = await supabase
        .from("standard_review_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .single();

      if (stdExisting) {
        await supabase.from("standard_review_usage")
          .update({ reviews_used: stdExisting.reviews_used + 1, updated_at: new Date().toISOString() })
          .eq("id", stdExisting.id);
      } else {
        await supabase.from("standard_review_usage")
          .insert({ user_id: user.id, month_year: monthYear, reviews_used: 1 });
      }
    }

    // Increment premium usage if premium
    if (isPremium && !isAdminCheck) {
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
          .insert({ user_id: user.id, month_year: monthYear, reviews_used: 1, quota_limit: licenseSettings.premium_review_monthly_limit || 3 });
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
