import { beforeAll, afterAll, vi } from "vitest";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const testAdapter = new PrismaMariaDb(process.env.DATABASE_URL ?? "");

export const testPrisma = new PrismaClient({
  adapter: testAdapter,
  log: ["error"],
} as any); // eslint-disable-line @typescript-eslint/no-explicit-any

beforeAll(async () => {
  await testPrisma.$connect();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

vi.mock("@/lib/prisma", () => ({
  prisma: testPrisma,
}));

vi.mock("@/services/categorize", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/categorize")>();
  return {
    ...actual,
    categorizeTransaction: vi.fn().mockResolvedValue({
      categoryId: null,
      categoryName: "تست",
      confidence: 0.5,
      fallback: true,
    }),
    seedDefaultCategories: vi.fn(actual.seedDefaultCategories),
  };
});

vi.mock("@/services/storage", () => ({
  storage: {
    upload: vi.fn().mockResolvedValue({ url: "test-url", path: "test-path", size: 100, mimeType: "image/png" }),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn().mockResolvedValue("test-signed-url"),
  },
  validateFile: vi.fn().mockReturnValue({ valid: true }),
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png"],
  MAX_FILE_SIZE: 5 * 1024 * 1024,
}));