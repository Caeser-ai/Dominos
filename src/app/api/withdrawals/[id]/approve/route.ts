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
    const { data: payment, error: paymentError } = await supabaseAdminClient
        .from("payments")
        .select("id, player_id, wallet_id, amount, status, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();
    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 });

    // Fallback: user app may store withdrawal request in wallet_transactions
    if (!payment) {
        const { data: txn, error: txnError } = await supabaseAdminClient
            .from("wallet_transactions")
            .select("id, player_id, wallet_id, amount, status, created_at, type")
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

        let walletQuery = supabaseAdminClient.from("wallets").select("id, balance");
        if (txn.wallet_id) walletQuery = walletQuery.eq("id", txn.wallet_id);
        else walletQuery = walletQuery.eq("player_id", txn.player_id);

        const { data: wallet, error: walletError } = await walletQuery.maybeSingle();
        if (walletError) return NextResponse.json({ error: walletError.message }, { status: 400 });
        if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

        const amount = Number(txn.amount ?? 0);
        const currentBalance = Number(wallet.balance ?? 0);
        if (currentBalance < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

        const { error: updateWalletError } = await supabaseAdminClient
            .from("wallets")
            .update({ balance: currentBalance - amount, updated_at: new Date().toISOString() })
            .eq("id", wallet.id);
        if (updateWalletError) return NextResponse.json({ error: updateWalletError.message }, { status: 400 });

        const { error: updateTxnError } = await supabaseAdminClient
            .from("wallet_transactions")
            .update({ status: "completed" })
            .eq("id", txn.id);
        if (updateTxnError) return NextResponse.json({ error: updateTxnError.message }, { status: 400 });

        return NextResponse.json({
            withdrawal_id: txn.id,
            user_id: txn.player_id,
            amount,
            status: "success",
            admin_remark: "Approved by admin",
            created_at: txn.created_at,
            updated_at: new Date().toISOString(),
        });
    }

    if (isProcessedStatus(payment.status)) {
        return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    let walletQuery = supabaseAdminClient.from("wallets").select("id, balance");
    if (payment.wallet_id) walletQuery = walletQuery.eq("id", payment.wallet_id);
    else walletQuery = walletQuery.eq("player_id", payment.player_id);

    const { data: wallet, error: walletError } = await walletQuery.maybeSingle();
    if (walletError) return NextResponse.json({ error: walletError.message }, { status: 400 });
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    const amount = Number(payment.amount ?? 0);
    const currentBalance = Number(wallet.balance ?? 0);
    if (currentBalance < amount) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

    const { error: updateWalletError } = await supabaseAdminClient
        .from("wallets")
        .update({ balance: currentBalance - amount, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);
    if (updateWalletError) return NextResponse.json({ error: updateWalletError.message }, { status: 400 });

    const { error: insertTxnError } = await supabaseAdminClient.from("wallet_transactions").insert({
        player_id: payment.player_id,
        wallet_id: wallet.id,
        type: "withdrawal",
        amount,
        status: "completed",
        reference_id: payment.id,
        created_at: new Date().toISOString(),
    });
    if (insertTxnError) return NextResponse.json({ error: insertTxnError.message }, { status: 400 });

    const { error: updatePaymentError } = await supabaseAdminClient
        .from("payments")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", payment.id);
    if (updatePaymentError) return NextResponse.json({ error: updatePaymentError.message }, { status: 400 });

    return NextResponse.json({
        withdrawal_id: payment.id,
        user_id: payment.player_id,
        amount,
        status: "success",
        admin_remark: "Approved by admin",
        created_at: payment.created_at,
        updated_at: new Date().toISOString(),
    });
}
