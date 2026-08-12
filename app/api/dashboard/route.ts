import { auth } from "@/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date = { ...(where.date as object), gte: new Date(startDate) };
    if (endDate) where.date = { ...(where.date as object), lte: new Date(endDate) };
  }

  const [incomeAgg, expenseAgg, categoryBreakdown, recentTransactions] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...where, type: "INCOME" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: "EXPENSE" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.transaction.findMany({
      where,
      include: { category: { select: { id: true, name: true, nameFa: true, icon: true, color: true } } },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: session.user.id }, { userId: null }] },
    select: { id: true, name: true, nameFa: true, icon: true, color: true, type: true },
  });

  const categoryMap = new Map<string, { id: string; name: string; nameFa: string; icon: string | null; color: string | null; type: string }>(
    categories.map((c: { id: string; name: string; nameFa: string; icon: string | null; color: string | null; type: string }) => [c.id, c])
  );

  const breakdown = categoryBreakdown.map((item: { categoryId: string | null; type: string; _sum: { amount: Prisma.Decimal | null }; _count: number }) => ({
    category: categoryMap.get(item.categoryId || "") || { id: item.categoryId, nameFa: "بدون دسته", icon: "❓", color: "#94A3B8" },
    type: item.type,
    totalAmount: Number(item._sum.amount || 0),
    count: item._count,
  }));

  const income = Number(incomeAgg._sum.amount || 0);
  const expense = Number(expenseAgg._sum.amount || 0);

  return NextResponse.json({
    data: {
      summary: {
        income,
        expense,
        balance: income - expense,
        incomeCount: incomeAgg._count,
        expenseCount: expenseAgg._count,
      },
      categoryBreakdown: breakdown,
      recentTransactions,
    },
  });
}