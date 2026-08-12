import { auth } from "@/api/auth/[...nextauth]/route";
import { processChatMessage } from "@/services/chat";
import { NextResponse } from "next/server";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    console.error("JSON parse error:", e);
    return NextResponse.json({ error: "بدنه درخواست نامعتبر", code: "INVALID_JSON" }, { status: 400 });
  }

  const parseResult = chatSchema.safeParse(body);
  if (!parseResult.success) {
    console.error("Validation error:", parseResult.error.flatten());
    return NextResponse.json({ error: "داده‌های نامعتبر", code: "VALIDATION_ERROR", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { message, history = [] } = parseResult.data;

  try {
    const result = await processChatMessage(session.user.id, message, history);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Chat processing error:", error);
    return NextResponse.json({ error: "خطا در پردازش پیام", code: "PROCESSING_ERROR" }, { status: 500 });
  }
}