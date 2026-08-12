import { describe, it, expect, beforeEach, vi } from "vitest";
import { testPrisma } from "./setup";
import { categorizeTransaction } from "@/services/categorize";

describe("Transaction API", () => {
  const testUserId = "test-user-id";
  const testCategoryId = "test-category-id";

  beforeEach(async () => {
    await testPrisma.transaction.deleteMany({ where: { userId: testUserId } });
    await testPrisma.category.deleteMany({ where: { userId: testUserId } });
    await testPrisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "transactions-test@test.com",
        passwordHash: "test-hash",
      },
    });
    vi.clearAllMocks();
  });

  describe("categorizeTransaction", () => {
    it("should return fallback categorization when no categories exist", async () => {
      const result = await categorizeTransaction(testUserId, "فروش کالا", 100000, "INCOME");
      expect(result.fallback).toBe(true);
      expect(result.categoryName).toBe("تست");
    });

    it("should categorize income transaction", async () => {
      await testPrisma.category.create({
        data: {
          name: "sales",
          nameFa: "فروش",
          icon: "🛍️",
          color: "#10B981",
          type: "INCOME",
          userId: testUserId,
        },
      });

      const result = await categorizeTransaction(testUserId, "فروش کالا به مشتری", 500000, "INCOME");
      expect(result.categoryName).toBeDefined();
    });

    it("should categorize expense transaction", async () => {
      await testPrisma.category.create({
        data: {
          name: "rent",
          nameFa: "اجاره",
          icon: "🏢",
          color: "#EF4444",
          type: "EXPENSE",
          userId: testUserId,
        },
      });

      const result = await categorizeTransaction(testUserId, "پرداخت اجاره محل", 2000000, "EXPENSE");
      expect(result.categoryName).toBeDefined();
    });
  });

  describe("Transaction CRUD", () => {
    it("should create transaction with valid data", async () => {
      const category = await testPrisma.category.create({
        data: {
          name: "test_cat",
          nameFa: "تست",
          type: "EXPENSE",
          userId: testUserId,
        },
      });

      const transaction = await testPrisma.transaction.create({
        data: {
          amount: 100000,
          type: "EXPENSE",
          description: "تست تراکنش",
          userId: testUserId,
          categoryId: category.id,
        },
      });

      expect(transaction.id).toBeDefined();
      expect(Number(transaction.amount)).toBe(100000);
      expect(transaction.type).toBe("EXPENSE");
    });

    it("should filter transactions by type", async () => {
      await testPrisma.transaction.createMany({
        data: [
          { amount: 100000, type: "INCOME", userId: testUserId },
          { amount: 50000, type: "EXPENSE", userId: testUserId },
          { amount: 200000, type: "INCOME", userId: testUserId },
        ],
      });

      const incomeTransactions = await testPrisma.transaction.findMany({
        where: { userId: testUserId, type: "INCOME" },
      });

      expect(incomeTransactions).toHaveLength(2);
      expect(incomeTransactions.every((t: { type: string }) => t.type === "INCOME")).toBe(true);
    });

    it("should filter transactions by date range", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      await testPrisma.transaction.createMany({
        data: [
          { amount: 100000, type: "INCOME", userId: testUserId, date: now },
          { amount: 50000, type: "EXPENSE", userId: testUserId, date: yesterday },
          { amount: 200000, type: "INCOME", userId: testUserId, date: lastWeek },
        ],
      });

      const recentTransactions = await testPrisma.transaction.findMany({
        where: {
          userId: testUserId,
          date: { gte: yesterday },
        },
      });

      expect(recentTransactions).toHaveLength(2);
    });

    it("should filter transactions by category", async () => {
      const cat1 = await testPrisma.category.create({
        data: { name: "cat1", nameFa: "دسته ۱", type: "EXPENSE", userId: testUserId },
      });
      const cat2 = await testPrisma.category.create({
        data: { name: "cat2", nameFa: "دسته ۲", type: "EXPENSE", userId: testUserId },
      });

      await testPrisma.transaction.createMany({
        data: [
          { amount: 100000, type: "EXPENSE", userId: testUserId, categoryId: cat1.id },
          { amount: 50000, type: "EXPENSE", userId: testUserId, categoryId: cat2.id },
        ],
      });

      const cat1Transactions = await testPrisma.transaction.findMany({
        where: { userId: testUserId, categoryId: cat1.id },
      });

      expect(cat1Transactions).toHaveLength(1);
      expect(cat1Transactions[0].categoryId).toBe(cat1.id);
    });
  });
});