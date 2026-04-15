export default function NotFound() {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
                fontFamily: "Arial, sans-serif",
            }}
        >
            <h1 style={{ fontSize: 28, margin: 0 }}>404</h1>
            <p style={{ margin: 0, color: "#6b7280" }}>Page not found.</p>
        </div>
    );
}
