"use client";

import { FormEvent, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

type AdminData = {
    admin_id: string;
    username: string;
    password: string;
    created_at: string;
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div
            style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
        >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>{title}</h3>
            {children}
        </div>
    );
}

export default function AdminPage() {
    const [admin, setAdmin] = useState<AdminData | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function fetchAdmin() {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin", { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to load admin details");
            } else {
                setAdmin(data);
            }
        } catch {
            setError("Failed to load admin details");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAdmin();
    }, []);

    async function handleUpdatePassword(e: FormEvent) {
        e.preventDefault();
        setMessage("");
        setError("");
        if (!newPassword.trim()) {
            setError("Please enter a new password");
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ password: newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to update password");
            } else {
                setMessage("Admin password updated successfully");
                setNewPassword("");
                await fetchAdmin();
            }
        } catch {
            setError("Failed to update password");
        } finally {
            setSaving(false);
        }
    }

    return (
        <DashboardLayout>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Admin</h1>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Manage admin credentials</p>
            </div>

            {loading ? (
                <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading admin details…</div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <Card title="Admin Details">
                        <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
                            <div><strong>Username:</strong> {admin?.username ?? "-"}</div>
                            <div><strong>Password:</strong> {admin?.password ?? "-"}</div>
                            <div><strong>Admin ID:</strong> {admin?.admin_id ?? "-"}</div>
                        </div>
                    </Card>

                    <Card title="Create New Admin Password">
                        <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    fontSize: 14,
                                }}
                            />
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    width: "fit-content",
                                    padding: "10px 14px",
                                    background: "var(--primary)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    cursor: saving ? "not-allowed" : "pointer",
                                }}
                            >
                                {saving ? "Saving..." : "Update Password"}
                            </button>
                        </form>
                        {message ? <div style={{ marginTop: 10, color: "#16a34a", fontSize: 13 }}>{message}</div> : null}
                        {error ? <div style={{ marginTop: 10, color: "#dc2626", fontSize: 13 }}>{error}</div> : null}
                    </Card>
                </div>
            )}
        </DashboardLayout>
    );
}
