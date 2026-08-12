import { auth } from "@/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { categoryCreateSchema } from "@/validation/schemas";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: session.user.id }, { userId: null }] },
    orderBy: [{ type: "asc" }, { nameFa: "asc" }],
  });

  return NextResponse.json({ data: categories });
}

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

  const parseResult = categoryCreateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "داده‌های نامعتبر", details: parseResult.error.flatten() }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: { ...parseResult.data, userId: session.user.id, isDefault: false },
  });

  return NextResponse.json({ data: category }, { status: 201 });
}