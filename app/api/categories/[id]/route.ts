import { auth } from "@/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { categoryCreateSchema } from "@/validation/schemas";
import { NextResponse } from "next/server";

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

  const parseResult = categoryCreateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "داده‌های نامعتبر", details: parseResult.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.category.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) {
    return NextResponse.json({ error: "دسته‌بندی یافت نشد" }, { status: 404 });
  }

  if (existing.isDefault) {
    return NextResponse.json({ error: "نمی‌توان دسته‌بندی پیش‌فرض را ویرایش کرد" }, { status: 400 });
  }

  const duplicate = await prisma.category.findFirst({
    where: { name: parseResult.data.name, userId: session.user.id, NOT: { id } },
  });
  if (duplicate) {
    return NextResponse.json({ error: "دسته‌بندی با این نام قبلاً وجود دارد" }, { status: 409 });
  }

  const category = await prisma.category.update({
    where: { id },
    data: parseResult.data,
  });

  return NextResponse.json({ data: category });
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

  const category = await prisma.category.findFirst({ where: { id, userId: session.user.id } });
  if (!category) {
    return NextResponse.json({ error: "دسته‌بندی یافت نشد" }, { status: 404 });
  }

  if (category.isDefault) {
    return NextResponse.json({ error: "نمی‌توان دسته‌بندی پیش‌فرض را حذف کرد" }, { status: 400 });
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}