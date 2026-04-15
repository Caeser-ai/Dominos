"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import KpiCard from "@/components/ui/KpiCard";
import {
    DollarSign, TrendingUp, TrendingDown, Users, UserCheck, Clock,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from "recharts";

const COLORS = ["#e8002d", "#2563eb", "#16a34a", "#d97706", "#7c3aed"];

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{title}</h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{subtitle}</p>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: "var(--text)" }}>{title}</h3>
            {children}
        </div>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        fetch("/api/dashboard/stats", { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text-muted)", fontSize: 14 }}>
                    Loading dashboard…
                </div>
            </DashboardLayout>
        );
    }

    const { kpis, charts } = data ?? {};

    return (
        <DashboardLayout>
            <PageHeader title="Dashboard" subtitle="Overview of your platform activity" />

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
                <KpiCard label="Total Balance" value={kpis.totalBalance} prefix="₹" icon={DollarSign} color="#e8002d" />
                <KpiCard label="Total Deposits" value={kpis.totalDeposits} prefix="₹" icon={TrendingUp} color="#16a34a" />
                <KpiCard label="Total Withdrawals" value={kpis.totalWithdrawals} prefix="₹" icon={TrendingDown} color="#2563eb" />
                <KpiCard label="Total Users" value={kpis.totalUsers} icon={Users} color="#7c3aed" />
                <KpiCard label="Active Users" value={kpis.activeUsers} icon={UserCheck} color="#d97706" />
                <KpiCard label="Pending Withdrawals" value={kpis.pendingWithdrawals} icon={Clock} color="#e8002d" />
            </div>

            {/* Charts Grid */}
            <div style={{ marginBottom: 20 }}>
                <ChartCard title="Deposits vs Withdrawals (last 7 days)">
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={charts.depositsVsWithdrawals} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend iconType="circle" iconSize={8} />
                            <Bar dataKey="deposits" name="Deposits" fill="#16a34a" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="withdrawals" name="Withdrawals" fill="#e8002d" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <ChartCard title="Transaction Status Distribution">
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={charts.transactionStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
                                {charts.transactionStatus.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="System Activity (last 7 days)">
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={charts.systemActivity}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" name="Transactions" stroke="#e8002d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </DashboardLayout>
    );
}
