import { auth } from "@/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { transactionCreateSchema, transactionFilterSchema } from "@/validation/schemas";
import { categorizeTransaction, seedDefaultCategories } from "@/services/categorize";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parseResult = transactionFilterSchema.safeParse(Object.fromEntries(searchParams));

  if (!parseResult.success) {
    return NextResponse.json({ error: "پارامترهای نامعتبر", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { type, categoryId, startDate, endDate, minAmount, maxAmount, search, page, limit, sortBy, sortOrder } =
    parseResult.data;

  const where: Record<string, unknown> = { userId: session.user.id };

  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date = { ...(where.date as object), gte: new Date(startDate) };
    if (endDate) where.date = { ...(where.date as object), lte: new Date(endDate) };
  }
  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined) where.amount = { ...(where.amount as object), gte: minAmount };
    if (maxAmount !== undefined) where.amount = { ...(where.amount as object), lte: maxAmount };
  }
  if (search) {
    where.description = { contains: search, mode: "insensitive" };
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: { select: { id: true, name: true, nameFa: true, icon: true, color: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({
    data: transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
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

  const parseResult = transactionCreateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "داده‌های نامعتبر", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { amount, type, description, date, categoryId, receiptUrl } = parseResult.data;

  const userCategories = await prisma.category.count({ where: { userId: session.user.id } });
  if (userCategories === 0) {
    await seedDefaultCategories(session.user.id);
  }

  let finalCategoryId = categoryId;
  let categorization: { categoryId: string | null; categoryName: string; confidence: number; fallback: boolean } | null = null;

  if (!finalCategoryId && description) {
    const timeout = new Promise<{ categoryId: string | null; categoryName: string; confidence: number; fallback: boolean } | null>(
      (resolve) => setTimeout(() => resolve(null), 2500)
    );
    categorization = await Promise.race([categorizeTransaction(session.user.id, description, amount, type), timeout]);
    finalCategoryId = categorization?.categoryId || undefined;
  }

  const transaction = await prisma.transaction.create({
    data: {
      amount,
      type,
      description,
      date: date ? new Date(date) : new Date(),
      categoryId: finalCategoryId,
      receiptUrl,
      userId: session.user.id,
    },
    include: { category: { select: { id: true, name: true, nameFa: true, icon: true, color: true } } },
  });

  logger.info(
    { userId: session.user.id, transactionId: transaction.id, categorization: categorization?.fallback ? "fallback" : "ai" },
    "Transaction created"
  );

  return NextResponse.json({ data: transaction, categorization }, { status: 201 });
}