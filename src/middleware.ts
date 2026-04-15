import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? "dominos-super-secret-jwt-key-2024"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Skip Next.js internals and static
    if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
        return NextResponse.next();
    }

    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        await jwtVerify(token, SECRET);
        return NextResponse.next();
    } catch {
        const res = NextResponse.redirect(new URL("/login", req.url));
        res.cookies.delete("admin_token");
        return res;
    }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
