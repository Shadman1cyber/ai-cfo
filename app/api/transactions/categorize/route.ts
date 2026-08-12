import { auth } from "@/api/auth/[...nextauth]/route";
import { categorizeTransaction } from "@/services/categorize";
import { NextResponse } from "next/server";
import { z } from "zod";

const categorizeSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر" }, { status: 400 });
  }

  const parseResult = categorizeSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "داده‌های نامعتبر", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { description, amount, type } = parseResult.data;

  const result = await categorizeTransaction(session.user.id, description, amount, type);

  return NextResponse.json({ data: result });
}