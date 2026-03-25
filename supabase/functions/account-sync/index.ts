import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== MOCK PROVIDER ==========
// Replace this section with a real provider (MT4/MT5 bridge) in the future.
// The interface is: fetchAccountData(account) => { overview, openPositions, closedTrades }

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
    const pnl = r(-200, 400);
    return {
      external_trade_id: `mock-open-${account.id.slice(0, 8)}-${i}`,
      asset,
      direction: dir,
      lot_size: Math.round(r(0.01, 1) * 100) / 100,
      entry_price: Math.round(entry * 100000) / 100000,
      stop_loss: Math.round((entry * (dir === "buy" ? 0.995 : 1.005)) * 100000) / 100000,
      take_profit: Math.round((entry * (dir === "buy" ? 1.01 : 0.99)) * 100000) / 100000,
      profit_loss: Math.round(pnl * 100) / 100,
      opened_at: new Date(Date.now() - r(3600000, 86400000 * 3)).toISOString(),
    };
  });

  const closedTrades = Array.from({ length: Math.floor(r(5, 20)) }, (_, i) => {
    const asset = assets[i % assets.length];
    const dir = i % 3 === 0 ? "sell" : "buy";
    const entry = asset === "XAU/USD" ? 2300 + r(-100, 100) : asset === "NAS100" ? 18000 + r(-1000, 1000) : 1.0 + r(0, 0.5);
    const exitMult = dir === "buy" ? 1 + r(-0.005, 0.01) : 1 - r(-0.01, 0.005);
    const exit = entry * exitMult;
    const pnl = (dir === "buy" ? exit - entry : entry - exit) * r(1000, 10000);
    const durationMins = Math.floor(r(15, 4320));
    const closedAt = new Date(Date.now() - r(86400000, 86400000 * 30));
    const openedAt = new Date(closedAt.getTime() - durationMins * 60000);
    return {
      external_trade_id: `mock-closed-${account.id.slice(0, 8)}-${i}`,
      asset,
      direction: dir,
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

  const wins = closedTrades.filter(t => t.profit_loss > 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

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

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ========== PROVIDER ROUTER ==========
// Add new providers here. For now only "mock" is available.
async function fetchAccountData(account: any): Promise<ProviderAccountData> {
  const providerType = account.provider_type || "mock";

  switch (providerType) {
    case "mock":
      return generateMockData(account);
    // case "mt5_bridge":
    //   return await fetchMT5Data(account);
    // case "mt4_bridge":
    //   return await fetchMT4Data(account);
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

    // Verify user
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
        // Update status to syncing
        await supabase.from("trading_accounts").update({
          connection_status: "syncing",
          sync_status: "running",
        }).eq("id", account_id);

        // Try fetching data (validates connection)
        await fetchAccountData(account);

        // Mark as connected
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

      // Prevent concurrent syncs
      if (account.sync_status === "running") {
        return new Response(JSON.stringify({ error: "Sincronizzazione già in corso" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create sync log
      const { data: syncLog } = await supabase.from("account_sync_logs").insert({
        account_id,
        user_id: user.id,
        sync_type: body.sync_type || "manual",
        status: "running",
      }).select().single();

      // Mark syncing
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

        // Calculate metrics from closed trades
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

        // Upsert open positions (delete old opens, insert new)
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

        // Upsert closed trades (skip existing by external_trade_id)
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

        // Complete sync log
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
        // Error handling
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
