import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || "receipts";

let supabase: ReturnType<typeof createClient> | null = null;

function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseServiceKey) return false;
  if (supabaseUrl.startsWith("your-") || supabaseServiceKey.startsWith("your-")) return false;
  try {
    new URL(supabaseUrl);
    return supabaseUrl.startsWith("http");
  } catch {
    return false;
  }
}

if (isSupabaseConfigured()) {
  supabase = createClient(supabaseUrl!, supabaseServiceKey!);
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface StorageProvider {
  upload(file: Buffer, fileName: string, mimeType: string): Promise<UploadResult>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
}

class SupabaseStorage implements StorageProvider {
  async upload(file: Buffer, fileName: string, mimeType: string): Promise<UploadResult> {
    if (!supabase) throw new Error("Supabase not configured");

    const path = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { data, error } = await supabase.storage.from(bucketName).upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);

    return { url: urlData.publicUrl, path: data.path, size: file.length, mimeType };
  }

  async delete(path: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    await supabase.storage.from(bucketName).remove([path]);
  }

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(path, expiresIn);
    if (error) throw new Error(`Signed URL failed: ${error.message}`);
    return data.signedUrl;
  }
}

class LocalStorage implements StorageProvider {
  private basePath = process.env.LOCAL_STORAGE_PATH || "./uploads";

  async upload(file: Buffer, fileName: string, mimeType: string): Promise<UploadResult> {
    const fs = await import("fs/promises");
    const path = await import("path");
    await fs.mkdir(this.basePath, { recursive: true });
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const fullPath = path.join(this.basePath, safeName);
    await fs.writeFile(fullPath, file);
    return { url: `/uploads/${safeName}`, path: safeName, size: file.length, mimeType };
  }

  async delete(path: string): Promise<void> {
    const fs = await import("fs/promises");
    await fs.unlink(`${this.basePath}/${path}`).catch(() => {});
  }

  async getSignedUrl(path: string): Promise<string> {
    return `/uploads/${path}`;
  }
}

export const storage: StorageProvider = supabase ? new SupabaseStorage() : new LocalStorage();

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateFile(file: Buffer, mimeType: string): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: "فرمت فایل پشتیبانی نمی‌شود (فقط JPG, PNG, WebP, PDF)" };
  }
  if (file.length > MAX_FILE_SIZE) {
    return { valid: false, error: "حجم فایل نباید از ۵ مگابایت بیشتر باشد" };
  }
  return { valid: true };
}