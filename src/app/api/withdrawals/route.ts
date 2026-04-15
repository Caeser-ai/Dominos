import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabase";

function normalizeWithdrawalStatus(rawStatus: string | null | undefined) {
    const status = String(rawStatus ?? "").toLowerCase();
    if (["success", "completed", "approved", "paid"].includes(status)) return "success";
    if (["failed", "rejected", "cancelled", "canceled"].includes(status)) return "rejected";
    return "pending";
}

export async function GET(req: Request) {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try { await verifyToken(token); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "10");
    const statusFilter = url.searchParams.get("status") ?? "";

    const [{ data: payments, error: paymentsError }, { data: txnWithdrawals, error: txnError }] = await Promise.all([
        supabaseAdminClient
            .from("payments")
            .select("id, player_id, amount, status, created_at, updated_at")
            .order("created_at", { ascending: false }),
        supabaseAdminClient
            .from("wallet_transactions")
            .select("id, player_id, amount, status, created_at, wallet_id, type")
            .order("created_at", { ascending: false }),
    ]);
    if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 400 });
    if (txnError) return NextResponse.json({ error: txnError.message }, { status: 400 });

    const withdrawalTxns = (txnWithdrawals ?? []).filter((t) => {
        const rawType = String(t.type ?? "").toLowerCase();
        return rawType.includes("withdraw") || rawType.includes("debit");
    });

    const playerIds = Array.from(
        new Set([...(payments ?? []).map((p) => p.player_id), ...withdrawalTxns.map((t) => t.player_id)])
    );
    const { data: players } = await supabaseAdminClient
        .from("players")
        .select("id, display_name, email")
        .in("id", playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"]);
    const playerMap = new Map((players ?? []).map((p) => [p.id, p.display_name || p.email || "—"]));

    const fromPayments = (payments ?? []).map((w) => {
        const mappedStatus = normalizeWithdrawalStatus(w.status);
        return {
            withdrawal_id: w.id,
            user_id: w.player_id,
            username: playerMap.get(w.player_id) ?? "—",
            amount: Number(w.amount ?? 0),
            status: mappedStatus,
            admin_remark: "",
            created_at: w.created_at,
            updated_at: w.updated_at,
        };
    });
    const fromTxns = withdrawalTxns.map((w) => {
        const mappedStatus = normalizeWithdrawalStatus(w.status);
        return {
            withdrawal_id: w.id,
            user_id: w.player_id,
            username: playerMap.get(w.player_id) ?? "—",
            amount: Number(w.amount ?? 0),
            status: mappedStatus,
            admin_remark: "",
            created_at: w.created_at,
            updated_at: w.created_at,
        };
    });

    const seen = new Set<string>();
    let withdrawals = [...fromPayments, ...fromTxns].filter((w) => {
        if (seen.has(w.withdrawal_id)) return false;
        seen.add(w.withdrawal_id);
        return true;
    });

    if (search) {
        withdrawals = withdrawals.filter(
            (w) =>
                w.user_id.toLowerCase().includes(search) ||
                w.withdrawal_id.toLowerCase().includes(search) ||
                (w.username as string).toLowerCase().includes(search)
        );
    }
    if (statusFilter) {
        withdrawals = withdrawals.filter((w) => w.status === statusFilter);
    }

    // Sort: pending first
    withdrawals.sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return 0;
    });

    const total = withdrawals.length;
    const paginated = withdrawals.slice((page - 1) * limit, page * limit);
    return NextResponse.json({ withdrawals: paginated, total, page, limit });
}

// User withdrawal request entrypoint:
// Creates a pending payment request only. No money is deducted here.
export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const playerId = body?.player_id;
    const amount = Number(body?.amount ?? 0);

    if (!playerId || Number.isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: "player_id and valid amount are required" }, { status: 400 });
    }

    const { data: player, error: playerError } = await supabaseAdminClient
        .from("players")
        .select("id, is_active")
        .eq("id", playerId)
        .maybeSingle();
    if (playerError) return NextResponse.json({ error: playerError.message }, { status: 400 });
    if (!player) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!player.is_active) return NextResponse.json({ error: "User is blocked" }, { status: 400 });

    const { data: wallet, error: walletError } = await supabaseAdminClient
        .from("wallets")
        .select("id, balance")
        .eq("player_id", playerId)
        .maybeSingle();
    if (walletError) return NextResponse.json({ error: walletError.message }, { status: 400 });
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    const balance = Number(wallet.balance ?? 0);
    if (balance < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

    const { data: created, error: createError } = await supabaseAdminClient
        .from("payments")
        .insert({
            player_id: playerId,
            wallet_id: wallet.id,
            amount,
            status: "pending",
            currency: "USD",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select("id, player_id, amount, status, created_at, updated_at")
        .single();
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });

    return NextResponse.json({
        message: "Withdrawal request submitted for admin approval",
        withdrawal: {
            withdrawal_id: created.id,
            user_id: created.player_id,
            amount: Number(created.amount ?? 0),
            status: "pending",
            created_at: created.created_at,
            updated_at: created.updated_at,
        },
    }, { status: 201 });
}
