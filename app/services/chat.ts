import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { categorizeTransaction } from "./categorize";

async function fallbackKeywordProcessing(userId: string, message: string): Promise<ChatAction> {
  const lower = message.toLowerCase();

  if (/(خلاصه|صورت مالی|وضعیت مالی|گزارش مالی)/i.test(message)) {
    try {
      return await handleGetSummary(userId, {}, "");
    } catch (error) {
      logger.warn({ error, userId }, "Fallback summary failed");
    }
  }

  if (/(تراکنش|لیست آخرین|آخرین تراکنش|نشون بده|نمایش)/i.test(message) && /تراکنش/i.test(message)) {
    try {
      return await handleGetTransactions(userId, {}, "");
    } catch (error) {
      logger.warn({ error, userId }, "Fallback transactions failed");
    }
  }

  if (/(دسته|دسته‌بندی)/i.test(message)) {
    try {
      return await handleGetCategories(userId, {}, "");
    } catch (error) {
      logger.warn({ error, userId }, "Fallback categories failed");
    }
  }

  // Simple keyword-based fallback
  if (/(پیش‌بینی|آیا باید|چه کار کنم)/i.test(lower)) {
    return {
      type: "unknown",
      params: {},
      response: "برای پیش‌بینی جریان نقدینگی، بهتر است روند درآمد و هزینه‌های چند ماه اخیر را بررسی کنید و یک متخصص مالی برای تحلیل دقیق‌تر کمک بگیرید.",
    };
  }

  if (/(هزینه|درآمد|بدهی|فروش)/i.test(lower)) {
    return {
      type: "unknown",
      params: {},
      response: "برای مدیریت هزینه‌ها و بهینه‌کردن آن‌ها، پیشنهاد می‌کنم درآمد و هزینه‌های خود را بررسی کنید. اگر سؤال مشخص‌تری دارید، بپرسید.",
    };
  }

  return {
    type: "unknown",
    params: {},
    response: "متوجه نشدم، لطفاً دوباره بپرسید یا از گزینه‌های پیشنهادی انتخاب کنید.",
  };
}

const zhipuClient = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY ?? "not-configured",
  baseURL: process.env.ZHIPU_BASE_URL,
  timeout: 30000,
});

const isZhipuConfigured = () =>
  !!process.env.ZHIPU_API_KEY && !process.env.ZHIPU_API_KEY.startsWith("your-");

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatAction {
  type: "create_transaction" | "update_transaction" | "delete_transaction" | 
        "create_category" | "update_category" | "delete_category" |
        "get_summary" | "get_transactions" | "get_categories" | "unknown";
  params: Record<string, unknown>;
  response: string;
}

const SYSTEM_PROMPT = `شما یک دستیار مالی هوشمند و مدیر مالی (CFO) مجازی برای کسب‌وکام‌های کوچک و متوسط ایران هستید.

**شخصیت و لحن:**
- حرفه‌ای، دوستانه، و قابل اعتماد
- مثل یک CFO واقعی مشورت دهید، نه فقط دستور اجرا کنید
- زبان ساده، بدون زاین‌های تخصصی غیرضروری
- همیشه به فارسی پاسخ دهید

**نقش‌های شما:**
1. **اجرا کننده**: ثبت تراکنش، دسته‌بندی، حذف/ویرایش
2. **تحلیل‌گر مالی**: خلاصه، روندها، هشدارها، پیش‌بینی ساده
3. **مشاور CFO**: نکات مالی، بهینه‌سازی هزینه، مدیریت جریان نقدینگی

**عمليات قابل اجرا (action):**
- create_transaction: ثبت درآمد/هزینه
- get_summary: خلاصه مالی + تحلیل
- get_transactions: لیست تراکنش‌ها
- get_categories: دسته‌بندی‌ها
- create_category: دسته جدید
- delete_transaction: حذف تراکنش

**قوانین:**
- مبالغ بر حسب تومان، با جداکننده هزارگان
- تاریخ‌ها YYYY-MM-DD
- نوع تراکنش: INCOME (درآمد) / EXPENSE (هزینه)
- اگر هدف مبهم است (مثل "صورت مالی"، "وضعیت مالی") → هم خلاصه بدهید هم تحلیل کوتاه CFO بدهید
- اگر مطمئن نیستید، سوال پرسید اما سعی کنید مفید باشید
- همیشه action مناسب را برگردانید، unknown کمتر بگذارید

**فرمت پاسخ اکشن‌ها:**
{
  "action": "create_transaction",
  "params": { "amount": 500000, "type": "EXPENSE", "description": "خرید کالا", "date": "2024-01-15" },
  "response": "✅ تراکنش ۵۰۰ هزار تومان هزینه خرید کالا ثبت شد."
}

**برای unknown (مکالمه عادی):** پاسخ طبیعی CFO بدهید، action="unknown"

---

**مثال‌های تشخیص هدف:**

| پیام کاربر | Action |
|------------|--------|
| "خلاصه مالی" / "صورت مالی" / "وضعیت مالی" / "بهم صورت مالی بده" | get_summary |
| "تراکنش‌ها" / "آخرین تراکنش‌ها" / "لیست تراکنش‌ها" | get_transactions |
| "دسته‌بندی‌ها" / "لیست دسته‌ها" | get_categories |
| "تراکنش ۵۰۰ هزار هزینه ناهار" / "درآمد ۲ میلیون فروش کالا" | create_transaction |
| "دسته تبلیغات اضافه کن" | create_category |
| "آخرین تراکنش رو حذف کن" | delete_transaction |
| "چطور می‌تونم هزینه کم کنم؟" / "نقدینگی چطوره؟" | unknown + مشورت CFO |`;

export async function processChatMessage(
  userId: string,
  message: string,
  history: ChatMessage[] = []
): Promise<ChatAction> {
  if (!isZhipuConfigured()) {
    return fallbackKeywordProcessing(userId, message);
  }

  try {
    const categories = await prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      select: { id: true, name: true, nameFa: true, type: true },
    });

    const categoryList = categories
      .map((c) => `- ${c.id}: ${c.nameFa} (${c.type})`)
      .join("\n");

    const prompt = `${SYSTEM_PROMPT}

دسته‌بندی‌های موجود:
${categoryList}

تاریخ امروز: ${new Date().toISOString().split("T")[0]}

تاریخچه چت:
${history.map((m) => `${m.role}: ${m.content}`).join("\n")}

پیام کاربر: ${message}`;

    const completion = await zhipuClient.chat.completions.create({
      model: process.env.ZHIPU_MODEL || "glm-4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") throw new Error("Empty response");

    const trimmed = rawContent.trim();
    if (!trimmed) throw new Error("Empty response");

    let parsed: { action?: string; params?: Record<string, unknown>; response?: string };
    try {
      parsed = JSON.parse(trimmed);
    } catch (parseError) {
      // AI didn't return valid JSON - use fallback keyword matching
      logger.warn({ userId, rawContent }, "AI returned invalid JSON, using fallback");
      return fallbackKeywordProcessing(userId, message);
    }

    const actionType = parsed.action || "unknown";
    const params = parsed.params || {};
    const response = parsed.response || "متوجه نشدم، لطفاً دوباره بپرسید.";

    let result: ChatAction;

    switch (actionType) {
      case "create_transaction":
        result = await handleCreateTransaction(userId, params, response);
        break;
      case "update_transaction":
        result = await handleUpdateTransaction(userId, params, response);
        break;
      case "delete_transaction":
        result = await handleDeleteTransaction(userId, params, response);
        break;
      case "create_category":
        result = await handleCreateCategory(userId, params, response);
        break;
      case "update_category":
        result = await handleUpdateCategory(userId, params, response);
        break;
      case "delete_category":
        result = await handleDeleteCategory(userId, params, response);
        break;
      case "get_summary":
        result = await handleGetSummary(userId, params, response);
        break;
      case "get_transactions":
        result = await handleGetTransactions(userId, params, response);
        break;
      case "get_categories":
        result = await handleGetCategories(userId, params, response);
        break;
      default:
        result = { type: "unknown", params: {}, response };
    }

    return result;
  } catch (error) {
    logger.error({ error, userId, message }, "Chat processing failed");
    // Return fallback instead of throwing to prevent JSON parse error in UI
    return fallbackKeywordProcessing(userId, message);
  }
}

async function handleCreateTransaction(
  userId: string,
  params: Record<string, unknown>,
  response: string
): Promise<ChatAction> {
  const amount = Number(params.amount);
  const type = params.type as "INCOME" | "EXPENSE";
  const description = params.description as string;
  const date = params.date ? new Date(params.date as string) : new Date();

  if (!amount || !type || !description) {
    return { type: "create_transaction", params, response: "مبلغ، نوع و توضیح الزامی هستند." };
  }

  let categoryId = params.categoryId as string | undefined;
  if (!categoryId && description) {
    const categorization = await categorizeTransaction(userId, description, amount, type);
    categoryId = categorization.categoryId || undefined;
  }

  const transaction = await prisma.transaction.create({
    data: { amount, type, description, date, categoryId, userId },
    include: { category: { select: { nameFa: true } } },
  });

  return {
    type: "create_transaction",
    params: { ...params, id: transaction.id },
    response: `✅ ${response} (دسته: ${transaction.category?.nameFa || "بدون دسته"})`,
  };
}

async function handleUpdateTransaction(
  userId: string,
  params: Record<string, unknown>,
  response: string
): Promise<ChatAction> {
  const id = params.id as string;
  if (!id) return { type: "update_transaction", params, response: "شناسه تراکنش الزامی است." };

  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return { type: "update_transaction", params, response: "تراکنش یافت نشد." };

  const updateData: Record<string, unknown> = {};
  if (params.amount !== undefined) updateData.amount = Number(params.amount);
  if (params.type !== undefined) updateData.type = params.type;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.date !== undefined) updateData.date = new Date(params.date as string);
  if (params.categoryId !== undefined) updateData.categoryId = params.categoryId;

  const transaction = await prisma.transaction.update({
    where: { id },
    data: updateData,
    include: { category: { select: { nameFa: true } } },
  });

  return {
    type: "update_transaction",
    params: { ...params, id: transaction.id },
    response: `✅ ${response}`,
  };
}

async function handleDeleteTransaction(
  userId: string,
  params: Record<string, unknown>,
  response: string
): Promise<ChatAction> {
  const id = params.id as string;
  if (!id) return { type: "delete_transaction", params, response: "شناسه تراکنش الزامی است." };

  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return { type: "delete_transaction", params, response: "تراکنش یافت نشد." };

  await prisma.transaction.delete({ where: { id } });

  return { type: "delete_transaction", params, response: `✅ ${response}` };
}

async function handleCreateCategory(
  userId: string,
  params: Record<string, unknown>,
  response: string
): Promise<ChatAction> {
  const name = params.name as string;
  const nameFa = params.nameFa as string;
  const type = params.type as "INCOME" | "EXPENSE";

  if (!name || !nameFa || !type) {
    return { type: "create_category", params, response: "نام، نام فارسی و نوع الزامی هستند." };
  }

  const category = await prisma.category.create({
    data: { name, nameFa, type, userId, isDefault: false },
  });

  return { type: "create_category", params: { ...params, id: category.id }, response: `✅ ${response}` };
}

async function handleUpdateCategory(
  userId: string,
  params: Record<string, unknown>,
  response: string
): Promise<ChatAction> {
  const id = params.id as string;
  if (!id) return { type: "update_category", params, response: "شناسه دسته‌بندی الزامی است." };

  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) return { type: "update_category", params, response: "دسته‌بندی یافت نشد." };
  if (existing.isDefault) return { type: "update_category", params, response: "نمی‌توان دسته پیش‌فرض را ویرایش کرد." };

  const updateData: Record<string, unknown> = {};
  if (params.nameFa !== undefined) updateData.nameFa = params.nameFa;
  if (params.icon !== undefined) updateData.icon = params.icon;
  if (params.color !== undefined) updateData.color = params.color;

  await prisma.category.update({ where: { id }, data: updateData });

  return { type: "update_category", params, response: `✅ ${response}` };
}

async function handleDeleteCategory(
  userId: string,
  params: Record<string, unknown>,
  response: string
): Promise<ChatAction> {
  const id = params.id as string;
  if (!id) return { type: "delete_category", params, response: "شناسه دسته‌بندی الزامی است." };

  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) return { type: "delete_category", params, response: "دسته‌بندی یافت نشد." };
  if (existing.isDefault) return { type: "delete_category", params, response: "نمی‌توان دسته پیش‌فرض را حذف کرد." };

  await prisma.category.delete({ where: { id } });

  return { type: "delete_category", params, response: `✅ ${response}` };
}

async function handleGetSummary(
  userId: string,
  params: Record<string, unknown>,
  response: string
): Promise<ChatAction> {
  const startDate = params.startDate ? new Date(params.startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = params.endDate ? new Date(params.endDate as string) : new Date();

  const [incomeAgg, expenseAgg, categoryBreakdown] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: { userId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ]);

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    select: { id: true, nameFa: true },
  });
  const catMap = new Map(categories.map((c) => [c.id, c.nameFa]));

  const breakdown = categoryBreakdown
    .map((item) => `- ${catMap.get(item.categoryId || "") || "بدون دسته"}: ${Number(item._sum.amount || 0).toLocaleString("fa-IR")} تومان (${item._count} تراکنش)`)
    .join("\n");

  const income = Number(incomeAgg._sum.amount || 0);
  const expense = Number(expenseAgg._sum.amount || 0);

  return {
    type: "get_summary",
    params: { income, expense, balance: income - expense },
    response: `📊 خلاصه مالی:\n💰 درآمد: ${income.toLocaleString("fa-IR")} تومان\n💸 هزینه: ${expense.toLocaleString("fa-IR")} تومان\n⚖️ موجودی: ${(income - expense).toLocaleString("fa-IR")} تومان\n\n🏷️ بیشترین دسته‌بندی‌ها:\n${breakdown || "بدون تراکنش"}`,
  };
}

async function handleGetTransactions(
  userId: string,
  params: Record<string, unknown>,
  response: string
): Promise<ChatAction> {
  const limit = Number(params.limit) || 10;
  const type = params.type as "INCOME" | "EXPENSE" | undefined;

  const where: Record<string, unknown> = { userId };
  if (type) where.type = type;

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: { select: { nameFa: true } } },
    orderBy: { date: "desc" },
    take: limit,
  });

  const list = transactions
    .map((t) => `${t.type === "INCOME" ? "📈" : "📉"} ${t.description || "بدون توضیح"}: ${Number(t.amount).toLocaleString("fa-IR")} تومان (${t.category?.nameFa || "بدون دسته"}) - ${new Date(t.date).toLocaleDateString("fa-IR")}`)
    .join("\n");

  return {
    type: "get_transactions",
    params: { transactions },
    response: `📝 آخرین ${transactions.length} تراکنش:\n${list || "بدون تراکنش"}`,
  };
}

async function handleGetCategories(
  userId: string,
  params: Record<string, unknown>,
  response: string
): Promise<ChatAction> {
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: [{ type: "asc" }, { nameFa: "asc" }],
  });

  const list = categories
    .map((c) => `${c.type === "INCOME" ? "📈" : "📉"} ${c.nameFa} ${c.isDefault ? "(پیش‌فرض)" : ""}`)
    .join("\n");

  return {
    type: "get_categories",
    params: { categories },
    response: `🏷️ دسته‌بندی‌ها:\n${list}`,
  };
}