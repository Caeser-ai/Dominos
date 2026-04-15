import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabase";

export async function GET(req: Request) {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        await verifyToken(token);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: players }, { data: wallets }, { data: txns }, { data: payments }] = await Promise.all([
        supabaseAdminClient.from("players").select("id, is_active"),
        supabaseAdminClient.from("wallets").select("balance"),
        supabaseAdminClient.from("wallet_transactions").select("type, amount, status, created_at"),
        supabaseAdminClient.from("payments").select("status"),
    ]);

    const totalBalance = (wallets ?? []).reduce((s, w) => s + Number(w.balance ?? 0), 0);
    const totalDeposits = (txns ?? [])
        .filter((t) => {
            const rawType = String(t.type).toLowerCase();
            return (rawType.includes("deposit") || rawType.includes("credit")) && t.status === "completed";
        })
        .reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const totalWithdrawals = (txns ?? [])
        .filter((t) => {
            const rawType = String(t.type).toLowerCase();
            return (rawType.includes("withdraw") || rawType.includes("debit")) && t.status === "completed";
        })
        .reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const totalUsers = (players ?? []).length;
    const activeUsers = (players ?? []).filter((u) => u.is_active).length;
    const inactiveUsers = totalUsers - activeUsers;
    const pendingWithdrawals = (payments ?? []).filter((w) => w.status === "pending").length;

    // Chart data: deposits vs withdrawals over last 7 days
    const sevenDaysMap: Record<string, { date: string; deposits: number; withdrawals: number }> = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        sevenDaysMap[key] = { date: key, deposits: 0, withdrawals: 0 };
    }
    (txns ?? []).forEach((t) => {
        if (t.status !== "completed") return;
        const day = String(t.created_at).slice(0, 10);
        if (!(day in sevenDaysMap)) return;
        const rawType = String(t.type).toLowerCase();
        if (rawType.includes("deposit") || rawType.includes("credit")) sevenDaysMap[day].deposits += Number(t.amount ?? 0);
        if (rawType.includes("withdraw") || rawType.includes("debit")) sevenDaysMap[day].withdrawals += Number(t.amount ?? 0);
    });
    const depositsVsWithdrawals = Object.values(sevenDaysMap);

    // Transaction status distribution
    const statusCounts = { pending: 0, success: 0, failed: 0 };
    (txns ?? []).forEach((t) => {
        if (t.status === "completed") statusCounts.success++;
        else if (t.status === "failed") statusCounts.failed++;
        else statusCounts.pending++;
    });
    const transactionStatus = [
        { name: "Success", value: statusCounts.success },
        { name: "Pending", value: statusCounts.pending },
        { name: "Failed", value: statusCounts.failed },
    ];

    // Activity over last 7 days (transaction count by day)
    const activityMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        activityMap[d.toISOString().slice(0, 10)] = 0;
    }
    (txns ?? []).forEach((t) => {
        const day = String(t.created_at).slice(0, 10);
        if (day in activityMap) activityMap[day]++;
    });
    const systemActivity = Object.entries(activityMap).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
        kpis: { totalBalance, totalDeposits, totalWithdrawals, totalUsers, activeUsers, inactiveUsers, pendingWithdrawals },
        charts: { depositsVsWithdrawals, transactionStatus, systemActivity },
    });
}
