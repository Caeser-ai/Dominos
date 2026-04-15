import { type LucideIcon } from "lucide-react";

interface KpiCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color?: string;
    prefix?: string;
}

export default function KpiCard({ label, value, icon: Icon, color = "#e8002d", prefix = "" }: KpiCardProps) {
    return (
        <div
            style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
        >
            <div
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                <Icon size={22} color={color} />
            </div>
            <div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
                    {prefix}{typeof value === "number" ? value.toLocaleString() : value}
                </div>
            </div>
        </div>
    );
}
