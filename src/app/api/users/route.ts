import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabase";

async function requireAuth(req: Request) {
    const token = extractToken(req);
    if (!token) return false;
    try { await verifyToken(token); return true; } catch { return false; }
}

export async function GET(req: Request) {
    if (!(await requireAuth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "10");

    const { data: players, error } = await supabaseAdminClient
        .from("players")
        .select("id, email, display_name, is_active, last_active_at, updated_at")
        .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const playerIds = (players ?? []).map((p) => p.id);
    const { data: wallets } = await supabaseAdminClient
        .from("wallets")
        .select("player_id, balance")
        .in("player_id", playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"]);

    const { data: txns } = await supabaseAdminClient
        .from("wallet_transactions")
        .select("player_id, type, amount, status")
        .in("player_id", playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"]);

    const walletMap = new Map((wallets ?? []).map((w) => [w.player_id, Number(w.balance ?? 0)]));
    const totalsMap = new Map<string, { deposit: number; withdrawal: number }>();
    (txns ?? []).forEach((t) => {
        if (t.status !== "completed") return;
        const row = totalsMap.get(t.player_id) ?? { deposit: 0, withdrawal: 0 };
        const amount = Number(t.amount ?? 0);
        const rawType = String(t.type).toLowerCase();
        if (rawType.includes("deposit") || rawType.includes("credit")) row.deposit += amount;
        if (rawType.includes("withdraw") || rawType.includes("debit")) row.withdrawal += amount;
        totalsMap.set(t.player_id, row);
    });

    let users = (players ?? []).map((p) => {
        const totals = totalsMap.get(p.id) ?? { deposit: 0, withdrawal: 0 };
        return {
            user_id: p.id,
            username: p.display_name || p.email || "Unknown",
            total_deposit: totals.deposit,
            total_withdrawal: totals.withdrawal,
            balance: walletMap.get(p.id) ?? 0,
            status: p.is_active ? "active" : "blocked",
            created_at: p.updated_at || p.last_active_at || new Date().toISOString(),
        };
    });

    if (search) {
        users = users.filter((u) => u.username.toLowerCase().includes(search) || u.user_id.toLowerCase().includes(search));
    }

    const total = users.length;
    const paginated = users.slice((page - 1) * limit, page * limit);
    return NextResponse.json({ users: paginated, total, page, limit });
}

export async function POST(req: Request) {
    if (!(await requireAuth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { username, password } = await req.json();
    if (!username || !password) {
        return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }
    const { data: created, error } = await supabaseAdminClient
        .from("players")
        .insert({ display_name: username, is_active: true })
        .select("id, display_name, email, is_active, updated_at")
        .single();

    if (error || !created) return NextResponse.json({ error: error?.message || "Failed to create user" }, { status: 400 });

    await supabaseAdminClient.from("wallets").insert({ player_id: created.id, balance: 0, currency: "USD" });

    return NextResponse.json({
        user_id: created.id,
        username: created.display_name || created.email || username,
        total_deposit: 0,
        total_withdrawal: 0,
        balance: 0,
        status: created.is_active ? "active" : "blocked",
        created_at: created.updated_at || new Date().toISOString(),
    }, { status: 201 });
}
