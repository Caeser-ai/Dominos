import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabase";

export async function GET(req: Request) {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try { await verifyToken(token); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "10");

    const { data: rawTxns, error } = await supabaseAdminClient
        .from("wallet_transactions")
        .select("id, player_id, type, amount, status, created_at")
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const playerIds = Array.from(new Set((rawTxns ?? []).map((t) => t.player_id)));
    const { data: players } = await supabaseAdminClient
        .from("players")
        .select("id, display_name, email")
        .in("id", playerIds.length ? playerIds : ["00000000-0000-0000-0000-000000000000"]);
    const playerMap = new Map((players ?? []).map((p) => [p.id, p.display_name || p.email || "—"]));

    let txns = (rawTxns ?? []).map((t) => {
        const rawType = String(t.type).toLowerCase();
        const type = rawType.includes("withdraw") || rawType.includes("debit") ? "withdrawal" : "deposit";
        const status = t.status === "completed" ? "success" : t.status === "failed" ? "failed" : "pending";
        const amount = Number(t.amount ?? 0);
        return {
            transaction_id: t.id,
            user_id: t.player_id,
            username: playerMap.get(t.player_id) ?? "—",
            type,
            amount,
            fee: 0,
            total_deducted: amount,
            status,
            created_at: t.created_at,
        };
    });

    if (search) {
        txns = txns.filter(
            (t) =>
                t.user_id.toLowerCase().includes(search) ||
                t.transaction_id.toLowerCase().includes(search) ||
                (t.username as string).toLowerCase().includes(search)
        );
    }

    const total = txns.length;
    const paginated = txns.slice((page - 1) * limit, page * limit);
    return NextResponse.json({ transactions: paginated, total, page, limit });
}
