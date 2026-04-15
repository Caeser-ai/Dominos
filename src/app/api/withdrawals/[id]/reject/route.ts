import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabase";

function isProcessedStatus(raw: string | null | undefined) {
    const status = String(raw ?? "").toLowerCase();
    return ["success", "completed", "approved", "paid", "failed", "rejected", "cancelled", "canceled"].includes(status);
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try { await verifyToken(token); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const { id } = await params;
    const { remark } = await req.json().catch(() => ({ remark: "" }));

    const { data: payment, error: paymentError } = await supabaseAdminClient
        .from("payments")
        .select("id, player_id, amount, status, created_at")
        .eq("id", id)
        .maybeSingle();
    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 });

    if (!payment) {
        const { data: txn, error: txnError } = await supabaseAdminClient
            .from("wallet_transactions")
            .select("id, player_id, amount, status, created_at, type")
            .eq("id", id)
            .maybeSingle();
        if (txnError) return NextResponse.json({ error: txnError.message }, { status: 400 });
        if (!txn) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const rawType = String(txn.type ?? "").toLowerCase();
        if (!(rawType.includes("withdraw") || rawType.includes("debit"))) {
            return NextResponse.json({ error: "Not a withdrawal request" }, { status: 400 });
        }

        if (isProcessedStatus(txn.status)) {
            return NextResponse.json({ error: "Already processed" }, { status: 400 });
        }

        const { error: updateTxnError } = await supabaseAdminClient
            .from("wallet_transactions")
            .update({ status: "failed" })
            .eq("id", id);
        if (updateTxnError) return NextResponse.json({ error: updateTxnError.message }, { status: 400 });

        return NextResponse.json({
            withdrawal_id: txn.id,
            user_id: txn.player_id,
            amount: Number(txn.amount ?? 0),
            status: "rejected",
            admin_remark: remark || "Rejected by admin",
            created_at: txn.created_at,
            updated_at: new Date().toISOString(),
        });
    }

    if (isProcessedStatus(payment.status)) return NextResponse.json({ error: "Already processed" }, { status: 400 });

    const { error } = await supabaseAdminClient
        .from("payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
        withdrawal_id: payment.id,
        user_id: payment.player_id,
        amount: Number(payment.amount ?? 0),
        status: "rejected",
        admin_remark: remark || "Rejected by admin",
        created_at: payment.created_at,
        updated_at: new Date().toISOString(),
    });
}
