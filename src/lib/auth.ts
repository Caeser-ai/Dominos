import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? "dominos-super-secret-jwt-key-2024"
);

export type JwtPayload = {
    admin_id: string;
    username: string;
};

export async function signToken(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JwtPayload;
}

export function extractToken(req: Request): string | null {
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
        const bearer = auth.slice(7).trim();
        if (bearer && bearer !== "null" && bearer !== "undefined") {
            return bearer;
        }
    }

    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
        const cookieParts = cookieHeader.split(";");
        for (const part of cookieParts) {
            const [rawKey, ...rawValueParts] = part.trim().split("=");
            if (rawKey === "admin_token") {
                const value = rawValueParts.join("=").trim();
                if (value) return decodeURIComponent(value);
            }
        }
    }

    return null;
}
