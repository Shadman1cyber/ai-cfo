import { auth } from "@/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { transactionUpdateSchema } from "@/validation/schemas";
import { categorizeTransaction } from "@/services/categorize";
import { storage, validateFile } from "@/services/storage";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز" }, { status: 401 });
  }

  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
    include: { category: { select: { id: true, name: true, nameFa: true, icon: true, color: true } } },
  });

  if (!transaction) {
    return NextResponse.json({ error: "تراکنش یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ data: transaction });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر" }, { status: 400 });
  }

  const parseResult = transactionUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "داده‌های نامعتبر", details: parseResult.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.transaction.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) {
    return NextResponse.json({ error: "تراکنش یافت نشد" }, { status: 404 });
  }

  const { amount, type, description, date, categoryId, receiptUrl } = parseResult.data;

  let finalCategoryId: string | null | undefined = categoryId ?? existing.categoryId;
  let categorization: { categoryId: string | null; categoryName: string; confidence: number; fallback: boolean } | null = null;

  if (description && description !== existing.description && !categoryId) {
    categorization = await categorizeTransaction(session.user.id, description, amount ?? Number(existing.amount), type ?? existing.type);
    finalCategoryId = categorization.categoryId ?? undefined;
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      amount: amount ?? undefined,
      type: type ?? undefined,
      description: description ?? undefined,
      date: date ? new Date(date) : undefined,
      categoryId: finalCategoryId,
      receiptUrl: receiptUrl ?? undefined,
    },
    include: { category: { select: { id: true, name: true, nameFa: true, icon: true, color: true } } },
  });

  logger.info({ userId: session.user.id, transactionId: id }, "Transaction updated");

  return NextResponse.json({ data: transaction, categorization });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز" }, { status: 401 });
  }

  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({ where: { id, userId: session.user.id } });
  if (!transaction) {
    return NextResponse.json({ error: "تراکنش یافت نشد" }, { status: 404 });
  }

  if (transaction.receiptUrl) {
    try {
      await storage.delete(transaction.receiptUrl);
    } catch (e) {
      logger.warn({ error: e, receiptUrl: transaction.receiptUrl }, "Failed to delete receipt file");
    }
  }

  await prisma.transaction.delete({ where: { id } });

  logger.info({ userId: session.user.id, transactionId: id }, "Transaction deleted");

  return NextResponse.json({ success: true });
}