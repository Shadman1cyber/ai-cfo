import { describe, it, expect, beforeEach, vi } from "vitest";
import { testPrisma } from "./setup";
import bcrypt from "bcryptjs";
import { seedDefaultCategories } from "@/services/categorize";

describe("Auth Flow", () => {
  const testEmail = "test@example.com";

  beforeEach(async () => {
    await testPrisma.user.deleteMany({ where: { email: testEmail } });
    vi.clearAllMocks();
  });

  describe("User Registration", () => {
    it("should hash password before storing", async () => {
      const password = "securePassword123";
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await testPrisma.user.create({
        data: {
          email: testEmail,
          name: "Test User",
          passwordHash,
        },
      });

      expect(user.passwordHash).not.toBe(password);
      expect(user.passwordHash).toBe(passwordHash);
    });

    it("should verify password correctly", async () => {
      const password = "securePassword123";
      const passwordHash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, passwordHash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare("wrongPassword", passwordHash);
      expect(isInvalid).toBe(false);
    });

    it("should prevent duplicate email registration", async () => {
      await testPrisma.user.create({
        data: {
          email: testEmail,
          passwordHash: await bcrypt.hash("password123", 12),
        },
      });

      await expect(
        testPrisma.user.create({
          data: {
            email: testEmail,
            passwordHash: await bcrypt.hash("password456", 12),
          },
        })
      ).rejects.toThrow();
    });

    it("should create default categories for new user", async () => {
      const user = await testPrisma.user.create({
        data: {
          email: testEmail,
          passwordHash: await bcrypt.hash("password123", 12),
        },
      });

      await seedDefaultCategories(user.id);

      const defaultCategories = await testPrisma.category.findMany({
        where: { userId: user.id },
      });

      expect(defaultCategories.length).toBeGreaterThan(0);
      expect(defaultCategories.some((c: { type: string }) => c.type === "INCOME")).toBe(true);
      expect(defaultCategories.some((c: { type: string }) => c.type === "EXPENSE")).toBe(true);
    });
  });

  describe("User Login", () => {
    it("should find user by email", async () => {
      const passwordHash = await bcrypt.hash("correctPassword", 12);
      await testPrisma.user.create({
        data: { email: testEmail, passwordHash },
      });

      const user = await testPrisma.user.findUnique({ where: { email: testEmail } });
      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
    });

    it("should reject login for non-existent user", async () => {
      const user = await testPrisma.user.findUnique({ where: { email: "nonexistent@example.com" } });
      expect(user).toBeNull();
    });
  });

  describe("Session Management", () => {
    it("should create session for logged in user", async () => {
      const user = await testPrisma.user.create({
        data: { email: testEmail, passwordHash: await bcrypt.hash("password123", 12) },
      });

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: "test-session-token",
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      expect(session.userId).toBe(user.id);
      expect(session.sessionToken).toBe("test-session-token");
    });

    it("should expire old sessions", async () => {
      const user = await testPrisma.user.create({
        data: { email: testEmail, passwordHash: await bcrypt.hash("password123", 12) },
      });

      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: "expired-token",
          expires: new Date(Date.now() - 1000),
        },
      });

      const expiredSessions = await testPrisma.session.findMany({
        where: { expires: { lt: new Date() } },
      });

      expect(expiredSessions.length).toBeGreaterThanOrEqual(1);
    });
  });
});