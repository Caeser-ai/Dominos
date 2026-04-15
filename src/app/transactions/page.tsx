"use client";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search } from "lucide-react";

type Transaction = {
    transaction_id: string;
    user_id: string;
    username: string;
    type: "deposit" | "withdrawal";
    amount: number;
    fee: number;
    total_deducted: number;
    status: "pending" | "success" | "failed";
    created_at: string;
};

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string }> = {
        success: { bg: "#dcfce7", color: "#16a34a" },
        pending: { bg: "#fef9c3", color: "#d97706" },
        failed: { bg: "#fee2e2", color: "#dc2626" },
    };
    const s = map[status] ?? { bg: "#f3f4f6", color: "#6b7280" };
    return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 500 }}>{status}</span>;
}

function TypeBadge({ type }: { type: string }) {
    const isDeposit = type === "deposit";
    return <span style={{ background: isDeposit ? "#dcfce7" : "#fff0f2", color: isDeposit ? "#16a34a" : "#e8002d", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 500 }}>{type}</span>;
}

export default function TransactionsPage() {
    const [txns, setTxns] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const limit = 10;

    const fetchTxns = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem("admin_token");
        const res = await fetch(`/api/transactions?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTxns(data.transactions ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchTxns(); }, [fetchTxns]);

    const totalPages = Math.ceil(total / limit);

    return (
        <DashboardLayout>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Transactions</h1>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{total} transactions recorded</p>
            </div>

            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input type="text" placeholder="Search by username, user ID or transaction ID…" value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        style={{ border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent" }} />
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#f9fafb" }}>
                                {["Txn ID", "User", "Type", "Amount (₹)", "Fee (₹)", "Total Deducted (₹)", "Status", "Date"].map((h) => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
                            ) : txns.length === 0 ? (
                                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No transactions found</td></tr>
                            ) : txns.map((t) => (
                                <tr key={t.transaction_id} style={{ borderBottom: "1px solid var(--border)" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{t.transaction_id}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ fontWeight: 500 }}>{t.username}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{t.user_id}</div>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}><TypeBadge type={t.type} /></td>
                                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>₹{t.amount.toLocaleString()}</td>
                                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>₹{t.fee.toLocaleString()}</td>
                                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>₹{t.total_deducted.toLocaleString()}</td>
                                    <td style={{ padding: "12px 16px" }}><StatusBadge status={t.status} /></td>
                                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12 }}>{new Date(t.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Page {page} of {totalPages} · {total} total</span>
                        <div style={{ display: "flex", gap: 6 }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button key={p} onClick={() => setPage(p)}
                                    style={{ width: 32, height: 32, border: "1px solid", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: p === page ? 600 : 400, background: p === page ? "var(--primary)" : "#fff", color: p === page ? "#fff" : "var(--text)", borderColor: p === page ? "var(--primary)" : "var(--border)" }}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
