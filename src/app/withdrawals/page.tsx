"use client";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Modal from "@/components/ui/Modal";
import { Search, CheckCircle, XCircle, Loader2 } from "lucide-react";

type Withdrawal = {
    withdrawal_id: string;
    user_id: string;
    username: string;
    amount: number;
    status: "pending" | "success" | "rejected";
    admin_remark: string;
    created_at: string;
    updated_at: string;
};

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string }> = {
        pending: { bg: "#fef9c3", color: "#d97706" },
        success: { bg: "#dcfce7", color: "#16a34a" },
        rejected: { bg: "#fee2e2", color: "#dc2626" },
    };
    const s = map[status] ?? { bg: "#f3f4f6", color: "#6b7280" };
    return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 500 }}>{status}</span>;
}

export default function WithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<Withdrawal | null>(null);
    const [remark, setRemark] = useState("");
    const limit = 10;

    const fetchWithdrawals = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem("admin_token");
        const res = await fetch(`/api/withdrawals?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setWithdrawals(data.withdrawals ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

    async function handleApprove(w: Withdrawal) {
        setActionLoading(w.withdrawal_id);
        const token = localStorage.getItem("admin_token");
        await fetch(`/api/withdrawals/${w.withdrawal_id}/approve`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        await fetchWithdrawals();
        setActionLoading(null);
    }

    async function handleReject(e: React.FormEvent) {
        e.preventDefault();
        if (!rejectModal) return;
        setActionLoading(rejectModal.withdrawal_id);
        const token = localStorage.getItem("admin_token");
        await fetch(`/api/withdrawals/${rejectModal.withdrawal_id}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ remark }),
        });
        setRejectModal(null);
        setRemark("");
        await fetchWithdrawals();
        setActionLoading(null);
    }

    const totalPages = Math.ceil(total / limit);

    return (
        <DashboardLayout>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Withdrawals</h1>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{total} withdrawal requests · pending shown first</p>
            </div>

            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input type="text" placeholder="Search by username or withdrawal ID…" value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        style={{ border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent" }} />
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#f9fafb" }}>
                                {["Withdrawal ID", "User", "Amount (₹)", "Status", "Notification", "Remark", "Created", "Updated", "Actions"].map((h) => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
                            ) : withdrawals.length === 0 ? (
                                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No withdrawals found</td></tr>
                            ) : withdrawals.map((w) => (
                                <tr key={w.withdrawal_id}
                                    style={{ borderBottom: "1px solid var(--border)", background: w.status === "pending" ? "#fffbf0" : "transparent" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = w.status === "pending" ? "#fff8e7" : "#fafafa")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = w.status === "pending" ? "#fffbf0" : "transparent")}
                                >
                                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{w.withdrawal_id}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ fontWeight: 500 }}>{w.username}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{w.user_id}</div>
                                    </td>
                                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#e8002d" }}>₹{w.amount.toLocaleString()}</td>
                                    <td style={{ padding: "12px 16px" }}><StatusBadge status={w.status} /></td>
                                    <td style={{ padding: "12px 16px" }}>
                                        {w.status === "pending" ? (
                                            <span style={{ background: "#fff7ed", color: "#c2410c", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                                                New request
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", maxWidth: 160 }}>{w.admin_remark || "—"}</td>
                                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>{new Date(w.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>{new Date(w.updated_at).toLocaleDateString()}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        {w.status === "pending" ? (
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button
                                                    onClick={() => handleApprove(w)}
                                                    disabled={actionLoading === w.withdrawal_id}
                                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                                                >
                                                    {actionLoading === w.withdrawal_id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={12} />} Pay
                                                </button>
                                                <button
                                                    onClick={() => setRejectModal(w)}
                                                    disabled={actionLoading === w.withdrawal_id}
                                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff0f0", color: "#dc2626", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                                                >
                                                    <XCircle size={12} /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
                                        )}
                                    </td>
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

            {/* Reject Modal */}
            {rejectModal && (
                <Modal title={`Reject Withdrawal — ₹${rejectModal.amount.toLocaleString()}`} onClose={() => { setRejectModal(null); setRemark(""); }}>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>User: <strong>{rejectModal.username}</strong></p>
                    <form onSubmit={handleReject} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Admin Remark (optional)</label>
                            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} placeholder="Reason for rejection…"
                                style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <button type="submit"
                            style={{ padding: "10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                            Confirm Rejection
                        </button>
                    </form>
                </Modal>
            )}
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </DashboardLayout>
    );
}
