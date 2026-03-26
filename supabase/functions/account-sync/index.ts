import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== TYPES ==========
interface ProviderAccountData {
  overview: {
    balance: number;
    equity: number;
    profit_loss: number;
    drawdown: number;
    daily_pnl: number;
    weekly_pnl: number;
    open_positions_count: number;
  };
  openPositions: Array<{
    external_trade_id: string;
    asset: string;
    direction: string;
    lot_size: number;
    entry_price: number;
    stop_loss: number | null;
    take_profit: number | null;
    profit_loss: number;
    opened_at: string;
  }>;
  closedTrades: Array<{
    external_trade_id: string;
    asset: string;
    direction: string;
    lot_size: number;
    entry_price: number;
    exit_price: number;
    stop_loss: number | null;
    take_profit: number | null;
    profit_loss: number;
    opened_at: string;
    closed_at: string;
    duration_minutes: number;
  }>;
}

// ========== METAAPI PROVIDER ==========
const METAAPI_BASE = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const METAAPI_CLIENT_LEGACY_BASE = "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

type MetaApiClientBaseCandidate = {
  accessUrl: string | null;
  baseUrl: string;
  host: string;
  region: string | null;
  source: string;
};

function getHostFromUrl(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

function normalizeUrlBase(url: unknown) {
  if (typeof url !== "string" || !url.trim()) {
    return null;
  }

  try {
    const parsed = new URL(url.trim());
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function buildRegionalMetaApiClientBase(region: unknown) {
  if (typeof region !== "string" || !region.trim()) {
    return null;
  }

  const normalizedRegion = region.trim();
  return `https://mt-client-api-v1.${normalizedRegion}.agiliumtrade.ai`;
}

function collectMetaApiClientBaseCandidates(accountMeta: any) {
  const candidates: MetaApiClientBaseCandidate[] = [];
  const checkedFields: string[] = [];
  const seen = new Set<string>();

  const pushCandidate = (
    rawUrl: unknown,
    source: string,
    region: string | null,
    accessUrl: string | null = typeof rawUrl === "string" ? rawUrl : null,
  ) => {
    checkedFields.push(source);

    const normalizedBase = normalizeUrlBase(rawUrl);
    if (!normalizedBase || seen.has(normalizedBase)) {
      return;
    }

    seen.add(normalizedBase);
    candidates.push({
      accessUrl,
      baseUrl: normalizedBase,
      host: getHostFromUrl(normalizedBase),
      region,
      source,
    });
  };

  const accountRegion = typeof accountMeta?.region === "string" ? accountMeta.region : null;
  const accessUrls = accountMeta?.accessUrls ?? null;
  pushCandidate(accessUrls?.httpUrl, "account.accessUrls.httpUrl", accountRegion);
  pushCandidate(accessUrls?.restApiUrl, "account.accessUrls.restApiUrl", accountRegion);

  const replicas = Array.isArray(accountMeta?.accountReplicas) ? accountMeta.accountReplicas : [];
  replicas.forEach((replica: any, index: number) => {
    const replicaRegion = typeof replica?.region === "string" ? replica.region : accountRegion;
    pushCandidate(replica?.accessUrls?.httpUrl, `account.accountReplicas[${index}].accessUrls.httpUrl`, replicaRegion);
    pushCandidate(replica?.accessUrls?.restApiUrl, `account.accountReplicas[${index}].accessUrls.restApiUrl`, replicaRegion);
    pushCandidate(buildRegionalMetaApiClientBase(replicaRegion), `account.accountReplicas[${index}].region`, replicaRegion, null);
  });

  pushCandidate(buildRegionalMetaApiClientBase(accountRegion), "account.region", accountRegion, null);
  pushCandidate(METAAPI_CLIENT_LEGACY_BASE, "legacy.defaultClientBase", null, null);

  return {
    candidates,
    checkedFields,
    region: accountRegion,
  };
}

async function metaapiClientFetchJson(url: string, token: string, logPrefix: string) {
  const res = await fetch(url, {
    headers: {
      "auth-token": token,
      "Content-Type": "application/json",
    },
  });

  const rawBody = await res.text();
  console.log(`${logPrefix} -> ${res.status}, body length: ${rawBody.length}`);

  if (!res.ok) {
    throw new Error(`MetaApi client error ${res.status}: ${rawBody || "empty response"}`);
  }

  if (!rawBody || rawBody.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    console.warn(`[MetaApi Client] Non-JSON response for ${url}: ${rawBody.substring(0, 200)}`);
    return null;
  }
}

async function resolveMetaApiClientRouting(accountId: string) {
  const metadataEndpoint = `/users/current/accounts/${accountId}`;
  const accountMeta = await metaapiRequest(metadataEndpoint);
  const { candidates, checkedFields, region } = collectMetaApiClientBaseCandidates(accountMeta);
  const accessUrls = accountMeta?.accessUrls ?? null;

  console.log(`[MetaApi Client] Routing metadata endpoint: ${metadataEndpoint}`);
  console.log(`[MetaApi Client] Routing metadata summary: ${JSON.stringify({
    region,
    state: accountMeta?.state ?? null,
    connectionStatus: accountMeta?.connectionStatus ?? null,
    accessUrls,
    accountReplicas: Array.isArray(accountMeta?.accountReplicas)
      ? accountMeta.accountReplicas.map((replica: any, index: number) => ({
        index,
        region: replica?.region ?? null,
        accessUrls: replica?.accessUrls ?? null,
      }))
      : [],
    checkedFields,
    candidates: candidates.map((candidate) => ({
      source: candidate.source,
      region: candidate.region,
      host: candidate.host,
      accessUrl: candidate.accessUrl,
      baseUrl: candidate.baseUrl,
    })),
  })}`);

  if (!accessUrls?.httpUrl && !accessUrls?.restApiUrl) {
    console.warn(`[MetaApi Client] No direct accessUrl on provisioning account object from ${metadataEndpoint}. Checked fields=${checkedFields.join(", ") || "none"}. accessUrls=${JSON.stringify(accessUrls)}`);
  }

  return {
    metadataEndpoint,
    accountMeta,
    candidates,
    checkedFields,
  };
}

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
  console.log(`[MetaApi] ${options.method || "GET"} ${path} -> ${res.status}, body length: ${rawBody.length}`);

  if (!res.ok) {
    throw new Error(`MetaApi error ${res.status}: ${rawBody || "empty response"}`);
  }

  if (!rawBody || rawBody.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch (e) {
    console.warn(`[MetaApi] Non-JSON response for ${path}: ${rawBody.substring(0, 200)}`);
    return null;
  }
}

async function metaapiClientRequest(accountId: string, path: string) {
  const token = Deno.env.get("METAAPI_TOKEN");
  if (!token) throw new Error("METAAPI_TOKEN non configurato");

  const runtimeLabel = `Deno/${Deno.version.deno} ${Deno.build.os}/${Deno.build.arch}`;
  const attemptedUrls: Array<{ url: string; host: string; source: string; region: string | null; error: string }> = [];

  console.log(`[MetaApi Client] Runtime: ${runtimeLabel}`);
  console.log(`[MetaApi Client] Resolving client endpoint for ${path}...`);

  let routing;
  try {
    routing = await resolveMetaApiClientRouting(accountId);
  } catch (routingErr) {
    const routingError = routingErr instanceof Error ? routingErr.message : String(routingErr);
    console.error(`[MetaApi Client] Routing resolution failed for ${path}: ${routingError}`);
    routing = {
      metadataEndpoint: `/users/current/accounts/${accountId}`,
      accountMeta: null,
      checkedFields: ["legacy.defaultClientBase"],
      candidates: collectMetaApiClientBaseCandidates(null).candidates,
    };
  }

  const [originalCandidate] = routing.candidates;
  if (!originalCandidate) {
    throw new Error(`MetaApi client routing error. metadataEndpoint=${routing.metadataEndpoint} checkedFields=${routing.checkedFields.join(",") || "none"} reason=no-client-base-candidates`);
  }

  const originalUrl = `${originalCandidate.baseUrl}/users/current/accounts/${accountId}${path}`;
  console.log(`[MetaApi Client] Original URL for ${path}: ${originalUrl}`);
  console.log(`[MetaApi Client] Original host for ${path}: ${originalCandidate.host}`);
  console.log(`[MetaApi Client] Original routing source for ${path}: ${originalCandidate.source} region=${originalCandidate.region ?? "unknown"} accessUrl=${originalCandidate.accessUrl ?? "not-provided"}`);

  for (let index = 0; index < routing.candidates.length; index++) {
    const candidate = routing.candidates[index];
    const finalUrl = `${candidate.baseUrl}/users/current/accounts/${accountId}${path}`;
    const isOriginalAttempt = index === 0;
    const attemptLabel = isOriginalAttempt ? "ORIGINAL" : `FALLBACK ${index}`;

    console.log(`[MetaApi Client] ${attemptLabel} candidate for ${path}: source=${candidate.source} region=${candidate.region ?? "unknown"} host=${candidate.host} accessUrl=${candidate.accessUrl ?? "not-provided"}`);
    console.log(`[MetaApi Client] ${attemptLabel} finalUrl for ${path}: ${finalUrl}`);

    try {
      const data = await metaapiClientFetchJson(finalUrl, token, `[MetaApi Client] ${attemptLabel} GET ${path}`);
      console.log(`[MetaApi Client] SUCCESS for ${path}: finalUrl=${finalUrl} host=${candidate.host} region=${candidate.region ?? "unknown"}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      attemptedUrls.push({
        url: finalUrl,
        host: candidate.host,
        source: candidate.source,
        region: candidate.region,
        error: errorMessage,
      });

      console.error(`[MetaApi Client] ${attemptLabel} REQUEST FAILED url=${finalUrl} host=${candidate.host} source=${candidate.source} region=${candidate.region ?? "unknown"} error=${errorMessage}`);

      const isTlsError = errorMessage.includes("certificate") ||
        errorMessage.includes("TLS") ||
        errorMessage.includes("UnknownIssuer") ||
        errorMessage.includes("Expired");

      if (!isTlsError) {
        throw new Error(`MetaApi client request failed. originalUrl=${originalUrl} finalUrl=${finalUrl} region=${candidate.region ?? "unknown"} source=${candidate.source} error=${errorMessage}`);
      }
    }
  }

  const attemptsSummary = attemptedUrls.map((attempt, index) => ({
    attempt: index + 1,
    url: attempt.url,
    host: attempt.host,
    source: attempt.source,
    region: attempt.region,
    error: attempt.error,
  }));

  console.error(`[MetaApi Client] All routing attempts failed for ${path}: ${JSON.stringify({
    metadataEndpoint: routing.metadataEndpoint,
    region: routing.accountMeta?.region ?? null,
    checkedFields: routing.checkedFields,
    attempts: attemptsSummary,
  })}`);
  throw new Error(`MetaApi client TLS/network error. metadataEndpoint=${routing.metadataEndpoint} originalUrl=${originalUrl} checkedFields=${routing.checkedFields.join(",") || "none"} attempts=${JSON.stringify(attemptsSummary)}`);
}

// Deploy a MetaApi account and wait for it to connect
async function createMetaApiAccount(account: any): Promise<string> {
  const token = Deno.env.get("METAAPI_TOKEN");
  if (!token) throw new Error("METAAPI_TOKEN non configurato");

  // Configurable reliability: defaults to "regular" to avoid 403 on demo/test accounts
  // Set METAAPI_RELIABILITY_DEFAULT=high in secrets when ready for production
  const reliability = Deno.env.get("METAAPI_RELIABILITY_DEFAULT") || "regular";
  const provisioningProfileId = Deno.env.get("METAAPI_PROVISIONING_PROFILE_ID");
  console.log("[MetaApi] Using reliability:", reliability, "provisioningProfileId:", provisioningProfileId || "none");

  const payload: Record<string, unknown> = {
    login: String(account.account_number),
    password: account.investor_password,
    name: account.account_name || `EasyProp-${account.account_number}`,
    server: account.server,
    platform: (account.platform || "mt5").toLowerCase(),
    type: "cloud-g2",
    magic: 0,
    reliability,
  };

  // Use provisioning profile when available (required for some brokers)
  if (provisioningProfileId) {
    payload.provisioningProfileId = provisioningProfileId;
  }

  console.log("[MetaApi] Creating account with payload:", JSON.stringify({ ...payload, password: "***" }));

  const result = await metaapiRequest("/users/current/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("[MetaApi] Account created, id:", result.id);
  if (!result.id) {
    throw new Error(`MetaApi non ha restituito un account ID. Risposta: ${JSON.stringify(result)}`);
  }

  return result.id;
}

// Deploy the account (start the cloud instance)
async function deployMetaApiAccount(metaAccountId: string) {
  await metaapiRequest(`/users/current/accounts/${metaAccountId}/deploy`, {
    method: "POST",
  });
}

// Wait for the account to reach DEPLOYED state and connected
async function waitForConnection(metaAccountId: string, maxWaitMs = 90000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const info = await metaapiRequest(`/users/current/accounts/${metaAccountId}`);
    if (info.state === "DEPLOYED" && info.connectionStatus === "CONNECTED") {
      return true;
    }
    if (info.state === "DEPLOY_FAILED") {
      throw new Error(`Deploy fallito: ${info.connectionStatus || "stato sconosciuto"}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Timeout: il conto non si è connesso entro 90 secondi. Riprova tra qualche minuto.");
}

// Fetch account data from MetaApi
async function fetchMetaApiData(metaAccountId: string): Promise<ProviderAccountData> {
  // 1. Get account information (balance, equity, etc.)
  console.log("[Sync:AccountInfo] Fetching account-information...");
  const accountInfo = await metaapiClientRequest(metaAccountId, "/account-information");
  console.log(`[Sync:AccountInfo] Raw data: balance=${accountInfo?.balance} equity=${accountInfo?.equity} margin=${accountInfo?.margin} freeMargin=${accountInfo?.freeMargin} marginLevel=${accountInfo?.marginLevel} leverage=${accountInfo?.leverage} currency=${accountInfo?.currency}`);

  // 2. Get open positions
  console.log("[Sync:Positions] Fetching positions...");
  const positions = await metaapiClientRequest(metaAccountId, "/positions");
  const positionsArr = Array.isArray(positions) ? positions : [];
  console.log(`[Sync:Positions] Received ${positionsArr.length} open positions`);

  // 3. Get history deals (last 90 days for better metrics)
  const startTime = new Date(Date.now() - 90 * 86400000).toISOString();
  const endTime = new Date().toISOString();
  console.log(`[Sync:History] Fetching history-deals from ${startTime} to ${endTime}...`);
  const historyOrders = await metaapiClientRequest(
    metaAccountId,
    `/history-deals/time/${startTime}/${endTime}`
  );
  const dealsArr = Array.isArray(historyOrders) ? historyOrders : [];
  console.log(`[Sync:History] Received ${dealsArr.length} raw deals`);

  // Log deal types for debugging
  const dealTypeCounts: Record<string, number> = {};
  for (const d of dealsArr) {
    const key = `${d.type || "unknown"}/${d.entryType || "unknown"}`;
    dealTypeCounts[key] = (dealTypeCounts[key] || 0) + 1;
  }
  console.log(`[Sync:History] Deal type breakdown: ${JSON.stringify(dealTypeCounts)}`);

  const balance = accountInfo?.balance || 0;
  const equity = accountInfo?.equity || 0;
  const floatingPnl = equity - balance;

  // Map open positions
  const openPositions = positionsArr.map((p: any) => {
    console.log(`[Sync:Positions] Position: id=${p.id} symbol=${p.symbol} type=${p.type} volume=${p.volume} profit=${p.profit} openPrice=${p.openPrice}`);
    return {
      external_trade_id: `metaapi-pos-${p.id}`,
      asset: p.symbol,
      direction: p.type === "POSITION_TYPE_BUY" ? "buy" : "sell",
      lot_size: p.volume || 0,
      entry_price: p.openPrice || 0,
      stop_loss: p.stopLoss || null,
      take_profit: p.takeProfit || null,
      profit_loss: p.profit || 0,
      opened_at: p.time || new Date().toISOString(),
    };
  });

  // Process history deals into closed trades
  const dealsByPosition: Record<string, any[]> = {};
  let filteredDeals = 0;
  for (const deal of dealsArr) {
    if (deal.type === "DEAL_TYPE_BALANCE" || deal.type === "DEAL_TYPE_CREDIT") {
      filteredDeals++;
      continue;
    }
    const posId = deal.positionId || deal.id;
    if (!dealsByPosition[posId]) dealsByPosition[posId] = [];
    dealsByPosition[posId].push(deal);
  }
  console.log(`[Sync:History] Filtered out ${filteredDeals} balance/credit deals. Remaining positions to process: ${Object.keys(dealsByPosition).length}`);

  const closedTrades: ProviderAccountData["closedTrades"] = [];
  for (const [posId, deals] of Object.entries(dealsByPosition)) {
    const entryDeals = deals.filter((d: any) => d.entryType === "DEAL_ENTRY_IN");
    const exitDeals = deals.filter((d: any) => d.entryType === "DEAL_ENTRY_OUT");

    if (entryDeals.length > 0 && exitDeals.length > 0) {
      const entry = entryDeals[0];
      const exit = exitDeals[exitDeals.length - 1];
      const openTime = new Date(entry.time);
      const closeTime = new Date(exit.time);
      const durationMins = Math.round((closeTime.getTime() - openTime.getTime()) / 60000);
      const pnl = exitDeals.reduce((sum: number, d: any) => sum + (d.profit || 0) + (d.swap || 0) + (d.commission || 0), 0);

      closedTrades.push({
        external_trade_id: `metaapi-deal-${posId}`,
        asset: entry.symbol,
        direction: entry.type === "DEAL_TYPE_BUY" ? "buy" : "sell",
        lot_size: entry.volume || 0,
        entry_price: entry.price || 0,
        exit_price: exit.price || 0,
        stop_loss: null,
        take_profit: null,
        profit_loss: Math.round(pnl * 100) / 100,
        opened_at: openTime.toISOString(),
        closed_at: closeTime.toISOString(),
        duration_minutes: durationMins,
      });
    } else {
      console.log(`[Sync:History] Position ${posId}: ${entryDeals.length} entries, ${exitDeals.length} exits - skipped (incomplete)`);
    }
  }
  console.log(`[Sync:History] Processed ${closedTrades.length} closed trades from deals`);

  // Calculate metrics from closed trades
  const wins = closedTrades.filter(t => t.profit_loss > 0);
  const losses = closedTrades.filter(t => t.profit_loss < 0);
  const totalPnl = closedTrades.reduce((s, t) => s + t.profit_loss, 0);
  const grossProfit = wins.reduce((s, t) => s + t.profit_loss, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profit_loss, 0));
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.99 : 0);

  // Calculate daily PnL (trades closed today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dailyTrades = closedTrades.filter(t => new Date(t.closed_at) >= todayStart);
  const dailyPnl = dailyTrades.reduce((s, t) => s + t.profit_loss, 0) + floatingPnl;

  // Calculate weekly PnL (trades closed this week, Monday-based)
  const weekStart = new Date();
  const dayOfWeek = weekStart.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weeklyTrades = closedTrades.filter(t => new Date(t.closed_at) >= weekStart);
  const weeklyPnl = weeklyTrades.reduce((s, t) => s + t.profit_loss, 0) + floatingPnl;

  // Calculate drawdown: if positions are open, use (balance - equity) / balance
  // Otherwise use max historical drawdown from closed trades
  let drawdown = 0;
  if (balance > 0 && equity < balance) {
    drawdown = Math.round(((balance - equity) / balance) * 10000) / 100;
  }

  console.log(`[Sync:Metrics] Calculated: winRate=${winRate.toFixed(1)}% profitFactor=${profitFactor.toFixed(2)} totalPnl=${totalPnl.toFixed(2)} dailyPnl=${dailyPnl.toFixed(2)} weeklyPnl=${weeklyPnl.toFixed(2)} drawdown=${drawdown.toFixed(2)}% floatingPnl=${floatingPnl.toFixed(2)} wins=${wins.length} losses=${losses.length} openPositions=${openPositions.length}`);

  return {
    overview: {
      balance: Math.round(balance * 100) / 100,
      equity: Math.round(equity * 100) / 100,
      profit_loss: Math.round(floatingPnl * 100) / 100,
      drawdown,
      daily_pnl: Math.round(dailyPnl * 100) / 100,
      weekly_pnl: Math.round(weeklyPnl * 100) / 100,
      open_positions_count: openPositions.length,
      // Extra metrics to save
      win_rate: Math.round(winRate * 100) / 100,
      profit_factor: Math.round(profitFactor * 100) / 100,
    },
    openPositions,
    closedTrades,
  };
}

// ========== MOCK PROVIDER (fallback) ==========
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateMockData(account: any): ProviderAccountData {
  const seed = hashCode(account.id);
  const r = (min: number, max: number) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);
  const assets = ["EUR/USD", "GBP/USD", "XAU/USD", "USD/JPY", "NAS100"];
  const balance = 10000 + r(0, 90000);
  const floatingPnl = r(-500, 800);

  const openPositions = Array.from({ length: Math.floor(r(0, 4)) }, (_, i) => {
    const asset = assets[i % assets.length];
    const dir = i % 2 === 0 ? "buy" : "sell";
    const entry = asset === "XAU/USD" ? 2300 + r(-50, 50) : asset === "NAS100" ? 18000 + r(-500, 500) : 1.0 + r(0, 0.5);
    return {
      external_trade_id: `mock-open-${account.id.slice(0, 8)}-${i}`,
      asset, direction: dir,
      lot_size: Math.round(r(0.01, 1) * 100) / 100,
      entry_price: Math.round(entry * 100000) / 100000,
      stop_loss: Math.round((entry * (dir === "buy" ? 0.995 : 1.005)) * 100000) / 100000,
      take_profit: Math.round((entry * (dir === "buy" ? 1.01 : 0.99)) * 100000) / 100000,
      profit_loss: Math.round(r(-200, 400) * 100) / 100,
      opened_at: new Date(Date.now() - r(3600000, 86400000 * 3)).toISOString(),
    };
  });

  const closedTrades = Array.from({ length: Math.floor(r(5, 20)) }, (_, i) => {
    const asset = assets[i % assets.length];
    const dir = i % 3 === 0 ? "sell" : "buy";
    const entry = asset === "XAU/USD" ? 2300 + r(-100, 100) : asset === "NAS100" ? 18000 + r(-1000, 1000) : 1.0 + r(0, 0.5);
    const exit = entry * (dir === "buy" ? 1 + r(-0.005, 0.01) : 1 - r(-0.01, 0.005));
    const pnl = (dir === "buy" ? exit - entry : entry - exit) * r(1000, 10000);
    const durationMins = Math.floor(r(15, 4320));
    const closedAt = new Date(Date.now() - r(86400000, 86400000 * 30));
    const openedAt = new Date(closedAt.getTime() - durationMins * 60000);
    return {
      external_trade_id: `mock-closed-${account.id.slice(0, 8)}-${i}`,
      asset, direction: dir,
      lot_size: Math.round(r(0.01, 2) * 100) / 100,
      entry_price: Math.round(entry * 100000) / 100000,
      exit_price: Math.round(exit * 100000) / 100000,
      stop_loss: Math.round((entry * (dir === "buy" ? 0.995 : 1.005)) * 100000) / 100000,
      take_profit: Math.round((entry * (dir === "buy" ? 1.01 : 0.99)) * 100000) / 100000,
      profit_loss: Math.round(pnl * 100) / 100,
      opened_at: openedAt.toISOString(),
      closed_at: closedAt.toISOString(),
      duration_minutes: durationMins,
    };
  });

  return {
    overview: {
      balance: Math.round(balance * 100) / 100,
      equity: Math.round((balance + floatingPnl) * 100) / 100,
      profit_loss: Math.round(floatingPnl * 100) / 100,
      drawdown: Math.round(r(0.5, 8) * 100) / 100,
      daily_pnl: Math.round(r(-300, 500) * 100) / 100,
      weekly_pnl: Math.round(r(-800, 1500) * 100) / 100,
      open_positions_count: openPositions.length,
    },
    openPositions,
    closedTrades,
  };
}

// ========== PROVIDER ROUTER ==========
async function fetchAccountData(account: any): Promise<ProviderAccountData> {
  const providerType = account.provider_type || "mock";

  switch (providerType) {
    case "metaapi":
      if (!account.provider_account_id) {
        throw new Error("Account MetaApi non configurato (provider_account_id mancante)");
      }
      return await fetchMetaApiData(account.provider_account_id);
    case "mock":
      return generateMockData(account);
    default:
      throw new Error(`Provider sconosciuto: ${providerType}`);
  }
}

// ========== SYNC LOGIC ==========
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, account_id } = body;

    // === CONNECT (MetaApi provisioning) ===
    if (action === "connect_metaapi") {
      const { data: account } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("id", account_id)
        .eq("user_id", user.id)
        .single();

      if (!account) {
        return new Response(JSON.stringify({ error: "Conto non trovato" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        console.log("[connect_metaapi] Starting for account_id:", account_id);

        await supabase.from("trading_accounts").update({
          connection_status: "syncing",
          sync_status: "running",
        }).eq("id", account_id);

        // 1. Create MetaApi account
        console.log("[connect_metaapi] Step 1: Creating MetaApi account...");
        const metaAccountId = await createMetaApiAccount(account);
        console.log("[connect_metaapi] Step 1 done. MetaApi ID:", metaAccountId);

        // 2. Save provider_account_id immediately
        console.log("[connect_metaapi] Step 2: Saving provider_account_id...");
        const { error: updateError } = await supabase.from("trading_accounts").update({
          provider_account_id: metaAccountId,
          provider_type: "metaapi",
        }).eq("id", account_id);
        if (updateError) {
          console.error("[connect_metaapi] Step 2 FAILED:", updateError);
          throw new Error(`Errore salvataggio provider_account_id: ${updateError.message}`);
        }
        console.log("[connect_metaapi] Step 2 done.");

        // 3. Deploy the account
        console.log("[connect_metaapi] Step 3: Deploying...");
        await deployMetaApiAccount(metaAccountId);
        console.log("[connect_metaapi] Step 3 done.");

        // 4. Wait for connection
        console.log("[connect_metaapi] Step 4: Waiting for connection...");
        await waitForConnection(metaAccountId);
        console.log("[connect_metaapi] Step 4 done. Connected!");

        // 5. Mark connected
        await supabase.from("trading_accounts").update({
          connection_status: "connected",
          sync_status: "idle",
          last_sync_error: null,
        }).eq("id", account_id);

        return new Response(JSON.stringify({
          success: true,
          status: "connected",
          provider_account_id: metaAccountId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (err) {
        console.error("[connect_metaapi] FAILED:", err.message);
        await supabase.from("trading_accounts").update({
          connection_status: "failed",
          sync_status: "error",
          last_sync_error: err.message,
        }).eq("id", account_id);

        return new Response(JSON.stringify({ success: false, error: err.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // === TEST CONNECTION ===
    if (action === "test_connection") {
      const { data: account } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("id", account_id)
        .eq("user_id", user.id)
        .single();

      if (!account) {
        return new Response(JSON.stringify({ error: "Conto non trovato" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        await supabase.from("trading_accounts").update({
          connection_status: "syncing",
          sync_status: "running",
        }).eq("id", account_id);

        await fetchAccountData(account);

        await supabase.from("trading_accounts").update({
          connection_status: "connected",
          sync_status: "idle",
          last_sync_error: null,
        }).eq("id", account_id);

        return new Response(JSON.stringify({ success: true, status: "connected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        await supabase.from("trading_accounts").update({
          connection_status: "failed",
          sync_status: "error",
          last_sync_error: err.message,
        }).eq("id", account_id);

        return new Response(JSON.stringify({ success: false, error: err.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // === FULL SYNC ===
    if (action === "sync") {
      const { data: account } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("id", account_id)
        .eq("user_id", user.id)
        .single();

      if (!account) {
        return new Response(JSON.stringify({ error: "Conto non trovato" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (account.sync_status === "running") {
        return new Response(JSON.stringify({ error: "Sincronizzazione già in corso" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: syncLog } = await supabase.from("account_sync_logs").insert({
        account_id,
        user_id: user.id,
        sync_type: body.sync_type || "manual",
        status: "running",
      }).select().single();

      await supabase.from("trading_accounts").update({
        sync_status: "running",
        connection_status: "syncing",
      }).eq("id", account_id);

      try {
        const data = await fetchAccountData(account);

        // Update account overview
        await supabase.from("trading_accounts").update({
          balance: data.overview.balance,
          equity: data.overview.equity,
          profit_loss: data.overview.profit_loss,
          drawdown: data.overview.drawdown,
          daily_pnl: data.overview.daily_pnl,
          weekly_pnl: data.overview.weekly_pnl,
          open_positions_count: data.overview.open_positions_count,
          connection_status: "connected",
          sync_status: "idle",
          last_sync_at: new Date().toISOString(),
          last_successful_sync_at: new Date().toISOString(),
          last_sync_error: null,
        }).eq("id", account_id);

        // Calculate metrics
        const closedTrades = data.closedTrades;
        if (closedTrades.length > 0) {
          const wins = closedTrades.filter(t => t.profit_loss > 0);
          const losses = closedTrades.filter(t => t.profit_loss < 0);
          const grossProfit = wins.reduce((s, t) => s + t.profit_loss, 0);
          const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profit_loss, 0));
          const winRate = (wins.length / closedTrades.length) * 100;
          const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.99 : 0;

          await supabase.from("trading_accounts").update({
            win_rate: Math.round(winRate * 100) / 100,
            profit_factor: Math.round(profitFactor * 100) / 100,
          }).eq("id", account_id);
        }

        // Upsert open positions
        await supabase.from("account_trade_history")
          .delete()
          .eq("account_id", account_id)
          .eq("status", "open");

        if (data.openPositions.length > 0) {
          await supabase.from("account_trade_history").insert(
            data.openPositions.map(p => ({
              account_id,
              user_id: user.id,
              asset: p.asset,
              direction: p.direction,
              lot_size: p.lot_size,
              entry_price: p.entry_price,
              stop_loss: p.stop_loss,
              take_profit: p.take_profit,
              profit_loss: p.profit_loss,
              status: "open",
              opened_at: p.opened_at,
              external_trade_id: p.external_trade_id,
            }))
          );
        }

        // Upsert closed trades (deduplicate by external_trade_id)
        let tradesSynced = 0;
        for (const trade of data.closedTrades) {
          const { data: existing } = await supabase
            .from("account_trade_history")
            .select("id")
            .eq("account_id", account_id)
            .eq("external_trade_id", trade.external_trade_id)
            .maybeSingle();

          if (!existing) {
            await supabase.from("account_trade_history").insert({
              account_id,
              user_id: user.id,
              asset: trade.asset,
              direction: trade.direction,
              lot_size: trade.lot_size,
              entry_price: trade.entry_price,
              exit_price: trade.exit_price,
              stop_loss: trade.stop_loss,
              take_profit: trade.take_profit,
              profit_loss: trade.profit_loss,
              status: "closed",
              opened_at: trade.opened_at,
              closed_at: trade.closed_at,
              duration_minutes: trade.duration_minutes,
              external_trade_id: trade.external_trade_id,
            });
            tradesSynced++;
          }
        }

        if (syncLog) {
          await supabase.from("account_sync_logs").update({
            status: "completed",
            completed_at: new Date().toISOString(),
            trades_synced: tradesSynced,
          }).eq("id", syncLog.id);
        }

        return new Response(JSON.stringify({
          success: true,
          trades_synced: tradesSynced,
          open_positions: data.openPositions.length,
          overview: data.overview,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (err) {
        await supabase.from("trading_accounts").update({
          sync_status: "error",
          connection_status: "failed",
          last_sync_error: err.message,
        }).eq("id", account_id);

        if (syncLog) {
          await supabase.from("account_sync_logs").update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: err.message,
          }).eq("id", syncLog.id);
        }

        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // === DELETE ACCOUNT ===
    if (action === "delete_account") {
      const { data: account } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("id", account_id)
        .eq("user_id", user.id)
        .single();

      if (!account) {
        return new Response(JSON.stringify({ error: "Conto non trovato" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let metaapiCleanupError: string | null = null;

      // 1. Try to remove MetaApi account if connected
      if (account.provider_type === "metaapi" && account.provider_account_id) {
        try {
          console.log("[delete_account] Removing MetaApi account:", account.provider_account_id);
          // First undeploy, then delete
          try {
            await metaapiRequest(`/users/current/accounts/${account.provider_account_id}/undeploy`, {
              method: "POST",
            });
            console.log("[delete_account] MetaApi account undeployed");
            // Wait a moment for undeploy to process
            await new Promise((r) => setTimeout(r, 2000));
          } catch (undeployErr) {
            console.warn("[delete_account] Undeploy warning (may already be undeployed):", undeployErr.message);
          }

          await metaapiRequest(`/users/current/accounts/${account.provider_account_id}`, {
            method: "DELETE",
          });
          console.log("[delete_account] MetaApi account deleted successfully");
        } catch (metaErr) {
          metaapiCleanupError = metaErr.message;
          console.error("[delete_account] MetaApi cleanup error (proceeding with local delete):", metaErr.message);
        }
      }

      // 2. Delete related data in order (journal entries, trade history, sync logs, then account)
      console.log("[delete_account] Deleting related data for account:", account_id);

      const { error: journalErr } = await supabase
        .from("trade_journal_entries")
        .delete()
        .eq("account_id", account_id);
      if (journalErr) console.warn("[delete_account] Journal delete warning:", journalErr.message);

      const { error: tradesErr } = await supabase
        .from("account_trade_history")
        .delete()
        .eq("account_id", account_id);
      if (tradesErr) console.warn("[delete_account] Trades delete warning:", tradesErr.message);

      const { error: logsErr } = await supabase
        .from("account_sync_logs")
        .delete()
        .eq("account_id", account_id);
      if (logsErr) console.warn("[delete_account] Sync logs delete warning:", logsErr.message);

      // 3. Delete the account itself
      const { error: accountErr } = await supabase
        .from("trading_accounts")
        .delete()
        .eq("id", account_id);

      if (accountErr) {
        return new Response(JSON.stringify({ success: false, error: `Errore eliminazione conto: ${accountErr.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[delete_account] Account deleted successfully:", account_id);

      return new Response(JSON.stringify({
        success: true,
        metaapi_cleanup: metaapiCleanupError ? "partial" : "complete",
        metaapi_error: metaapiCleanupError,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Azione non valida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
