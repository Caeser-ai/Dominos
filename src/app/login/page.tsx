"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pizza, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Login failed");
            } else {
                localStorage.setItem("admin_token", data.token);
                localStorage.setItem("admin_username", data.username);
                router.push("/dashboard");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #fff5f6 0%, #f8f9fb 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
            }}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "40px 36px",
                    width: "100%",
                    maxWidth: 400,
                    boxShadow: "0 8px 40px rgba(232,0,45,0.08)",
                    border: "1px solid var(--border)",
                }}
            >
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div
                        style={{
                            width: 56,
                            height: 56,
                            background: "var(--primary)",
                            borderRadius: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 14px",
                        }}
                    >
                        <Pizza size={28} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                        Dominos Admin
                    </h1>
                    <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Sign in to your admin panel</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin"
                            required
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                border: `1.5px solid ${error ? "#dc2626" : "var(--border)"}`,
                                borderRadius: 8,
                                fontSize: 14,
                                outline: "none",
                                transition: "border-color 0.15s",
                                boxSizing: "border-box",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#e8002d")}
                            onBlur={(e) => (e.target.style.borderColor = error ? "#dc2626" : "var(--border)")}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
                            Password
                        </label>
                        <div style={{ position: "relative" }}>
                            <input
                                type={showPw ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px 40px 10px 14px",
                                    border: `1.5px solid ${error ? "#dc2626" : "var(--border)"}`,
                                    borderRadius: 8,
                                    fontSize: 14,
                                    outline: "none",
                                    transition: "border-color 0.15s",
                                    boxSizing: "border-box",
                                }}
                                onFocus={(e) => (e.target.style.borderColor = "#e8002d")}
                                onBlur={(e) => (e.target.style.borderColor = error ? "#dc2626" : "var(--border)")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                style={{
                                    position: "absolute",
                                    right: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--text-muted)",
                                    padding: 0,
                                    display: "flex",
                                }}
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div
                            style={{
                                background: "#fff0f0",
                                border: "1px solid #fecaca",
                                borderRadius: 8,
                                padding: "10px 14px",
                                fontSize: 13,
                                color: "#dc2626",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "12px",
                            background: loading ? "#f0a0aa" : "var(--primary)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            transition: "background 0.15s",
                        }}
                    >
                        {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                </form>

                <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                    Sign in with your Supabase admin email and password
                </p>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
