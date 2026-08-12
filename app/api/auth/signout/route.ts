import { handlers } from "@/api/auth/[...nextauth]/route";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  await handlers.POST(request);
  return NextResponse.json({ success: true });
}