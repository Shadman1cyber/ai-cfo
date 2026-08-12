import { storage } from "@/services/storage";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = path.join("/");

  try {
    const signedUrl = await storage.getSignedUrl(filePath);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
  }
}