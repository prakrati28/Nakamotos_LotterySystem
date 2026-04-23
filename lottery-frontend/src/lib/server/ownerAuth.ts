import { NextRequest, NextResponse } from "next/server";

export function requireOwnerAuth(req: NextRequest): NextResponse | null {
  const apiKey = process.env.OWNER_API_KEY;

  if (!apiKey) {
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

  return null;
}
