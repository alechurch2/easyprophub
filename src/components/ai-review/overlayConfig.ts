// ============================================================
// 🔧 AI OVERLAY — Configurazione centralizzata
// Legenda colori e istruzioni per l'indicatore TradingView proprietario.
// Modifica qui per aggiornare il comportamento AI in overlay mode.
// ============================================================

/**
 * Legenda colori dell'indicatore AI Overlay su TradingView.
 * Usata sia lato frontend (badge/tooltip) sia lato backend (prompt AI).
 */
export const OVERLAY_COLOR_LEGEND: Record<string, string> = {
  PDH: "blu",
  PDL: "ciano",
  PWH: "indaco",
  PWL: "viola",
  "swing high": "bianco",
  "swing low": "grigio chiaro",
  BOS_UP: "verde",
  BOS_DOWN: "rosso",
  CHOCH_UP: "mint",
  CHOCH_DOWN: "arancione",
  EQH: "magenta",
  EQL: "rosa",
  BSL_SWEEP: "oro",
  SSL_SWEEP: "giallo",
  "bullish FVG": "aqua",
  "bearish FVG": "rosso acceso",
  demand: "azure",
  supply: "rosso soft",
};

/**
 * Lista dei campi che possono apparire nel pannello contestuale dell'overlay.
 */
export const OVERLAY_PANEL_FIELDS = [
  "pair",
  "timeframe",
  "bias",
  "bias 15",
  "bias 60",
  "bias 240",
  "structure",
  "liquidity",
  "zone",
  "dominant",
  "session",
  "state",
  "PDH",
  "PDL",
] as const;
