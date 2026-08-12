import { auth } from "@/api/auth/[...nextauth]/route";
import { processReceiptImage } from "@/services/ocr";
import { storage, validateFile } from "@/services/storage";
import { categorizeTransaction, seedDefaultCategories } from "@/services/categorize";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type باید multipart/form-data باشد", code: "INVALID_CONTENT_TYPE" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const autoCreate = formData.get("autoCreate") === "true";

  if (!file) {
    return NextResponse.json({ error: "فایل ارسال نشده", code: "NO_FILE" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateFile(buffer, file.type);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error, code: "INVALID_FILE" }, { status: 400 });
  }

  try {
    const ocrResult = await processReceiptImage(buffer, file.type);

    let transaction = null;
    if (autoCreate && ocrResult.data.amount) {
      const userCategories = await prisma.category.count({ where: { userId: session.user.id } });
      if (userCategories === 0) {
        await seedDefaultCategories(session.user.id);
      }

      let categoryId: string | undefined;
      if (ocrResult.data.merchant) {
        const categorization = await categorizeTransaction(
          session.user.id,
          ocrResult.data.merchant,
          ocrResult.data.amount,
          "EXPENSE"
        );
        categoryId = categorization.categoryId || undefined;
      }

      transaction = await prisma.transaction.create({
        data: {
          amount: ocrResult.data.amount,
          type: "EXPENSE",
          description: ocrResult.data.merchant || "تراکنش از رسید",
          date: ocrResult.data.date ? new Date(ocrResult.data.date) : new Date(),
          categoryId,
          userId: session.user.id,
        },
        include: { category: { select: { nameFa: true } } },
      });
    }

    const uploadResult = await storage.upload(buffer, file.name, file.type);

    return NextResponse.json({
      data: {
        ocr: ocrResult,
        transaction,
        receiptUrl: uploadResult.path,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("OCR processing error:", error);
    return NextResponse.json({ error: "پردازش رسید با خطا مواجه شد", code: "PROCESSING_ERROR" }, { status: 500 });
  }
}