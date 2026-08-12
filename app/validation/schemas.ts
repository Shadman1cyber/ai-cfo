import { z } from "zod";

export const transactionCreateSchema = z.object({
  amount: z.number().positive("مبلغ باید مثبت باشد").max(1e12, "مبلغ خیلی بزرگ است"),
  type: z.enum(["INCOME", "EXPENSE"], { message: "نوع باید درآمد یا هزینه باشد" }),
  description: z.string().max(500, "توضیحات خیلی طولانی است").optional(),
  date: z.string().datetime({ message: "فرمت تاریخ نامعتبر است" }).optional(),
  categoryId: z.string().cuid({ message: "شناسه دسته‌بندی نامعتبر است" }).optional(),
  receiptUrl: z.string().url({ message: "آدرس فایل نامعتبر است" }).optional(),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export const transactionFilterSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  categoryId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(["date", "amount", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد").max(100).optional(),
  email: z.string().email("فرمت ایمیل نامعتبر است"),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد").max(128),
});

export const loginSchema = z.object({
  email: z.string().email("فرمت ایمیل نامعتبر است"),
  password: z.string().min(1, "رمز عبور الزامی است"),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(50),
  nameFa: z.string().min(1).max(50),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, "پيام نمی‌تواند خالی باشد").max(1000, "پیام خیلی طولانی است"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .max(12)
    .optional(),
});

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;