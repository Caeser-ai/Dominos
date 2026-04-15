"use client";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Modal from "@/components/ui/Modal";
import { Search, Plus, UserCheck, UserX, Loader2 } from "lucide-react";

type User = {
    user_id: string;
    username: string;
    total_deposit: number;
    total_withdrawal: number;
    balance: number;
    status: "active" | "blocked";
    created_at: string;
};

function Badge({ status }: { status: string }) {
    const colors: Record<string, { bg: string; color: string }> = {
        active: { bg: "#dcfce7", color: "#16a34a" },
        blocked: { bg: "#fee2e2", color: "#dc2626" },
    };
    const s = colors[status] ?? { bg: "#f3f4f6", color: "#6b7280" };
    return (
        <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 500 }}>
            {status}
        </span>
    );
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const limit = 10;

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem("admin_token");
        const res = await fetch(`/api/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    async function toggleStatus(user: User) {
        setActionLoading(user.user_id);
        const token = localStorage.getItem("admin_token");
        const newStatus = user.status === "active" ? "blocked" : "active";
        await fetch(`/api/users/${user.user_id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus }),
        });
        await fetchUsers();
        setActionLoading(null);
    }

    const totalPages = Math.ceil(total / limit);

    return (
        <DashboardLayout>
            {/* Search */}
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search by username or user ID…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        style={{ border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent", color: "var(--text)" }}
                    />
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#f9fafb" }}>
                                {["User ID", "Username", "Balance (USD)", "Deposits (USD)", "Withdrawals (USD)", "Created"].map((h) => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No users found</td></tr>
                            ) : users.map((u) => (
                                <tr key={u.user_id} style={{ borderBottom: "1px solid var(--border)" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{u.user_id}</td>
                                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{u.username}</td>
                                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{u.balance.toLocaleString()}</td>
                                    <td style={{ padding: "12px 16px", color: "#16a34a" }}>{u.total_deposit.toLocaleString()}</td>
                                    <td style={{ padding: "12px 16px", color: "#dc2626" }}>{u.total_withdrawal.toLocaleString()}</td>
                                    <td style={{ padding: "12px 16px", fontFamily: "monospace",color: "var(--text-muted)", fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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
