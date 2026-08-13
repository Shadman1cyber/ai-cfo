import { signOut } from "@/api/auth/[...nextauth]/route";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  await signOut({ redirect: false });
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? "localhost:3000";
  return NextResponse.redirect(`${proto}://${host}/login`);
}
