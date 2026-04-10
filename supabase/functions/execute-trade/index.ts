import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METAAPI_BASE = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const METAAPI_CLIENT_LEGACY_BASE = "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

// ========== METAAPI HELPERS ==========
async function metaapiRequest(path: string, options: RequestInit = {}) {
  const token = Deno.env.get("METAAPI_TOKEN");
  if (!token) throw new Error("METAAPI_TOKEN non configurato");

  const url = path.startsWith("http") ? path : `${METAAPI_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "auth-token": token,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const rawBody = await res.text();
  console.log(`[MetaApi] ${options.method || "GET"} ${path} -> ${res.status}`);

  if (!res.ok) {
    throw new Error(`MetaApi error ${res.status}: ${rawBody || "empty response"}`);
  }

  if (!rawBody || rawBody.trim() === "") return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function normalizeUrlBase(url: unknown) {
  if (typeof url !== "string" || !url.trim()) return null;
  try {
    return new URL(url.trim()).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function buildRegionalMetaApiClientBase(region: unknown) {
  if (typeof region !== "string" || !region.trim()) return null;
  return `https://mt-client-api-v1.${region.trim()}.agiliumtrade.ai`;
}

async function resolveClientBase(metaAccountId: string): Promise<string> {
  try {
    const accountMeta = await metaapiRequest(`/users/current/accounts/${metaAccountId}`);
    const accessUrls = accountMeta?.accessUrls;
    
    // Try httpUrl first
    const httpUrl = normalizeUrlBase(accessUrls?.httpUrl);
    if (httpUrl) return httpUrl;
    
    // Try restApiUrl
    const restUrl = normalizeUrlBase(accessUrls?.restApiUrl);
    if (restUrl) return restUrl;
    
    // Try region-based
    const region = accountMeta?.region;
    const regionUrl = buildRegionalMetaApiClientBase(region);
    if (regionUrl) return regionUrl;
  } catch (err) {
    console.warn(`[ExecuteTrade] Routing resolution failed: ${err}`);
  }
  
  return METAAPI_CLIENT_LEGACY_BASE;
}

async function metaapiTradeRequest(metaAccountId: string, body: Record<string, unknown>) {
  const token = Deno.env.get("METAAPI_TOKEN");
  if (!token) throw new Error("METAAPI_TOKEN non configurato");

  const clientBase = await resolveClientBase(metaAccountId);
  const url = `${clientBase}/users/current/accounts/${metaAccountId}/trade`;
  
  console.log(`[ExecuteTrade] Sending trade to ${url}`);
  console.log(`[ExecuteTrade] Trade body: ${JSON.stringify(body)}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "auth-token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawBody = await res.text();
  console.log(`[ExecuteTrade] Trade response FULL: ${res.status} ${rawBody}`);

  let parsed: any = null;
  try {
    parsed = JSON.parse(rawBody);
  } catch { /* ignore */ }

  // MetaApi can return HTTP 200 with an error inside the body (stringCode/numericCode)
  const hasProviderError = parsed?.stringCode && parsed.stringCode.startsWith("ERR_");
  const isReallyOk = res.ok && !hasProviderError;

  return { status: res.status, ok: isReallyOk, body: parsed, rawBody };
}

// ========== MAIN HANDLER ==========
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

    const { account_id, review_id, signal_id, asset, direction, order_type, lot_size, entry_price, stop_loss, take_profit } = await req.json();

    // Validate required fields — entry_price is optional for market orders
    const isMarketOrder = !order_type || order_type.toLowerCase() === "market";
    const missingFields: string[] = [];
    if (!account_id) missingFields.push("account_id");
    if (!asset) missingFields.push("asset");
    if (!direction) missingFields.push("direction");
    if (!lot_size) missingFields.push("lot_size");
    if (!isMarketOrder && !entry_price) missingFields.push("entry_price");

    if (missingFields.length > 0) {
      console.error(`[ExecuteTrade] Missing fields: ${missingFields.join(", ")}`);
      return new Response(JSON.stringify({ error: `Parametri mancanti: ${missingFields.join(", ")}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== LICENSE-LEVEL PERMISSION CHECK =====
    const { data: userLicense } = await supabase.rpc("get_user_license_settings", { _user_id: user.id });
    const { data: isAdminCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdminCheck && (!userLicense || !userLicense.trade_execution_enabled)) {
      return new Response(JSON.stringify({ error: "Esecuzione trading non disponibile per il tuo piano." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== SERVER-SIDE PERMISSION CHECKS =====
    
    // 1. Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from("trading_accounts")
      .select("*")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      console.error(`[ExecuteTrade] Account not found: ${account_id} for user ${user.id}`);
      return new Response(JSON.stringify({ error: "Conto non trovato" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Check credential_mode
    if (account.credential_mode !== "master") {
      console.warn(`[ExecuteTrade] BLOCKED: credential_mode=${account.credential_mode} for account ${account_id}`);
      return new Response(JSON.stringify({ error: "Conto collegato con password investor — esecuzione non consentita" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Check trading_execution_enabled
    if (!account.trading_execution_enabled) {
      console.warn(`[ExecuteTrade] BLOCKED: trading_execution_enabled=false for account ${account_id}`);
      return new Response(JSON.stringify({ error: "Trading non abilitato per questo conto" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Check connection status — block on any non-connected state
    if (account.connection_status !== "connected") {
      const isRecoverableState = ["sync_error_tls", "provider_unavailable"].includes(account.connection_status);
      const errorMsg = isRecoverableState
        ? "Connessione al provider temporaneamente non disponibile. Riprova la sincronizzazione dall'Account Center prima di eseguire ordini."
        : "Conto non connesso";
      return new Response(JSON.stringify({ error: errorMsg, recoverable: isRecoverableState }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Check provider_account_id
    if (!account.provider_account_id) {
      return new Response(JSON.stringify({ error: "Conto senza provider ID" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create execution log (pending) — entry_price defaults to 0 for market orders
    const { data: logEntry, error: logError } = await supabase
      .from("order_execution_logs")
      .insert({
        user_id: user.id,
        account_id,
        review_id: review_id || null,
        asset,
        direction,
        order_type: order_type || "market",
        lot_size,
        entry_price: entry_price || 0,
        stop_loss: stop_loss || null,
        take_profit: take_profit || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (logError) {
      console.error(`[ExecuteTrade] Log insert error: ${logError.message}`);
      return new Response(JSON.stringify({ error: "Errore interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== BUILD METAAPI TRADE REQUEST =====
    const normalizedDirection = direction.toLowerCase();
    const isMarket = (order_type || "market").toLowerCase() === "market";
    
    // Normalize symbol: MT5 uses "XAUUSD" not "XAU/USD"
    const normalizedSymbol = asset.replace("/", "");
    console.log(`[ExecuteTrade] Symbol normalization: "${asset}" -> "${normalizedSymbol}"`);

    let tradeBody: Record<string, unknown>;

    if (isMarket) {
      tradeBody = {
        actionType: normalizedDirection.includes("buy") ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL",
        symbol: normalizedSymbol,
        volume: Number(lot_size),
      };
    } else {
      const isBuy = normalizedDirection.includes("buy");
      tradeBody = {
        actionType: isBuy ? "ORDER_TYPE_BUY_LIMIT" : "ORDER_TYPE_SELL_LIMIT",
        symbol: normalizedSymbol,
        volume: Number(lot_size),
        openPrice: Number(entry_price),
      };
    }

    // Add SL/TP if provided
    if (stop_loss) tradeBody.stopLoss = Number(stop_loss);
    if (take_profit) tradeBody.takeProfit = Number(take_profit);

    console.log(`[ExecuteTrade] Executing for user=${user.id} account=${account_id} ${JSON.stringify(tradeBody)}`);

    // ===== SEND TO METAAPI =====
    const result = await metaapiTradeRequest(account.provider_account_id, tradeBody);

    // Update execution log with result
    const finalStatus = result.ok ? "success" : "failed";
    const errorMsg = result.ok ? null : (result.body?.stringCode ? `${result.body.stringCode}: ${result.body.message}` : result.body?.message || result.rawBody?.substring(0, 500) || "Errore provider");

    await supabase
      .from("order_execution_logs")
      .update({
        status: finalStatus,
        provider_response: result.body || { status: result.status, raw: result.rawBody?.substring(0, 1000) },
        error_message: errorMsg,
      })
      .eq("id", logEntry.id);

    console.log(`[ExecuteTrade] Result: status=${finalStatus} logId=${logEntry.id}`);

    if (!result.ok) {
      return new Response(JSON.stringify({
        error: errorMsg,
        execution_id: logEntry.id,
        status: "failed",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Auto-link trade to source if review_id or signal_id provided
    if (result.ok && (review_id || signal_id)) {
      const sourceType = signal_id ? "signal" : "review";
      // Find the most recent trade for this account+asset to link
      const { data: recentTrades } = await supabase
        .from("account_trade_history")
        .select("id")
        .eq("account_id", account_id)
        .eq("user_id", user.id)
        .eq("asset", asset.replace("/", ""))
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (recentTrades && recentTrades.length > 0) {
        await supabase.from("account_trade_history").update({
          source_type: sourceType,
          source_review_id: review_id || null,
          source_signal_id: signal_id || null,
        }).eq("id", recentTrades[0].id);
        console.log(`[ExecuteTrade] Auto-linked trade ${recentTrades[0].id} to ${sourceType}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      execution_id: logEntry.id,
      provider_response: result.body,
      status: "success",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error(`[ExecuteTrade] Unhandled error: ${err}`);
    return new Response(JSON.stringify({ error: "Errore interno del server" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
