import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabase";

export async function GET(req: Request) {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const payload = await verifyToken(token);
        const { data: admin, error } = await supabaseAdminClient
            .from("admins")
            .select("id, admin_id, admin_name, password, created_at")
            .or(`admin_id.eq.${payload.admin_id},id.eq.${payload.admin_id}`)
            .maybeSingle();
        if (error || !admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

        return NextResponse.json({
            admin_id: String(admin.admin_id ?? admin.id),
            username: String(admin.admin_name ?? payload.username),
            password: String(admin.password ?? ""),
            created_at: admin.created_at,
        });
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

export async function PATCH(req: Request) {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try {
        payload = await verifyToken(token);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const newPassword = body?.password;

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const { error } = await supabaseAdminClient
        .from("admins")
        .update({ password: newPassword.trim() })
        .or(`admin_id.eq.${payload.admin_id},id.eq.${payload.admin_id}`);
    if (error) return NextResponse.json({ error: error.message || "Failed to update password" }, { status: 400 });

    return NextResponse.json({ ok: true, admin_id: payload.admin_id, username: payload.username });
}
