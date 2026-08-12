import { createWorker } from "tesseract.js";
import { logger } from "@/lib/logger";

export interface OCRResult {
  text: string;
  confidence: number;
  data: {
    amount?: number;
    date?: string;
    merchant?: string;
    items?: Array<{ name: string; price: number; quantity?: number }>;
  };
}

let workerPromise: Promise<Awaited<ReturnType<typeof createWorker>>> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("fas+eng", 1, {
        logger: (m) => logger.debug({ message: m }, "Tesseract"),
      });
      return worker;
    })();
  }
  return workerPromise;
}

export async function processReceiptImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  try {
    const worker = await getWorker();

    const { data } = await worker.recognize(imageBuffer);
    const text = data.text;

    const extracted = extractReceiptData(text);

    logger.info({ textLength: text.length, confidence: data.confidence }, "OCR completed");

    return {
      text,
      confidence: data.confidence / 100,
      data: extracted,
    };
  } catch (error) {
    logger.error({ error }, "OCR processing failed");
    throw new Error("پردازش تصویر با خطا مواجه شد");
  }
}

function extractReceiptData(text: string): OCRResult["data"] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const result: OCRResult["data"] = {
    items: [],
  };

  for (const line of lines) {
    const amountMatch = extractAmount(line);
    if (amountMatch && !result.amount) {
      result.amount = amountMatch;
      continue;
    }

    const dateMatch = extractDate(line);
    if (dateMatch && !result.date) {
      result.date = dateMatch;
      continue;
    }

    const merchantMatch = extractMerchant(line);
    if (merchantMatch && !result.merchant) {
      result.merchant = merchantMatch;
      continue;
    }

    const itemMatch = extractItem(line);
    if (itemMatch) {
      result.items?.push(itemMatch);
    }
  }

  return result;
}

function extractAmount(line: string): number | null {
  const patterns = [
    /مجموع[:\s]*([\d,]+)/i,
    /total[:\s]*([\d,]+)/i,
    /مبلغ[:\s]*([\d,]+)/i,
    /([\d,]+)\s*تومان/i,
    /([\d,]+)\s*ریال/i,
    /^[\s]*([\d,]{4,})[\s]*$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ""), 10);
      if (!isNaN(num) && num > 1000) return num;
    }
  }
  return null;
}

function extractDate(line: string): string | null {
  const patterns = [
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
    /(\d{1,2}\s+(?:ژانویه|فوریه|مارس|آوریل|مه|ژوئن|ژوئیه|اوت|سپتامبر|اکتبر|نوامبر|دسامبر)\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const dateStr = match[1];
      try {
        const date = new Date(dateStr.replace(/-/g, "/"));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      } catch {}
    }
  }
  return null;
}

function extractMerchant(line: string): string | null {
  if (line.length < 3 || line.length > 100) return null;
  if (/^[\d\s\-\.:،،]+$/.test(line)) return null;
  if (/^(مجموع|total|مبلغ|تاریخ|date|فاکتور|invoice|ceipt|receipt)/i.test(line)) return null;

  return line;
}

function extractItem(line: string): { name: string; price: number; quantity?: number } | null {
  const patterns = [
    /^(.+?)\s+(\d+)\s*[x×]\s*([\d,]+)$/,
    /^(.+?)\s+([\d,]+)\s*تومان$/i,
    /^(.+?)\s+([\d,]+)\s*ریال$/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const name = match[1].trim();
      const price = parseInt(match[match.length - 1].replace(/,/g, ""), 10);
      const quantity = match[2] ? parseInt(match[2], 10) : 1;
      if (!isNaN(price) && price > 0 && name.length > 1) {
        return { name, price, quantity };
      }
    }
  }
  return null;
}

export async function terminateWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}