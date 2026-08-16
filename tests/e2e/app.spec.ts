import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  test("should redirect to login when accessing dashboard without auth", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/);
  });

  test("should show login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("حسابداری هوشمند");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should show register form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1")).toContainText("حسابداری هوشمند");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});

test.describe("Registration", () => {
  test("should register new user and redirect to login", async ({ page }) => {
    const email = `test${Date.now()}@example.com`;
    const password = "password123";

    await page.goto("/register");
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*login/, { timeout: 30000 });
    await expect(page.locator("text=ثبت‌نام")).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test.use({ storageState: "tests/.auth/user.json" });

  test("should show dashboard with summary cards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("داشبورد");
    await expect(page.locator("text=مجموع درآمدها")).toBeVisible();
    await expect(page.locator("text=مجموع هزینه‌ها")).toBeVisible();
    await expect(page.locator("text=موجودی")).toBeVisible();
  });

  test("should navigate to transactions page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator('a:has-text("تراکنش‌ها")').filter({ visible: true }).click();
    await expect(page).toHaveURL(/.*transactions/);
    await expect(page.locator("h1")).toContainText("تراکنش‌ها");
  });

  test("should navigate to categories page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator('a:has-text("دسته‌بندی‌ها")').filter({ visible: true }).click();
    await expect(page).toHaveURL(/.*categories/);
    await expect(page.locator("h1")).toContainText("دسته‌بندی‌ها");
  });
});

test.describe("Transactions", () => {
  test.use({ storageState: "tests/.auth/user.json" });

  test("should create new transaction", async ({ page }) => {
    await page.goto("/dashboard/transactions/new");
    await expect(page.locator("h1")).toContainText("تراکنش جدید");

    await page.click('label:has-text("هزینه")');
    await page.fill('input[name="amount"]', "50000");
    await page.fill('textarea[name="description"]', "تست تراکنش");
    await page.click('form:has(textarea[name="description"]) button[type="submit"]');

    await expect(page).toHaveURL(/.*transactions$/);
  });

  test("should filter transactions", async ({ page }) => {
    await page.goto("/dashboard/transactions");
    await expect(page.locator('input[placeholder="جستجو در توضیحات..."]')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });
});

test.describe("Smart Assistant", () => {
  test.use({ storageState: "tests/.auth/user.json" });

  test("should show chat page and answer a message", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await expect(page.locator("h1")).toContainText("دستیار هوشمند");

    await page.fill('textarea[placeholder="پیام خود را بنویسید..."]', "وضعیت مالی من چطور است؟");
    await page.click('form:has(textarea) button[type="submit"]');

    await expect(page.locator("div.max-w-\\[80\\%\\]").last()).toBeVisible({ timeout: 60000 });
    await expect(page.locator("div.max-w-\\[80\\%\\]").first()).toHaveText("وضعیت مالی من چطور است؟");
  });
});

test.describe("RTL Layout", () => {
  test("should have RTL direction on all pages", async ({ page }) => {
    await page.goto("/login");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "fa");
  });

  test("should use Persian font", async ({ page }) => {
    await page.goto("/login");
    const body = page.locator("body");
    const fontFamily = await body.evaluate((el) => window.getComputedStyle(el).fontFamily);
    expect(fontFamily).toContain("Vazirmatn");
  });
});