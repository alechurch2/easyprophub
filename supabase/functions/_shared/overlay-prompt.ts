// ============================================================
// 🔧 AI OVERLAY — Prompt dedicato e legenda colori (centralizzato)
// Questo file è l'unico punto da modificare per aggiornare
// istruzioni overlay, legenda colori e comportamento AI.
// ============================================================

export const OVERLAY_COLOR_LEGEND_TEXT = `
LEGENDA COLORI INDICATORE AI OVERLAY:
- PDH = blu
- PDL = ciano
- PWH = indaco
- PWL = viola
- Swing High = bianco
- Swing Low = grigio chiaro
- BOS_UP = verde
- BOS_DOWN = rosso
- CHOCH_UP = mint / verde acqua
- CHOCH_DOWN = arancione
- EQH = magenta
- EQL = rosa
- BSL_SWEEP = oro
- SSL_SWEEP = giallo
- Bullish FVG = aqua
- Bearish FVG = rosso acceso
- Demand zone = azure
- Supply zone = rosso soft
`;

export const OVERLAY_PANEL_FIELDS_TEXT = `
PANNELLO CONTESTUALE DELL'OVERLAY:
Il pannello riassuntivo può contenere i seguenti campi strutturati:
- pair: coppia o asset
- timeframe: TF corrente
- bias: direzione dominante
- bias 15 / bias 60 / bias 240: bias su diversi timeframe
- structure: stato struttura di mercato
- liquidity: stato liquidità
- zone: zone attive
- dominant: forza dominante
- session: sessione attiva
- state: stato del mercato
- PDH / PDL: livelli giornalieri precedenti
`;

/**
 * Istruzioni overlay da appendere al system prompt quando uses_ai_overlay = true.
 * Include legenda colori, campi pannello e regole di priorità.
 */
export const OVERLAY_PROMPT_ADDON = `

===== MODALITÀ AI OVERLAY ATTIVA =====

Lo screenshot è stato realizzato con un indicatore TradingView proprietario che aggiunge:
1. Un pannello contestuale con informazioni strutturate (bias, struttura, liquidità, sessione, stato, livelli).
2. Annotazioni grafiche colorate con semantica precisa (BOS, CHoCH, FVG, sweep, zone, livelli chiave).
3. Livelli orizzontali colorati (PDH, PDL, PWH, PWL, swing, EQH, EQL).

ISTRUZIONI FONDAMENTALI:
- Il pannello contestuale è la fonte informativa a più alta priorità: leggilo per primo e usalo come contesto strutturato.
- I colori e le annotazioni grafiche NON sono decorativi: ogni colore ha un significato tecnico preciso definito dalla legenda sotto.
- Non ignorare mai la price action: l'overlay supporta la lettura, non la sostituisce.
- Verifica SEMPRE la coerenza tra pannello contestuale e grafico. Se ci sono conflitti, dichiarali apertamente.
- Non inventare livelli, pattern o significati non presenti nell'overlay o nel grafico.
- In caso di contesto misto o ambiguo, evita eccessiva sicurezza.
- Sfrutta la presenza dell'overlay per produrre una review più precisa, più leggibile e più utile.

PRIORITÀ DI ANALISI IN OVERLAY MODE:
1. Pannello contestuale (bias, struttura, liquidità, sessione, stato)
2. Struttura e liquidità evidenziate dall'overlay (BOS, CHoCH, sweep)
3. Zone attive evidenziate (FVG, demand, supply)
4. Livelli chiave (PDH, PDL, PWH, PWL, EQH, EQL, swing)
5. Price action visibile sul grafico
6. Inferenze finali e sintesi

SE IL PANNELLO E IL GRAFICO SONO IN CONFLITTO:
- Dichiaralo apertamente.
- Spiega quale lettura ritieni più affidabile e perché.
- Non forzare la coerenza se non c'è.

${OVERLAY_COLOR_LEGEND_TEXT}

${OVERLAY_PANEL_FIELDS_TEXT}

REGOLE AGGIUNTIVE OVERLAY:
- Leggi le etichette visibili sull'overlay per identificare livelli e zone.
- Non confondere annotazioni dell'overlay con disegni manuali dell'utente.
- Se l'overlay non è leggibile o parziale, segnalalo.
- Usa la semantica dei colori per rafforzare la lettura strutturale, non per inventare interpretazioni.

===== FINE ISTRUZIONI OVERLAY =====
`;
