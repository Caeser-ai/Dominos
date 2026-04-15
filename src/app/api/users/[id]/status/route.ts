import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabase";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try { await verifyToken(token); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const { id } = await params;
    const { status } = await req.json();
    if (!["active", "blocked"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdminClient
        .from("players")
        .update({ is_active: status === "active", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id, display_name, email, is_active, updated_at")
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
        user_id: updated.id,
        username: updated.display_name || updated.email || "Unknown",
        status: updated.is_active ? "active" : "blocked",
        created_at: updated.updated_at,
    });
}
