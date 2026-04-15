"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    ArrowLeftRight,
    ArrowDownToLine,
    ShieldCheck,
    LogOut,
    Pizza,
} from "lucide-react";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
    { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    { href: "/user_details", label: "Users Details", icon: Users },
    { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

    useEffect(() => {
        let mounted = true;

        const fetchPendingCount = async () => {
            try {
                const token = localStorage.getItem("admin_token");
                if (!token) return;
                const res = await fetch("/api/withdrawals/pending", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (mounted && res.ok) {
                    setPendingWithdrawals(Number(data.pending ?? 0));
                }
            } catch {
                // Non-blocking sidebar indicator
            }
        };

        fetchPendingCount();
        const interval = window.setInterval(fetchPendingCount, 15000);
        return () => {
            mounted = false;
            window.clearInterval(interval);
        };
    }, [pathname]);

    async function handleLogout() {
        await fetch("/api/auth/login", { method: "DELETE" });
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_username");
        router.push("/login");
    }

    return (
        <aside
            style={{
                width: "var(--sidebar-width)",
                minHeight: "100vh",
                background: "#fff",
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: 50,
            }}
        >
            {/* Logo */}
            <div
                style={{
                    padding: "24px 20px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                }}
            >
                <div
                    style={{
                        background: "var(--primary)",
                        borderRadius: 10,
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Pizza size={20} color="#fff" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Dominos</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Admin Panel</div>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 12px",
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: active ? 600 : 400,
                                color: active ? "var(--primary)" : "var(--text-muted)",
                                background: active ? "#fff0f2" : "transparent",
                                transition: "all 0.15s",
                                textDecoration: "none",
                            }}
                        >
                            <Icon size={18} />
                            <span style={{ flex: 1 }}>{label}</span>
                            {href === "/withdrawals" && pendingWithdrawals > 0 ? (
                                <span
                                    style={{
                                        minWidth: 20,
                                        height: 20,
                                        borderRadius: 999,
                                        background: "#dc2626",
                                        color: "#fff",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "0 6px",
                                    }}
                                    title={`${pendingWithdrawals} pending withdrawals`}
                                >
                                    {pendingWithdrawals > 99 ? "99+" : pendingWithdrawals}
                                </span>
                            ) : null}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 400,
                        color: "#dc2626",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fff0f0")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
