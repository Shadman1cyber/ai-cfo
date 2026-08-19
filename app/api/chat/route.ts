import { auth } from "@/api/auth/[...nextauth]/route";
import { processChatMessage } from "@/services/chat";
import { storage } from "@/services/storage";
import { prisma } from "@/lib/prisma";
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

  // Check content type to determine how to parse the body
  const contentType = request.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");
  
  if (isMultipart) {
    // Handle receipt upload for multipart/form-data requests
    try {
      const formData = await request.formData();
      const hasImage = formData.get("image") !== null;
      
      if (hasImage) {
        return await handleReceiptUploadFormData(formData);
      }
    } catch (e) {
      console.error("Failed to parse form data:", e);
    }
  }
  
  // Fall through to JSON handling for text messages

  // Original JSON handling for text messages
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

async function handleReceiptUploadFormData(formData: any) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز" }, { status: 401 });
  }

  const file = formData.get("image") as File;
  const message = formData.get("message") as string | null;
  const confirm = formData.get("confirm") as string | null;

  if (!file) {
    return NextResponse.json({ error: "فایل ارسال نشده" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Validate file type
  const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: "فرمتsupported نمی‌باشد. از JPG, PNG, WebP, PDF استفاده کنید" }, { status: 400 });
  }

  // Check file size (max 5MB)
  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۵ مگابایت باشد" }, { status: 400 });
  }

  // Save to storage
  try {
    const result = await storage.upload(buffer, file.name, file.type);
    
    // Return the receipt path for later OCR processing
    if (confirm === "1" && message) {
      // Create transaction without amount (will be filled later via chat)
      const transaction = await prisma.transaction.create({
        data: {
          type: "EXPENSE",
          description: message || "Receipt",
          amount: 0,  // Default amount, will be updated after OCR processing
          date: new Date().toISOString().split("T")[0],
          receiptUrl: result.path,
          userId: session.user.id,
        },
        include: { category: { select: { id: true, nameFa: true, icon: true, color: true } } },
      });
      
      return NextResponse.json({ 
        data: { transaction, receiptPath: result.path },
        status: "receipt_saved" 
      }, { status: 201 });
    }
    
    return NextResponse.json({ data: { path: result.path, status: "receipt_saved" } }, { status: 201 });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "آپلود فایل با خطا مواجه شد" }, { status: 500 });
  }
}