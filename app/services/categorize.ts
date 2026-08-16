import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface CategorizationResult {
  categoryId: string | null;
  categoryName: string;
  confidence: number;
  fallback: boolean;
}

const zhipuClient = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY ?? "not-configured",
  baseURL: process.env.ZHIPU_BASE_URL,
  timeout: 15000,
});

const isZhipuConfigured = () =>
  !!process.env.ZHIPU_API_KEY && !process.env.ZHIPU_API_KEY.startsWith("your-");

const CATEGORIZATION_PROMPT = `شما یک سیستم دسته‌بندی تراکنش‌های مالی برای کسب‌وکام‌های کوچک و متوسط ایران هستید.
دسته‌بندی‌های موجود (نام، نوع، آیکون):
{categories}

تراکنش: "{description}"
مبلغ: {amount} تومان
نوع: {type}

فقط شناسه دسته‌بندی (id) را برگردانید. اگر هیچ‌کدام مناسب نیستند، "none" برگردانید.
فرمت پاسخ: {"categoryId": "xxx", "confidence": 0.9}`;

export async function categorizeTransaction(
  userId: string,
  description: string,
  amount: number,
  type: "INCOME" | "EXPENSE"
): Promise<CategorizationResult> {
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId }, { userId: null }],
      type: type,
    },
    select: { id: true, name: true, nameFa: true, icon: true, type: true },
  });

  if (categories.length === 0) {
    return { categoryId: null, categoryName: "بدون دسته", confidence: 0, fallback: true };
  }

  const categoryList = categories
    .map((c: { id: string; nameFa: string; name: string; icon: string | null }) => `- ${c.id}: ${c.nameFa} (${c.name}) [${c.icon || "—"}]`)
    .join("\n");

  const prompt = CATEGORIZATION_PROMPT.replace("{categories}", categoryList)
    .replace("{description}", description)
    .replace("{amount}", amount.toLocaleString("fa-IR"))
    .replace("{type}", type === "INCOME" ? "درآمد" : "هزینه");

  if (!isZhipuConfigured()) {
    return fallbackCategorize(categories, description, type);
  }

  try {
    const completion = await zhipuClient.chat.completions.create({
      model: process.env.ZHIPU_MODEL || "glm-4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content || typeof content !== "string") throw new Error("Empty response");

    const trimmed = content.trim();
    if (!trimmed) throw new Error("Empty response");

    const parsed = JSON.parse(trimmed);
    const categoryId = parsed.categoryId;

    if (categoryId === "none" || !categoryId) {
      return { categoryId: null, categoryName: "بدون دسته", confidence: 0, fallback: true };
    }

    const matched = categories.find((c: { id: string }) => c.id === categoryId);
    if (!matched) {
      return { categoryId: null, categoryName: "بدون دسته", confidence: 0, fallback: true };
    }

    return {
      categoryId: matched.id,
      categoryName: matched.nameFa,
      confidence: parsed.confidence || 0.8,
      fallback: false,
    };
  } catch (error) {
    logger.warn({ error, userId, description }, "Zhipu categorization failed, using fallback");
    return fallbackCategorize(categories, description, type);
  }
}

function fallbackCategorize(
  categories: { id: string; nameFa: string; name: string }[],
  description: string,
  type: "INCOME" | "EXPENSE"
): CategorizationResult {
  const keywords: Record<string, string[]> = {
    income: ["فروش", "درآمد", "حقوق", "مزد", "پاداش", "سود", "واریز"],
    expense: ["خرید", "پرداخت", "اجاره", "حق", "قبض", "برق", "گاز", "آب", "اینترنت", "تلفن", "تبلیغ", "مرکز", "سفر", "بیمه", "مالیات"],
  };

  const desc = description.toLowerCase();
  const relevantKeywords = keywords[type.toLowerCase()] || [];

  for (const cat of categories) {
    const catName = cat.nameFa.toLowerCase();
    if (relevantKeywords.some((k) => desc.includes(k) || catName.includes(k))) {
      return { categoryId: cat.id, categoryName: cat.nameFa, confidence: 0.6, fallback: true };
    }
  }

  const defaultCat = categories[0];
  return { categoryId: defaultCat.id, categoryName: defaultCat.nameFa, confidence: 0.3, fallback: true };
}

export async function seedDefaultCategories(userId?: string) {
  const defaultCategories = [
    { name: "salary", nameFa: "حقوق و دستمزد", icon: "💼", color: "#10B981", type: "INCOME" as const },
    { name: "sales", nameFa: "فروش کالا/خدمات", icon: "🛍️", color: "#059669", type: "INCOME" as const },
    { name: "other_income", nameFa: "سایر درآمدها", icon: "💰", color: "#34D399", type: "INCOME" as const },
    { name: "rent", nameFa: "اجاره محل", icon: "🏢", color: "#EF4444", type: "EXPENSE" as const },
    { name: "utilities", nameFa: "قبوض (برق/گاز/آب/اینترنت)", icon: "💡", color: "#F97316", type: "EXPENSE" as const },
    { name: "inventory", nameFa: "خرید کالا/موجودی", icon: "📦", color: "#F59E0B", type: "EXPENSE" as const },
    { name: "marketing", nameFa: "تبلیغات و بازاریابی", icon: "📢", color: "#EC4899", type: "EXPENSE" as const },
    { name: "transport", nameFa: "انتقال و سفر", icon: "🚗", color: "#8B5CF6", type: "EXPENSE" as const },
    { name: "insurance", nameFa: "بیمه", icon: "🛡️", color: "#6366F1", type: "EXPENSE" as const },
    { name: "tax", nameFa: "مالیات و تعرفه", icon: "📋", color: "#64748B", type: "EXPENSE" as const },
    { name: "other_expense", nameFa: "سایر هزینه‌ها", icon: "💸", color: "#94A3B8", type: "EXPENSE" as const },
  ];

  for (const cat of defaultCategories) {
    const uid = userId ?? null;
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, userId: uid },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { nameFa: cat.nameFa, icon: cat.icon, color: cat.color, type: cat.type, isDefault: true },
      });
    } else {
      await prisma.category.create({
        data: { name: cat.name, nameFa: cat.nameFa, icon: cat.icon, color: cat.color, type: cat.type, isDefault: true, userId: uid ?? undefined },
      });
    }
  }
}