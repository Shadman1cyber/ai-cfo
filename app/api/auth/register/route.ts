import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { registerSchema } from "@/validation/schemas";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { seedDefaultCategories } from "@/services/categorize";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر" }, { status: 400 });
  }

  const parseResult = registerSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "داده‌های نامعتبر", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = parseResult.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "این ایمیل قبلاً ثبت‌نام کرده است" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  await seedDefaultCategories(user.id);

  logger.info({ userId: user.id, email }, "User registered");

  return NextResponse.json({ data: user }, { status: 201 });
}