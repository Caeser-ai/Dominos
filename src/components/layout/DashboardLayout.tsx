"use client";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
            <Sidebar />
            <main
                style={{
                    marginLeft: "var(--sidebar-width)",
                    flex: 1,
                    padding: "32px",
                    minHeight: "100vh",
                    overflow: "auto",
                }}
            >
                {children}
            </main>
        </div>
    );
}
