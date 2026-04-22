/**
 * Owner authentication for Next.js API routes.
 *
 * Checks the `x-owner-key` header against OWNER_API_KEY env var.
 * All /api/owner/* routes call this before doing anything else.
 *
 * Usage in a route handler:
 *   const authError = requireOwnerAuth(request);
 *   if (authError) return authError;
 */
import { NextRequest, NextResponse } from "next/server";

export function requireOwnerAuth(req: NextRequest): NextResponse | null {
  const apiKey = process.env.OWNER_API_KEY;

  if (!apiKey) {
    // Misconfigured server — fail closed
    return NextResponse.json(
      { error: "Server misconfigured: OWNER_API_KEY is not set." },
      { status: 500 },
    );
  }

  const provided = req.headers.get("x-owner-key");
  if (!provided || provided !== apiKey) {
    return NextResponse.json(
      { error: "Unauthorised. Provide a valid x-owner-key header." },
      { status: 401 },
    );
  }

  return null; // auth passed
}
