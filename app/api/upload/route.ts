import { auth } from "@/api/auth/[...nextauth]/route";
import { storage, validateFile } from "@/services/storage";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مجاز" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type باید multipart/form-data باشد" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "فایل ارسال نشده" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateFile(buffer, file.type);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await storage.upload(buffer, file.name, file.type);

    logger.info(
      { userId: session.user.id, fileName: file.name, size: file.size, path: result.path },
      "Receipt uploaded"
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    logger.error({ error, userId: session.user.id }, "Upload failed");
    return NextResponse.json({ error: "آپلود فایل با خطا مواجه شد" }, { status: 500 });
  }
}