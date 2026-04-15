import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Dominos Admin Panel",
    description: "Admin panel for managing users, wallets, transactions and withdrawals",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
