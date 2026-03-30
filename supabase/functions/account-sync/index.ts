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
    win_rate?: number;
    profit_factor?: number;
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
  debug?: {
    history: {
      dealTypeCounts: Record<string, number>;
      filteredDeals: number;
      mappedClosedTrades: SimplifiedClosedTradeDebug[];
      providerCloseDealsCount: number;
      rawDeals: SimplifiedMetaApiDeal[];
      rawDealsCount: number;
    };
  };
}

type SimplifiedMetaApiDeal = {
  entryType: string | null;
  id: string | null;
  orderId: string | null;
  positionId: string | null;
  profit: number;
  symbol: string | null;
  time: string | null;
  type: string | null;
};

type SimplifiedClosedTradeDebug = {
  close_time: string;
  direction: string;
  external_trade_id: string;
  open_time: string;
  profit: number;
  status: "closed";
  symbol: string;
};

type TradeWriteDecision = SimplifiedClosedTradeDebug & {
  action: "deduplicated" | "ignored" | "inserted" | "unchanged" | "updated";
  changed_fields?: string[];
  reason?: string;
};

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

type HistorySyncWindow = {
  bufferMinutes: number;
  endTime: string;
  mode: "incremental" | "initial_lookback";
  startTime: string;
};

type ClosedTradeMetricSource = {
  asset: string;
  closed_at: string;
  duration_minutes: number | null;
  profit_loss: number;
};

const INITIAL_HISTORY_LOOKBACK_DAYS = 90;
const HISTORY_SYNC_BUFFER_MINUTES = 15;
const RECONCILIATION_LOOKBACK_HOURS = 48;
const RECONCILIATION_MAX_RETRIES = 20;
const MS_IN_DAY = 86400000;
const MS_IN_MINUTE = 60000;
const MS_IN_HOUR = 3600000;

// ========== PENDING CLOSURE TYPES ==========
interface PendingClosure {
  external_trade_id: string;
  asset: string;
  direction: string;
  lot_size: number;
  entry_price: number;
  opened_at: string;
  disappeared_at: string;
  retries: number;
  position_id_hint?: string; // raw MetaApi positionId for targeted search
}

function extractPositionIdFromExternalTradeId(externalTradeId: string): string | null {
  // external_trade_id format: "metaapi-pos-{positionId}" or "metaapi-deal-{positionId}"
  const match = externalTradeId.match(/metaapi-(?:pos|deal)-(.+)/);
  return match ? match[1] : null;
}

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

function roundTo2(value: number) {
  return Math.round(value * 100) / 100;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeEntryType(deal: any): string {
  return deal?.entryType || deal?.entry || "unknown";
}

function summarizeMetaApiDeal(deal: any): SimplifiedMetaApiDeal {
  return {
    entryType: deal?.entryType ?? deal?.entry ?? null,
    id: deal?.id != null ? String(deal.id) : null,
    orderId: deal?.orderId != null ? String(deal.orderId) : null,
    positionId: deal?.positionId != null ? String(deal.positionId) : null,
    profit: roundTo2(Number(deal?.profit || 0)),
    symbol: deal?.symbol ?? null,
    time: deal?.time ?? null,
    type: deal?.type ?? null,
  };
}

function summarizeClosedTradeDebug(trade: ProviderAccountData["closedTrades"][number]): SimplifiedClosedTradeDebug {
  return {
    close_time: trade.closed_at,
    direction: trade.direction,
    external_trade_id: trade.external_trade_id,
    open_time: trade.opened_at,
    profit: roundTo2(Number(trade.profit_loss || 0)),
    status: "closed",
    symbol: trade.asset,
  };
}

function getChangedFields(existing: any, incoming: any) {
  const comparableFields = [
    "asset",
    "direction",
    "lot_size",
    "entry_price",
    "exit_price",
    "stop_loss",
    "take_profit",
    "profit_loss",
    "status",
    "opened_at",
    "closed_at",
    "duration_minutes",
  ];

  return comparableFields.filter((field) => {
    const currentValue = existing?.[field] ?? null;
    const incomingValue = incoming?.[field] ?? null;
    return currentValue !== incomingValue;
  });
}

function logTradeWriteDecision(decision: TradeWriteDecision) {
  console.log(
    `[Sync:DB:Write] action=${decision.action} external_trade_id=${decision.external_trade_id} status=${decision.status} open_time=${decision.open_time} close_time=${decision.close_time} profit=${decision.profit} symbol=${decision.symbol} direction=${decision.direction}${decision.reason ? ` reason=${decision.reason}` : ""}${decision.changed_fields?.length ? ` changed_fields=${decision.changed_fields.join(",")}` : ""}`,
  );
}

function buildHistorySyncWindow(lastSuccessfulSyncAt?: string | null): HistorySyncWindow {
  const now = new Date();
  const fallbackStart = new Date(now.getTime() - INITIAL_HISTORY_LOOKBACK_DAYS * MS_IN_DAY);

  if (!lastSuccessfulSyncAt) {
    return {
      bufferMinutes: HISTORY_SYNC_BUFFER_MINUTES,
      endTime: now.toISOString(),
      mode: "initial_lookback",
      startTime: fallbackStart.toISOString(),
    };
  }

  const parsedLastSuccessfulSync = new Date(lastSuccessfulSyncAt);
  if (Number.isNaN(parsedLastSuccessfulSync.getTime())) {
    console.warn(`[Sync:History] Invalid last_successful_sync_at=${lastSuccessfulSyncAt}, falling back to ${INITIAL_HISTORY_LOOKBACK_DAYS}d lookback`);
    return {
      bufferMinutes: HISTORY_SYNC_BUFFER_MINUTES,
      endTime: now.toISOString(),
      mode: "initial_lookback",
      startTime: fallbackStart.toISOString(),
    };
  }

  const startTime = new Date(parsedLastSuccessfulSync.getTime() - HISTORY_SYNC_BUFFER_MINUTES * MS_IN_MINUTE);
  return {
    bufferMinutes: HISTORY_SYNC_BUFFER_MINUTES,
    endTime: now.toISOString(),
    mode: "incremental",
    startTime: (startTime.getTime() > now.getTime() ? now : startTime).toISOString(),
  };
}

function calculateClosedTradeMetrics(closedTrades: ClosedTradeMetricSource[], floatingPnl: number, balance: number, equity: number) {
  const wins = closedTrades.filter((trade) => trade.profit_loss > 0);
  const losses = closedTrades.filter((trade) => trade.profit_loss < 0);
  const totalPnl = closedTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const avgPnl = closedTrades.length > 0 ? totalPnl / closedTrades.length : 0;
  const grossProfit = wins.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit_loss, 0));
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.99 : 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dailyPnl = closedTrades
    .filter((trade) => new Date(trade.closed_at) >= todayStart)
    .reduce((sum, trade) => sum + trade.profit_loss, 0) + floatingPnl;

  const weekStart = new Date();
  const dayOfWeek = weekStart.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weeklyPnl = closedTrades
    .filter((trade) => new Date(trade.closed_at) >= weekStart)
    .reduce((sum, trade) => sum + trade.profit_loss, 0) + floatingPnl;

  let drawdown = 0;
  if (balance > 0 && equity < balance) {
    drawdown = ((balance - equity) / balance) * 100;
  }

  const bestTrade = closedTrades.reduce<ClosedTradeMetricSource | null>((best, trade) => {
    if (!best || trade.profit_loss > best.profit_loss) return trade;
    return best;
  }, null);

  const worstTrade = closedTrades.reduce<ClosedTradeMetricSource | null>((worst, trade) => {
    if (!worst || trade.profit_loss < worst.profit_loss) return trade;
    return worst;
  }, null);

  return {
    avgPnl: roundTo2(avgPnl),
    bestTrade,
    dailyPnl: roundTo2(dailyPnl),
    drawdown: roundTo2(drawdown),
    grossLoss: roundTo2(grossLoss),
    grossProfit: roundTo2(grossProfit),
    profitFactor: roundTo2(profitFactor),
    totalPnl: roundTo2(totalPnl),
    weeklyPnl: roundTo2(weeklyPnl),
    winRate: roundTo2(winRate),
    wins: wins.length,
    losses: losses.length,
    worstTrade,
  };
}

async function recalculateAccountOverviewFromDatabase(
  supabase: any,
  accountId: string,
  liveOverview: ProviderAccountData["overview"],
) {
  const { data: closedTradesRows, error } = await supabase
    .from("account_trade_history")
    .select("asset, closed_at, duration_minutes, profit_loss")
    .eq("account_id", accountId)
    .eq("status", "closed");

  if (error) {
    throw new Error(`Errore lettura storico chiuso per metriche: ${error.message}`);
  }

  const typedClosedTradesRows = (closedTradesRows ?? []) as Array<{
    asset: string;
    closed_at: string | null;
    duration_minutes: number | null;
    profit_loss: number | null;
  }>;

  const closedTrades = typedClosedTradesRows.filter((trade) => !!trade.closed_at).map((trade) => ({
    asset: trade.asset,
    closed_at: trade.closed_at as string,
    duration_minutes: trade.duration_minutes,
    profit_loss: Number(trade.profit_loss || 0),
  }));

  const metrics = calculateClosedTradeMetrics(
    closedTrades,
    Number(liveOverview.profit_loss || 0),
    Number(liveOverview.balance || 0),
    Number(liveOverview.equity || 0),
  );

  console.log(
    `[Sync:Metrics] Recalculated from DB: closedTrades=${closedTrades.length} wins=${metrics.wins} losses=${metrics.losses} totalPnl=${metrics.totalPnl.toFixed(2)} avgPnl=${metrics.avgPnl.toFixed(2)} winRate=${metrics.winRate.toFixed(2)}% profitFactor=${metrics.profitFactor.toFixed(2)} dailyPnl=${metrics.dailyPnl.toFixed(2)} weeklyPnl=${metrics.weeklyPnl.toFixed(2)} bestTrade=${metrics.bestTrade ? `${metrics.bestTrade.asset}:${metrics.bestTrade.profit_loss.toFixed(2)}` : "n/a"} worstTrade=${metrics.worstTrade ? `${metrics.worstTrade.asset}:${metrics.worstTrade.profit_loss.toFixed(2)}` : "n/a"}`,
  );

  return {
    overview: {
      balance: roundTo2(Number(liveOverview.balance || 0)),
      daily_pnl: metrics.dailyPnl,
      drawdown: metrics.drawdown,
      equity: roundTo2(Number(liveOverview.equity || 0)),
      open_positions_count: Number(liveOverview.open_positions_count || 0),
      profit_factor: metrics.profitFactor,
      profit_loss: roundTo2(Number(liveOverview.profit_loss || 0)),
      weekly_pnl: metrics.weeklyPnl,
      win_rate: metrics.winRate,
    },
    summary: metrics,
  };
}

function shouldUpdateClosedTradeRecord(existing: any, incoming: any) {
  return getChangedFields(existing, incoming).length > 0;
}

// ========== RECONCILIATION: WIDER HISTORY SEARCH ==========
async function reconcilePendingClosures(
  metaAccountId: string,
  pendingClosures: PendingClosure[],
  supabase: any,
  accountId: string,
  userId: string,
): Promise<{ resolved: PendingClosure[]; stillPending: PendingClosure[]; newClosedTrades: ProviderAccountData["closedTrades"] }> {
  if (pendingClosures.length === 0) {
    return { resolved: [], stillPending: [], newClosedTrades: [] };
  }

  console.log(`[Reconciliation] Processing ${pendingClosures.length} pending closures`);

  // Fetch wider history window (48h back)
  const now = new Date();
  const wideStart = new Date(now.getTime() - RECONCILIATION_LOOKBACK_HOURS * MS_IN_HOUR);
  console.log(`[Reconciliation] Wide history search: start=${wideStart.toISOString()} end=${now.toISOString()} (${RECONCILIATION_LOOKBACK_HOURS}h window)`);

  let wideDeals: any[] = [];
  try {
    const wideResponse = await metaapiClientRequest(
      metaAccountId,
      `/history-deals/time/${wideStart.toISOString()}/${now.toISOString()}`
    );
    if (Array.isArray(wideResponse)) {
      wideDeals = wideResponse;
    } else if (wideResponse && Array.isArray(wideResponse.deals)) {
      wideDeals = wideResponse.deals;
    }
    console.log(`[Reconciliation] Wide history returned ${wideDeals.length} raw deals`);
  } catch (err) {
    console.error(`[Reconciliation] Wide history fetch failed: ${getErrorMessage(err)}`);
    // Return all as still pending
    return {
      resolved: [],
      stillPending: pendingClosures.map(pc => ({ ...pc, retries: pc.retries + 1 })),
      newClosedTrades: [],
    };
  }

  // Build positionId -> deals map from wide history
  const dealsByPosition: Record<string, any[]> = {};
  for (const deal of wideDeals) {
    if (deal.type === "DEAL_TYPE_BALANCE" || deal.type === "DEAL_TYPE_CREDIT" ||
        deal.type === "DEAL_TYPE_BONUS" || deal.type === "DEAL_TYPE_CORRECTION") {
      continue;
    }
    const posId = deal.positionId || deal.id;
    if (!dealsByPosition[posId]) dealsByPosition[posId] = [];
    dealsByPosition[posId].push(deal);
  }

  const resolved: PendingClosure[] = [];
  const stillPending: PendingClosure[] = [];
  const newClosedTrades: ProviderAccountData["closedTrades"] = [];

  for (const pending of pendingClosures) {
    const positionId = pending.position_id_hint || extractPositionIdFromExternalTradeId(pending.external_trade_id);
    console.log(`[Reconciliation] Searching close deal for ${pending.external_trade_id} positionId=${positionId ?? "unknown"} asset=${pending.asset} retries=${pending.retries}`);

    if (!positionId || !dealsByPosition[positionId]) {
      // Not found - check retry limit
      if (pending.retries >= RECONCILIATION_MAX_RETRIES) {
        console.warn(`[Reconciliation] GIVING UP on ${pending.external_trade_id} after ${pending.retries} retries`);
        resolved.push(pending); // remove from queue
      } else {
        console.log(`[Reconciliation] NOT FOUND yet: ${pending.external_trade_id} (retry ${pending.retries + 1}/${RECONCILIATION_MAX_RETRIES})`);
        stillPending.push({ ...pending, retries: pending.retries + 1 });
      }
      continue;
    }

    // Found deals for this positionId - try to build closed trade
    const posDeals = dealsByPosition[positionId];
    const sortedDeals = [...posDeals].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const entryDeals = sortedDeals.filter((d) => normalizeEntryType(d) === "DEAL_ENTRY_IN");
    const exitDeals = sortedDeals.filter((d) => normalizeEntryType(d) === "DEAL_ENTRY_OUT");

    if (exitDeals.length > 0) {
      // Found the close deal!
      const entry = entryDeals.length > 0 ? entryDeals[0] : null;
      const exit = exitDeals[exitDeals.length - 1];
      const openTime = entry ? new Date(entry.time) : new Date(pending.opened_at);
      const closeTime = new Date(exit.time);
      const durationMins = Math.round((closeTime.getTime() - openTime.getTime()) / 60000);
      const pnl = exitDeals.reduce((sum: number, d: any) => sum + (d.profit || 0) + (d.swap || 0) + (d.commission || 0), 0);

      const closedTrade = {
        external_trade_id: `metaapi-deal-${positionId}`,
        asset: exit.symbol || pending.asset,
        direction: entry ? (entry.type === "DEAL_TYPE_BUY" ? "buy" : "sell") : pending.direction,
        lot_size: entry?.volume || exit.volume || pending.lot_size,
        entry_price: entry?.price || pending.entry_price,
        exit_price: exit.price || 0,
        stop_loss: null,
        take_profit: null,
        profit_loss: roundTo2(pnl),
        opened_at: openTime.toISOString(),
        closed_at: closeTime.toISOString(),
        duration_minutes: Math.max(durationMins, 0),
      };

      console.log(`[Reconciliation] ✅ FOUND close deal for ${pending.external_trade_id} -> profit=${closedTrade.profit_loss} closed_at=${closedTrade.closed_at}`);
      newClosedTrades.push(closedTrade);
      resolved.push(pending);
    } else {
      // Has entry deals but no exit yet
      if (pending.retries >= RECONCILIATION_MAX_RETRIES) {
        console.warn(`[Reconciliation] GIVING UP on ${pending.external_trade_id} after ${pending.retries} retries (entry found but no exit)`);
        resolved.push(pending);
      } else {
        console.log(`[Reconciliation] Entry found but no exit yet for ${pending.external_trade_id} (retry ${pending.retries + 1}/${RECONCILIATION_MAX_RETRIES})`);
        stillPending.push({ ...pending, retries: pending.retries + 1 });
      }
    }
  }

  console.log(`[Reconciliation] Summary: resolved=${resolved.length} stillPending=${stillPending.length} newClosedTrades=${newClosedTrades.length}`);
  return { resolved, stillPending, newClosedTrades };
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

// ========== BROKER → PROVISIONING PROFILE MAPPING ==========
function resolveProvisioningProfileId(brokerName: string): { profileId: string | null; source: string } {
  const normalizedBroker = (brokerName || "").trim().toLowerCase();

  // Broker-specific secrets mapping
  const brokerSecretMap: Record<string, string> = {
    tmgm: "METAAPI_PROVISIONING_PROFILE_ID",            // existing secret, backwards compatible
    fundedelite: "METAAPI_PROVISIONING_PROFILE_ID_FUNDEDELITE",
  };

  // Try broker-specific secret first
  const secretName = brokerSecretMap[normalizedBroker];
  if (secretName) {
    const profileId = Deno.env.get(secretName);
    if (profileId) {
      console.log(`[MetaApi:Profile] Broker "${brokerName}" → secret "${secretName}" → profileId found`);
      return { profileId, source: `broker-specific:${secretName}` };
    }
    console.warn(`[MetaApi:Profile] Broker "${brokerName}" → secret "${secretName}" NOT SET or empty`);
  }

  // Fallback: global provisioning profile
  const globalProfile = Deno.env.get("METAAPI_PROVISIONING_PROFILE_ID");
  if (globalProfile) {
    console.log(`[MetaApi:Profile] Broker "${brokerName}" → using GLOBAL fallback profile`);
    return { profileId: globalProfile, source: "global-fallback" };
  }

  // No profile at all
  console.warn(`[MetaApi:Profile] Broker "${brokerName}" → NO provisioning profile available (no broker-specific, no global)`);
  return { profileId: null, source: "none" };
}

// Deploy a MetaApi account and wait for it to connect
async function createMetaApiAccount(account: any): Promise<string> {
  const token = Deno.env.get("METAAPI_TOKEN");
  if (!token) throw new Error("METAAPI_TOKEN non configurato");

  // Configurable reliability: defaults to "regular" to avoid 403 on demo/test accounts
  const reliability = Deno.env.get("METAAPI_RELIABILITY_DEFAULT") || "regular";

  // Resolve provisioning profile based on broker
  const brokerName = account.broker || "";
  const { profileId, source } = resolveProvisioningProfileId(brokerName);
  console.log(`[MetaApi] Creating account: broker="${brokerName}" reliability="${reliability}" provisioningProfile=${profileId || "none"} source="${source}"`);

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
  if (profileId) {
    payload.provisioningProfileId = profileId;
  }

  console.log("[MetaApi] Creating account with payload:", JSON.stringify({ ...payload, password: "***" }));

  const result = await metaapiRequest("/users/current/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("[MetaApi] Account created, id:", result.id, "broker:", brokerName, "profileSource:", source);
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
interface ConnectionResult {
  connected: boolean;
  state: string;
  connectionStatus: string;
  providerError?: string;
  replicaStates?: any[];
  elapsedMs: number;
  lastPollDetail: string;
}

async function waitForConnection(metaAccountId: string, maxWaitMs = 90000): Promise<ConnectionResult> {
  const start = Date.now();
  let lastInfo: any = null;
  let pollCount = 0;

  while (Date.now() - start < maxWaitMs) {
    pollCount++;
    const info = await metaapiRequest(`/users/current/accounts/${metaAccountId}`);
    lastInfo = info;

    const state = info.state || "UNKNOWN";
    const connStatus = info.connectionStatus || "UNKNOWN";
    const providerError = info.providerError || null;
    const replicaStates = info.accountReplicas || info.replicaStates || null;

    console.log(`[waitForConnection] Poll #${pollCount} state=${state} connectionStatus=${connStatus} providerError=${providerError || "none"} replicaStates=${replicaStates ? JSON.stringify(replicaStates) : "none"} elapsed=${Date.now() - start}ms`);

    if (state === "DEPLOYED" && connStatus === "CONNECTED") {
      return {
        connected: true,
        state,
        connectionStatus: connStatus,
        elapsedMs: Date.now() - start,
        lastPollDetail: `Connected after ${pollCount} polls`,
      };
    }

    if (state === "DEPLOY_FAILED") {
      const detail = providerError || connStatus || "stato sconosciuto";
      console.error(`[waitForConnection] DEPLOY_FAILED: ${detail}`);
      throw new Error(`Deploy fallito: ${detail}`);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  // Timeout reached — return intermediate state instead of throwing
  const finalState = lastInfo?.state || "UNKNOWN";
  const finalConnStatus = lastInfo?.connectionStatus || "UNKNOWN";
  const finalProviderError = lastInfo?.providerError || null;
  const finalReplicas = lastInfo?.accountReplicas || lastInfo?.replicaStates || null;

  console.warn(`[waitForConnection] TIMEOUT after ${Date.now() - start}ms (${pollCount} polls). state=${finalState} connectionStatus=${finalConnStatus} providerError=${finalProviderError || "none"} replicaStates=${finalReplicas ? JSON.stringify(finalReplicas) : "none"}`);

  return {
    connected: false,
    state: finalState,
    connectionStatus: finalConnStatus,
    providerError: finalProviderError || undefined,
    replicaStates: finalReplicas || undefined,
    elapsedMs: Date.now() - start,
    lastPollDetail: `Timeout after ${pollCount} polls. Last state: ${finalState}/${finalConnStatus}`,
  };
}

// Fetch account data from MetaApi
async function fetchMetaApiData(metaAccountId: string, historyWindow?: HistorySyncWindow): Promise<ProviderAccountData> {
  // 1. Get account information (balance, equity, etc.)
  console.log("[Sync:AccountInfo] Fetching account-information...");
  const accountInfo = await metaapiClientRequest(metaAccountId, "/account-information");
  console.log(`[Sync:AccountInfo] Raw data: balance=${accountInfo?.balance} equity=${accountInfo?.equity} margin=${accountInfo?.margin} freeMargin=${accountInfo?.freeMargin} marginLevel=${accountInfo?.marginLevel} leverage=${accountInfo?.leverage} currency=${accountInfo?.currency}`);

  // 2. Get open positions
  console.log("[Sync:Positions] Fetching positions...");
  const positions = await metaapiClientRequest(metaAccountId, "/positions");
  const positionsArr = Array.isArray(positions) ? positions : [];
  console.log(`[Sync:Positions] Received ${positionsArr.length} open positions`);

  // 3. Get history deals using incremental window + safety buffer
  const resolvedHistoryWindow = historyWindow ?? buildHistorySyncWindow(null);
  const { startTime, endTime } = resolvedHistoryWindow;
  console.log(
    `[Sync:History] Fetching history-deals with range start=${startTime} end=${endTime} mode=${resolvedHistoryWindow.mode} bufferMinutes=${resolvedHistoryWindow.bufferMinutes}`,
  );
  const historyResponse = await metaapiClientRequest(
    metaAccountId,
    `/history-deals/time/${startTime}/${endTime}`
  );

  // MetaApi may return plain array OR { deals: [...] } - handle both
  let dealsArr: any[] = [];
  if (Array.isArray(historyResponse)) {
    dealsArr = historyResponse;
  } else if (historyResponse && Array.isArray(historyResponse.deals)) {
    dealsArr = historyResponse.deals;
    console.log(`[Sync:History] Response was wrapped in { deals: [...] }, extracted ${dealsArr.length} deals`);
  } else if (historyResponse && typeof historyResponse === "object") {
    // Try to find any array property
    const arrayKeys = Object.keys(historyResponse).filter(k => Array.isArray(historyResponse[k]));
    if (arrayKeys.length > 0) {
      dealsArr = historyResponse[arrayKeys[0]];
      console.log(`[Sync:History] Response was wrapped in { ${arrayKeys[0]}: [...] }, extracted ${dealsArr.length} deals`);
    } else {
      console.warn(`[Sync:History] Unexpected response format: ${JSON.stringify(historyResponse).substring(0, 500)}`);
    }
  }
  console.log(`[Sync:History] Received ${dealsArr.length} raw deals`);

  const rawDealsDebug = dealsArr.map(summarizeMetaApiDeal);
  rawDealsDebug.forEach((deal, index) => {
    console.log(
      `[Sync:History:Deal] index=${index} id=${deal.id ?? "n/a"} positionId=${deal.positionId ?? "n/a"} orderId=${deal.orderId ?? "n/a"} profit=${deal.profit} time=${deal.time ?? "n/a"} type=${deal.type ?? "n/a"} entryType=${deal.entryType ?? "n/a"} symbol=${deal.symbol ?? "n/a"}`,
    );
  });

  // Log deal types for debugging
  const dealTypeCounts: Record<string, number> = {};
  for (const d of dealsArr) {
    const entryField = normalizeEntryType(d);
    const key = `${d.type || "unknown"}/${entryField}`;
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
    if (deal.type === "DEAL_TYPE_BALANCE" || deal.type === "DEAL_TYPE_CREDIT" ||
        deal.type === "DEAL_TYPE_BONUS" || deal.type === "DEAL_TYPE_CORRECTION") {
      filteredDeals++;
      continue;
    }
    const posId = deal.positionId || deal.id;
    if (!dealsByPosition[posId]) dealsByPosition[posId] = [];
    dealsByPosition[posId].push(deal);
  }
  console.log(`[Sync:History] Filtered out ${filteredDeals} balance/credit/bonus deals. Remaining positions to process: ${Object.keys(dealsByPosition).length}`);

  const closedTrades: ProviderAccountData["closedTrades"] = [];
  const mappedClosedTradesDebug: SimplifiedClosedTradeDebug[] = [];
  for (const [posId, deals] of Object.entries(dealsByPosition)) {
    const sortedDeals = [...deals].sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const entryDeals = sortedDeals.filter((d: any) => normalizeEntryType(d) === "DEAL_ENTRY_IN");
    const exitDeals = sortedDeals.filter((d: any) => normalizeEntryType(d) === "DEAL_ENTRY_OUT");

    if (entryDeals.length > 0 && exitDeals.length > 0) {
      // Standard case: both entry and exit deals present
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
      const tradeDebug = summarizeClosedTradeDebug(closedTrades[closedTrades.length - 1]);
      mappedClosedTradesDebug.push(tradeDebug);
      console.log(
        `[Sync:History:MappedTrade] external_trade_id=${tradeDebug.external_trade_id} status=${tradeDebug.status} open_time=${tradeDebug.open_time} close_time=${tradeDebug.close_time} profit=${tradeDebug.profit} symbol=${tradeDebug.symbol} direction=${tradeDebug.direction} source=entry+exit positionId=${posId}`,
      );
    } else if (exitDeals.length > 0 && entryDeals.length === 0) {
      // Exit-only case: entry deal may be outside the time window
      // Still save the trade using exit deal data
      const exit = exitDeals[exitDeals.length - 1];
      const closeTime = new Date(exit.time);
      // Use brokerTime or estimate opening from the first deal in this position
      const firstDeal = sortedDeals[0];
      const openTime = firstDeal !== exit ? new Date(firstDeal.time) : new Date(closeTime.getTime() - 60000);
      const durationMins = Math.round((closeTime.getTime() - openTime.getTime()) / 60000);
      const pnl = exitDeals.reduce((sum: number, d: any) => sum + (d.profit || 0) + (d.swap || 0) + (d.commission || 0), 0);

      console.log(`[Sync:History] Position ${posId}: exit-only trade (entry outside window). Using exit data. pnl=${pnl}`);
      closedTrades.push({
        external_trade_id: `metaapi-deal-${posId}`,
        asset: exit.symbol,
        direction: exit.type === "DEAL_TYPE_SELL" ? "buy" : "sell", // exit type is opposite
        lot_size: exit.volume || 0,
        entry_price: exit.price || 0, // best we have
        exit_price: exit.price || 0,
        stop_loss: null,
        take_profit: null,
        profit_loss: Math.round(pnl * 100) / 100,
        opened_at: openTime.toISOString(),
        closed_at: closeTime.toISOString(),
        duration_minutes: Math.max(durationMins, 0),
      });
      const tradeDebug = summarizeClosedTradeDebug(closedTrades[closedTrades.length - 1]);
      mappedClosedTradesDebug.push(tradeDebug);
      console.log(
        `[Sync:History:MappedTrade] external_trade_id=${tradeDebug.external_trade_id} status=${tradeDebug.status} open_time=${tradeDebug.open_time} close_time=${tradeDebug.close_time} profit=${tradeDebug.profit} symbol=${tradeDebug.symbol} direction=${tradeDebug.direction} source=exit-only positionId=${posId}`,
      );
    } else {
      // Entry-only means position is still open, or something unusual
      console.log(`[Sync:History] Position ${posId}: ${entryDeals.length} entries, ${exitDeals.length} exits, entryTypes=${sortedDeals.map((d: any) => normalizeEntryType(d)).join(",")} - skipped`);
    }
  }
  console.log(`[Sync:History] Processed ${closedTrades.length} closed trades from deals`);

  const provisionalMetrics = calculateClosedTradeMetrics(
    closedTrades.map((trade) => ({
      asset: trade.asset,
      closed_at: trade.closed_at,
      duration_minutes: trade.duration_minutes,
      profit_loss: trade.profit_loss,
    })),
    floatingPnl,
    balance,
    equity,
  );

  console.log(`[Sync:Metrics] Provider snapshot: winRate=${provisionalMetrics.winRate.toFixed(1)}% profitFactor=${provisionalMetrics.profitFactor.toFixed(2)} totalPnl=${provisionalMetrics.totalPnl.toFixed(2)} avgPnl=${provisionalMetrics.avgPnl.toFixed(2)} dailyPnl=${provisionalMetrics.dailyPnl.toFixed(2)} weeklyPnl=${provisionalMetrics.weeklyPnl.toFixed(2)} drawdown=${provisionalMetrics.drawdown.toFixed(2)}% floatingPnl=${floatingPnl.toFixed(2)} wins=${provisionalMetrics.wins} losses=${provisionalMetrics.losses} openPositions=${openPositions.length}`);

  return {
    overview: {
      balance: roundTo2(balance),
      equity: roundTo2(equity),
      profit_loss: roundTo2(floatingPnl),
      drawdown: provisionalMetrics.drawdown,
      daily_pnl: provisionalMetrics.dailyPnl,
      weekly_pnl: provisionalMetrics.weeklyPnl,
      open_positions_count: openPositions.length,
      win_rate: provisionalMetrics.winRate,
      profit_factor: provisionalMetrics.profitFactor,
    },
    debug: {
      history: {
        dealTypeCounts,
        filteredDeals,
        mappedClosedTrades: mappedClosedTradesDebug,
        providerCloseDealsCount: rawDealsDebug.filter((deal) => deal.entryType === "DEAL_ENTRY_OUT").length,
        rawDeals: rawDealsDebug,
        rawDealsCount: rawDealsDebug.length,
      },
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
async function fetchAccountData(account: any, historyWindow?: HistorySyncWindow): Promise<ProviderAccountData> {
  const providerType = account.provider_type || "mock";

  switch (providerType) {
    case "metaapi":
      if (!account.provider_account_id) {
        throw new Error("Account MetaApi non configurato (provider_account_id mancante)");
      }
      return await fetchMetaApiData(account.provider_account_id, historyWindow);
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
      // --- SERVER-SIDE ENFORCEMENT: account limit (TEMPORARILY DISABLED) ---
      // const { data: limitCheck } = await supabase.rpc("check_account_limit", { _user_id: user.id });
      // if (limitCheck && !limitCheck.can_connect) { ... }
      console.log(`[connect_metaapi] Account limit check SKIPPED (temporarily disabled)`);

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

      // --- SERVER-SIDE ENFORCEMENT: broker check ---
      const brokerName = account.broker || "";
      if (brokerName) {
        const { data: brokerAllowed } = await supabase.rpc("is_broker_allowed", {
          _user_id: user.id,
          _broker_name: brokerName,
        });
        if (brokerAllowed === false) {
          console.log(`[connect_metaapi] BLOCKED: broker "${brokerName}" not supported for user ${user.id}`);
          // Clean up the pending account record
          await supabase.from("trading_accounts").delete().eq("id", account_id);
          return new Response(JSON.stringify({
            error: `Il broker "${brokerName}" non è attualmente supportato. Richiedi il supporto per questo broker dall'Account Center.`,
            code: "BROKER_NOT_SUPPORTED",
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      try {
        console.log(`[connect_metaapi] Starting for account_id=${account_id} broker="${account.broker || "unknown"}" platform="${account.platform}" server="${account.server}"`);

        await supabase.from("trading_accounts").update({
          connection_status: "syncing",
          sync_status: "running",
        }).eq("id", account_id);

        // 1. Create MetaApi account (broker-aware provisioning profile selection)
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
        const errorMessage = getErrorMessage(err);
        console.error("[connect_metaapi] FAILED:", errorMessage);
        await supabase.from("trading_accounts").update({
          connection_status: "failed",
          sync_status: "error",
          last_sync_error: errorMessage,
        }).eq("id", account_id);

        return new Response(JSON.stringify({ success: false, error: errorMessage }), {
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
        const errorMessage = getErrorMessage(err);
        await supabase.from("trading_accounts").update({
          connection_status: "failed",
          sync_status: "error",
          last_sync_error: errorMessage,
        }).eq("id", account_id);

        return new Response(JSON.stringify({ success: false, error: errorMessage }), {
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

      const syncDebug: Record<string, unknown> = {
        account_id,
        account_provider_id: account.provider_account_id,
        action: "sync",
      };

      try {
        const historyWindow = buildHistorySyncWindow(account.last_successful_sync_at);
        syncDebug.history_window = {
          buffer_minutes: historyWindow.bufferMinutes,
          end_time: historyWindow.endTime,
          mode: historyWindow.mode,
          start_time: historyWindow.startTime,
        };
        console.log(
          `[Sync:History] Using time range start=${historyWindow.startTime} end=${historyWindow.endTime} mode=${historyWindow.mode} bufferMinutes=${historyWindow.bufferMinutes} lastSuccessfulSyncAt=${account.last_successful_sync_at ?? "none"}`,
        );

        const data = await fetchAccountData(account, historyWindow);
        syncDebug.provider = data.debug?.history ?? {
          dealTypeCounts: {},
          filteredDeals: 0,
          mappedClosedTrades: [],
          providerCloseDealsCount: 0,
          rawDeals: [],
          rawDealsCount: 0,
        };

        // ===== RECONCILIATION: Detect disappeared positions =====
        // 1. Snapshot previous open positions BEFORE deleting them
        const { data: previousOpenRows } = await supabase
          .from("account_trade_history")
          .select("external_trade_id, asset, direction, lot_size, entry_price, opened_at")
          .eq("account_id", account_id)
          .eq("status", "open");
        const previousOpenMap = new Map<string, any>();
        for (const row of previousOpenRows ?? []) {
          if (row.external_trade_id) previousOpenMap.set(row.external_trade_id, row);
        }
        console.log(`[Reconciliation] Previous open positions snapshot: ${previousOpenMap.size}`);

        // 2. Determine which positions disappeared
        const currentOpenIds = new Set(data.openPositions.map(p => p.external_trade_id));
        const closedByIncrementalIds = new Set(data.closedTrades.map(t => {
          // Map from metaapi-deal-{posId} back to metaapi-pos-{posId}
          const posId = extractPositionIdFromExternalTradeId(t.external_trade_id);
          return posId ? `metaapi-pos-${posId}` : null;
        }).filter(Boolean));

        const newDisappeared: PendingClosure[] = [];
        for (const [extId, row] of previousOpenMap.entries()) {
          if (!currentOpenIds.has(extId)) {
            // Position disappeared - check if incremental deals already captured it
            if (closedByIncrementalIds.has(extId)) {
              console.log(`[Reconciliation] Position ${extId} disappeared but already found in incremental deals - OK`);
              continue;
            }
            const posIdHint = extractPositionIdFromExternalTradeId(extId);
            // Also check if deal version already exists
            const dealExtId = posIdHint ? `metaapi-deal-${posIdHint}` : null;
            if (dealExtId && data.closedTrades.some(t => t.external_trade_id === dealExtId)) {
              console.log(`[Reconciliation] Position ${extId} disappeared and found as deal ${dealExtId} in incremental - OK`);
              continue;
            }
            console.log(`[Reconciliation] ⚠️ Position DISAPPEARED: ${extId} asset=${row.asset} direction=${row.direction} - queuing for reconciliation`);
            newDisappeared.push({
              external_trade_id: extId,
              asset: row.asset,
              direction: row.direction,
              lot_size: Number(row.lot_size || 0),
              entry_price: Number(row.entry_price || 0),
              opened_at: row.opened_at,
              disappeared_at: new Date().toISOString(),
              retries: 0,
              position_id_hint: posIdHint ?? undefined,
            });
          }
        }

        // 3. Load existing pending closures from account metadata
        const existingMetadata = (account.metadata && typeof account.metadata === "object") ? account.metadata as Record<string, unknown> : {};
        const existingPendingClosures: PendingClosure[] = Array.isArray(existingMetadata.pendingClosures) 
          ? existingMetadata.pendingClosures as PendingClosure[] 
          : [];
        
        // Merge new disappeared with existing pending (avoid duplicates by external_trade_id)
        const allPendingMap = new Map<string, PendingClosure>();
        for (const pc of existingPendingClosures) allPendingMap.set(pc.external_trade_id, pc);
        for (const pc of newDisappeared) {
          if (!allPendingMap.has(pc.external_trade_id)) allPendingMap.set(pc.external_trade_id, pc);
        }
        const allPendingClosures = Array.from(allPendingMap.values());
        console.log(`[Reconciliation] Total pending closures to process: ${allPendingClosures.length} (existing=${existingPendingClosures.length} new=${newDisappeared.length})`);

        // 4. Run reconciliation with wider history if needed
        let reconciliationResult = { resolved: [] as PendingClosure[], stillPending: [] as PendingClosure[], newClosedTrades: [] as ProviderAccountData["closedTrades"] };
        if (allPendingClosures.length > 0 && account.provider_type === "metaapi" && account.provider_account_id) {
          reconciliationResult = await reconcilePendingClosures(
            account.provider_account_id,
            allPendingClosures,
            supabase,
            account_id,
            user.id,
          );
          // Add reconciled trades to the closed trades list
          data.closedTrades.push(...reconciliationResult.newClosedTrades);
          console.log(`[Reconciliation] Added ${reconciliationResult.newClosedTrades.length} reconciled trades to closed trades list`);
        }

        syncDebug.reconciliation = {
          previous_open_count: previousOpenMap.size,
          current_open_count: data.openPositions.length,
          new_disappeared: newDisappeared.length,
          existing_pending: existingPendingClosures.length,
          resolved: reconciliationResult.resolved.length,
          still_pending: reconciliationResult.stillPending.length,
          reconciled_trades: reconciliationResult.newClosedTrades.length,
        };

        // Upsert open positions: delete old, insert new
        const { count: deletedOpen } = await supabase.from("account_trade_history")
          .delete({ count: "exact" })
          .eq("account_id", account_id)
          .eq("status", "open");
        console.log(`[Sync:DB] Deleted ${deletedOpen ?? 0} old open positions`);

        if (data.openPositions.length > 0) {
          const { error: posInsertErr } = await supabase.from("account_trade_history").insert(
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
          if (posInsertErr) console.error(`[Sync:DB] Open positions insert error: ${posInsertErr.message}`);
          else console.log(`[Sync:DB] Inserted ${data.openPositions.length} open positions`);
        }

        // Upsert closed trades (deduplicate by stable external_trade_id)
        const dedupedClosedTradesMap = new Map<string, ProviderAccountData["closedTrades"][number]>();
        const writeDecisions: TradeWriteDecision[] = [];
        for (const trade of data.closedTrades) {
          const tradeDebug = summarizeClosedTradeDebug(trade);
          const existingDedupedTrade = dedupedClosedTradesMap.get(trade.external_trade_id);
          if (existingDedupedTrade) {
            const decision: TradeWriteDecision = {
              ...tradeDebug,
              action: "deduplicated",
              reason: "duplicate external_trade_id in provider payload; keeping last mapped trade",
            };
            writeDecisions.push(decision);
            logTradeWriteDecision(decision);
          }
          dedupedClosedTradesMap.set(trade.external_trade_id, trade);
        }
        const dedupedClosedTrades = Array.from(dedupedClosedTradesMap.values());
        const closedTradeIds = dedupedClosedTrades.map((trade) => trade.external_trade_id);
        const existingClosedTrades = new Map<string, any>();

        if (closedTradeIds.length > 0) {
          const { data: existingRows, error: existingError } = await supabase
            .from("account_trade_history")
            .select("id, asset, direction, lot_size, entry_price, exit_price, stop_loss, take_profit, profit_loss, status, opened_at, closed_at, duration_minutes, external_trade_id")
            .eq("account_id", account_id)
            .in("external_trade_id", closedTradeIds);

          if (existingError) {
            throw new Error(`Errore lettura trade esistenti per deduplica: ${existingError.message}`);
          }

          for (const row of existingRows ?? []) {
            if (row.external_trade_id) {
              existingClosedTrades.set(row.external_trade_id, row);
            }
          }
        }

        let tradesInserted = 0;
        let tradesUpdated = 0;
        let tradesUnchanged = 0;

        for (const trade of dedupedClosedTrades) {
          const payload = {
            account_id,
            asset: trade.asset,
            closed_at: trade.closed_at,
            direction: trade.direction,
            duration_minutes: trade.duration_minutes,
            entry_price: trade.entry_price,
            exit_price: trade.exit_price,
            external_trade_id: trade.external_trade_id,
            lot_size: trade.lot_size,
            opened_at: trade.opened_at,
            profit_loss: trade.profit_loss,
            status: "closed",
            stop_loss: trade.stop_loss,
            take_profit: trade.take_profit,
            user_id: user.id,
          };

          const existing = existingClosedTrades.get(trade.external_trade_id);
          if (!existing) {
            const { error: tradeErr } = await supabase.from("account_trade_history").insert(payload);
            if (tradeErr) {
              console.error(`[Sync:DB] Trade insert error for ${trade.external_trade_id}: ${tradeErr.message}`);
              const decision: TradeWriteDecision = {
                ...summarizeClosedTradeDebug(trade),
                action: "ignored",
                reason: `insert_error:${tradeErr.message}`,
              };
              writeDecisions.push(decision);
              logTradeWriteDecision(decision);
            } else {
              tradesInserted++;
              const decision: TradeWriteDecision = {
                ...summarizeClosedTradeDebug(trade),
                action: "inserted",
              };
              writeDecisions.push(decision);
              logTradeWriteDecision(decision);
            }
            continue;
          }

          const changedFields = getChangedFields(existing, payload);
          if (changedFields.length === 0) {
            tradesUnchanged++;
            const decision: TradeWriteDecision = {
              ...summarizeClosedTradeDebug(trade),
              action: "unchanged",
              reason: "same mapped payload already present in database",
            };
            writeDecisions.push(decision);
            logTradeWriteDecision(decision);
            continue;
          }

          const { error: tradeUpdateErr } = await supabase
            .from("account_trade_history")
            .update(payload)
            .eq("id", existing.id);

          if (tradeUpdateErr) {
            console.error(`[Sync:DB] Trade update error for ${trade.external_trade_id}: ${tradeUpdateErr.message}`);
            const decision: TradeWriteDecision = {
              ...summarizeClosedTradeDebug(trade),
              action: "ignored",
              changed_fields: changedFields,
              reason: `update_error:${tradeUpdateErr.message}`,
            };
            writeDecisions.push(decision);
            logTradeWriteDecision(decision);
          } else {
            tradesUpdated++;
            const decision: TradeWriteDecision = {
              ...summarizeClosedTradeDebug(trade),
              action: "updated",
              changed_fields: changedFields,
            };
            writeDecisions.push(decision);
            logTradeWriteDecision(decision);
          }
        }

        console.log(`[Sync:DB] Closed trades: received=${data.closedTrades.length} deduped=${dedupedClosedTrades.length} inserted=${tradesInserted} updated=${tradesUpdated} unchanged=${tradesUnchanged}`);

        const { data: dbStateRows, error: dbStateError } = await supabase
          .from("account_trade_history")
          .select("external_trade_id, status, opened_at, closed_at, profit_loss, asset, direction")
          .eq("account_id", account_id)
          .eq("status", "closed")
          .order("closed_at", { ascending: false })
          .limit(10);

        if (dbStateError) {
          console.error(`[Sync:DB:State] Snapshot query error: ${dbStateError.message}`);
        }

        const dbStateSnapshot = (dbStateRows ?? []).map((row: any) => ({
          close_time: row.closed_at,
          direction: row.direction,
          external_trade_id: row.external_trade_id,
          open_time: row.opened_at,
          profit: roundTo2(Number(row.profit_loss || 0)),
          status: row.status,
          symbol: row.asset,
        }));

        dbStateSnapshot.forEach((row) => {
          console.log(
            `[Sync:DB:State] external_trade_id=${row.external_trade_id ?? "n/a"} status=${row.status} open_time=${row.open_time ?? "n/a"} close_time=${row.close_time ?? "n/a"} profit=${row.profit} symbol=${row.symbol ?? "n/a"} direction=${row.direction ?? "n/a"}`,
          );
        });

        syncDebug.database = {
          latest_closed_trades_snapshot: dbStateSnapshot,
          write_decisions: writeDecisions,
        };

        const recalculated = await recalculateAccountOverviewFromDatabase(supabase, account_id, data.overview);
        const successfulSyncAt = new Date().toISOString();
        syncDebug.metrics = recalculated.summary;
        syncDebug.verdict = {
          db_closed_trade_snapshot_present: dbStateSnapshot.length > 0,
          db_write_happened: tradesInserted + tradesUpdated > 0,
          provider_close_deal_received: Boolean(data.debug?.history?.providerCloseDealsCount),
        };

        console.log(`[Sync:DB] Saving overview to trading_accounts: balance=${recalculated.overview.balance} equity=${recalculated.overview.equity} pnl=${recalculated.overview.profit_loss} drawdown=${recalculated.overview.drawdown} dailyPnl=${recalculated.overview.daily_pnl} weeklyPnl=${recalculated.overview.weekly_pnl} openPositions=${recalculated.overview.open_positions_count} winRate=${recalculated.overview.win_rate} profitFactor=${recalculated.overview.profit_factor}`);

        // Persist pending closures in account metadata
        const updatedMetadata = {
          ...existingMetadata,
          pendingClosures: reconciliationResult.stillPending,
          lastReconciliationAt: new Date().toISOString(),
        };
        if (reconciliationResult.stillPending.length > 0) {
          console.log(`[Reconciliation] Persisting ${reconciliationResult.stillPending.length} pending closures for next sync`);
        }

        await supabase.from("trading_accounts").update({
          balance: recalculated.overview.balance,
          equity: recalculated.overview.equity,
          profit_loss: recalculated.overview.profit_loss,
          drawdown: recalculated.overview.drawdown,
          daily_pnl: recalculated.overview.daily_pnl,
          weekly_pnl: recalculated.overview.weekly_pnl,
          open_positions_count: recalculated.overview.open_positions_count,
          win_rate: recalculated.overview.win_rate ?? 0,
          profit_factor: recalculated.overview.profit_factor ?? 0,
          connection_status: "connected",
          sync_status: "idle",
          last_sync_at: successfulSyncAt,
          last_successful_sync_at: successfulSyncAt,
          last_sync_error: null,
          metadata: updatedMetadata,
        }).eq("id", account_id);

        if (syncLog) {
          await supabase.from("account_sync_logs").update({
            metadata: syncDebug,
            status: "completed",
            completed_at: new Date().toISOString(),
            trades_synced: tradesInserted,
          }).eq("id", syncLog.id);
        }

        return new Response(JSON.stringify({
          success: true,
          trades_synced: tradesInserted,
          trades_updated: tradesUpdated,
          history_buffer_minutes: historyWindow.bufferMinutes,
          history_range_end: historyWindow.endTime,
          history_range_start: historyWindow.startTime,
          open_positions: data.openPositions.length,
          overview: recalculated.overview,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (err) {
        const errorMessage = getErrorMessage(err);
        syncDebug.error = {
          message: errorMessage,
        };
        await supabase.from("trading_accounts").update({
          sync_status: "error",
          connection_status: "failed",
          last_sync_error: errorMessage,
        }).eq("id", account_id);

        if (syncLog) {
          await supabase.from("account_sync_logs").update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
            metadata: syncDebug,
          }).eq("id", syncLog.id);
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
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
            console.warn("[delete_account] Undeploy warning (may already be undeployed):", getErrorMessage(undeployErr));
          }

          await metaapiRequest(`/users/current/accounts/${account.provider_account_id}`, {
            method: "DELETE",
          });
          console.log("[delete_account] MetaApi account deleted successfully");
        } catch (metaErr) {
          metaapiCleanupError = getErrorMessage(metaErr);
          console.error("[delete_account] MetaApi cleanup error (proceeding with local delete):", metaapiCleanupError);
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
    return new Response(JSON.stringify({ error: getErrorMessage(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
