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

    const [{ data: payments, error: paymentsError }, { data: txns, error: txnsError }] = await Promise.all([
        supabaseAdminClient.from("payments").select("status"),
        supabaseAdminClient.from("wallet_transactions").select("type, status"),
    ]);
    if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 400 });
    if (txnsError) return NextResponse.json({ error: txnsError.message }, { status: 400 });

    const isPending = (value: string | null | undefined) => {
        const s = String(value ?? "").toLowerCase();
        return !["success", "completed", "approved", "paid", "failed", "rejected", "cancelled", "canceled"].includes(s);
    };

    const pendingPayments = (payments ?? []).filter((row) => isPending(row.status)).length;
    const pendingTxns = (txns ?? []).filter((row) => {
        const rawType = String(row.type ?? "").toLowerCase();
        const isWithdrawal = rawType.includes("withdraw") || rawType.includes("debit");
        return isWithdrawal && isPending(row.status);
    }).length;

    const pending = pendingPayments + pendingTxns;
    return NextResponse.json({ pending });
}
