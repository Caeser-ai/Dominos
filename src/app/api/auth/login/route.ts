import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();
        if (!username || !password) {
            return NextResponse.json({ error: "Username and password required" }, { status: 400 });
        }

        const { data: admin, error } = await supabaseAdminClient
            .from("admins")
            .select("id, admin_id, admin_name, password")
            .eq("admin_name", username)
            .maybeSingle();

        if (error || !admin) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        if (admin.password !== password) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const adminId = String(admin.admin_id ?? admin.id);
        const adminName = String(admin.admin_name ?? username);
        const token = await signToken({ admin_id: adminId, username: adminName });
        const res = NextResponse.json({ token, username: adminName });
        res.cookies.set("admin_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 8,
            path: "/",
        });
        return res;
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete("admin_token");
    return res;
}
