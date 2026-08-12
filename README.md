# حسابداری هوشمند - Smart Bookkeeping for Iranian SMBs

یک محصول حسابداری خودکار برای کسب‌وکام‌های کوچک و متوسط ایران. کاربران تراکنش‌های مالی را به‌صورت دستی یا از طریق آپلود تصویر رسید ثبت می‌کنند و مدل هوش مصنوعی (Zhipu GLM) آن‌ها را به دسته‌بندی‌های ثابت دسته‌بندی می‌کند.

## ویژگی‌ها

- ✅ **ثبت تراکنش**: دستی و از طریق آپلود رسید (JPG, PNG, WebP, PDF)
- ✅ **دسته‌بندی هوشمند**: استفاده از Zhipu GLM-4-Flash با fallback به کلمات کلیدی
- ✅ **داشبورد مالی**: جمع درآمد، هزینه، موجودی و نمودار توزیع دسته‌بندی‌ها
- ✅ **فیلتر پیشرفته**: بر اساس نوع، دسته‌بندی، تاریخ، مبلغ و جستجوی متنی
- ✅ **احراز هویت امن**: NextAuth.js با Credentials Provider، رمزنگاری bcrypt
- ✅ **چندکاربره (Multi-tenancy)**: جداسازی کامل داده‌ها در سطح دیتابیس
- ✅ **رابط کاربری RTL فارسی**: طراحی موبایل‌فIRST با فونت وزیرمتن
- ✅ **آپلود فایل امن**: Supabase Storage با اعتبارسنجی نوع و اندازه
- ✅ **لاگری ساختاریافته**: Pino با رداکت اطلاعات حساس
- ✅ **تست‌های واحد و E2E**: Vitest + Playwright

## تکنولوژی‌ها

| لایه | تکنولوژی |
|------|-----------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Database | PostgreSQL (Neon / Supabase / Local) |
| ORM | Prisma 7 |
| Auth | NextAuth.js v5 (Auth.js) + Prisma Adapter |
| AI | Zhipu AI (OpenAI-compatible API) |
| File Storage | Supabase Storage (fallback: local filesystem) |
| Styling | Tailwind CSS 4 |
| Validation | Zod |
| Logging | Pino + Pino Pretty |
| Testing | Vitest (unit) + Playwright (e2e) |
| Deployment | Vercel (frontend) + Neon/Supabase (DB) |

## پیش‌نیازها

- Node.js 20+
- PostgreSQL 15+ (یا اکانت Neon/Supabase رایگان)
- زhipu API Key (از [bigmodel.cn](https://bigmodel.cn))
- Supabase Account (برای Storage، اختیاری)

## راه‌اندازی locales (برایrunning locally including on phone)

### 1. کلون و نصب وابستگی‌ها

```bash
cd ai-financial-analyst
npm install
```

### 2. اسکریپت راه‌اندازی سریع (توصیه شده)

```bash
chmod +x setup_friend.sh
./setup_friend.sh
```

### 2. اسکریپت راه‌اندازی سریع (توصیه شده)

```bash
chmod +x setup.sh
./setup.sh
```

### 2. تنظیم متغیرهای محیطی

فایل `.env` را کپی و ویرایش کنید:

```bash
cp .env.example .env
```

متغیرهای ضروری:

```env
# Database (Neon، Supabase، یا PostgreSQL محلی)
DATABASE_URL="postgresql://user:pass@localhost:5432/finance_app?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"

# Zhipu AI (GLM) - OpenAI Compatible
ZHIPU_API_KEY="your-zhipu-api-key"
ZHIPU_BASE_URL="https://open.bigmodel.cn/api/paas/v4"
ZHIPU_MODEL="glm-4-flash"

# Supabase Storage (اختیاری - برای آپلود فایل)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key"
SUPABASE_BUCKET="receipts"
```

### 3. راه‌اندازی دیتابیس

```bash
# تولید Prisma Client
npm run db:generate

# اجرای میگریشن‌ها (ایجاد جداول)
npm run db:migrate

# یا برای توسعه سریع (بدون میگریشن):
npm run db:push
```

### 4. اجرای سرور توسعه

```bash
npm run dev
```

باز کنید: [http://localhost:3000](http://localhost:3000)

## دستورات مفید

```bash
#development
npm run dev              # سرور توسعه (localhost فقط)
npm run dev -- --hostname 0.0.0.0  # دسترسی از شبکه локал (برای گوشی)

#setup
./setup_friend.sh               # اسکریپت تنظیم اولیه (اختیاری)

#	test
npm run test             # تست‌های واحد (Vitest)
```

# تست
npm run test             # تست‌های واحد (Vitest)
npm run test:ui          # UI تست‌ها
npm run test:e2e         # تست‌های E2E (Playwright)

# دیتابیس
npm run db:generate      # تولید Prisma Client
npm run db:push          # Push schema به DB (بدون میگریشن)
npm run db:migrate       # ایجاد و اجرای میگریشن
npm run db:migrate:prod  # اجرای میگریشن درProduction

# لینت و بیلد
npm run lint             # ESLint
npm run build            # Production build
npm run start            # اجرای Production build
```

## ساختار پروژه

```
app/
├── api/                    # API Routes
│   ├── auth/               # NextAuth endpoints
│   ├── transactions/       # CRUD تراکنش‌ها + categorize
│   ├── upload/             # آپلود رسید
│   ├── categories/         # CRUD دسته‌بندی‌ها
│   └── dashboard/          # آمار داشبورد
├── (dashboard)/            # Route group محفوظ (auth required)
│   ├── layout.tsx          # Layout با sidebar
│   ├── page.tsx            # داشبورد اصلی
│   ├── transactions/       # لیست، جدید، ویرایش، جزئیات
│   └── categories/         # مدیریت دسته‌بندی‌ها
├── login/                  # صفحه ورود
├── register/               # صفحه ثبت‌نام
├── lib/                    # Utilityها
│   ├── prisma.ts           # Prisma Client Singleton
│   ├── auth.ts             # NextAuth Config
│   ├── logger.ts           # Pino Logger
│   └── utils.ts            # Helper functions
├── services/               # Business Logic
│   ├── categorize.ts       # AI Categorization (Isolated Module)
│   └── storage.ts          # File Upload Abstraction
├── validation/             # Zod Schemas
├── components/             # React Components (shared)
├── globals.css             # Global Styles + RTL + Vazirmatn
├── layout.tsx              # Root Layout
├── page.tsx                # Redirect to dashboard/login
├── providers.tsx           # SessionProvider
└── middleware.ts           # Auth Middleware
prisma/
├── schema.prisma           # Database Schema
└── migrations/             # Migration History
tests/
├── setup.ts                # Vitest Setup
├── transactions.test.ts    # Unit Tests
├── auth.test.ts            # Auth Tests
└── e2e/                    # Playwright E2E Tests
```

## معماری دسته‌بندی هوشمند (Isolated Module)

`app/services/categorize.ts` به‌صورت کامل جدا شده است تا در آینده قابل گسترش باشد:

```typescript
// ورودی: توضیحات، مبلغ، نوع، userId
// خروجی: { categoryId, categoryName, confidence, fallback }

// 1. دریافت دسته‌بندی‌های کاربر + پیش‌فرض‌ها
// 2. ارسال پرامپت به Zhipu GLM
// 3. Parse JSON response
// 4. Fallback: keyword matching اگر AI fail کرد
// 5. Seed default categories برای کاربر جدید
```

**افزودن ویژگی‌های مالی در آینده** (خارج از Scope فعلی):
- این ماژول می‌تواند به‌عنوان پایه برای گزارش‌گیری، پیش‌بینی جریان نقدینگی، یا مشاوره مالی استفاده شود
- فقط نیاز به اضافه کردن متدهای جدید در همین فایل است

## امنیت

- **API Keys**: فقط در سمت سرور (Zhipu، Supabase Service Key)
- **Passwords**: bcrypt با cost 12
- **Multi-tenancy**: تمام کوئری‌ها با `userId` فیلتر می‌شوند
- **Input Validation**: Zod در تمام API endpoints
- **File Upload**: اعتبارسنجی MIME type، حداکثر ۵MB، نام فایل Sanitize شده
- **Logging**: Pino با رداکت خودکار `password`، `token`، `apiKey`، `authorization`

## استقرار (Deployment)

### پیش‌نیازهای Production

1. **PostgreSQL Database**: [Neon](https://neon.tech) (رایگان ۰.۵GB) یا [Supabase](https://supabase.com) (رایگان ۵۰۰MB)
2. **File Storage**: Supabase Storage (رایگان ۱GB) یا Cloudflare R2 (رایگان ۱۰GB)
3. **Hosting**: [Vercel](https://vercel.com) (رایگان برای Next.js)

### مراحل استقرار روی Vercel

1. **Push به GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/finance-app.git
   git push -u origin main
   ```

2. **ایجاد پروژه در Vercel**:
   - Import GitHub Repository
   - Framework Preset: Next.js
   - Environment Variables را از `.env` کپی کنید

3. **تنظیم Environment Variables در Vercel**:
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=generated-secret
   ZHIPU_API_KEY=...
   ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
   ZHIPU_MODEL=glm-4-flash
   SUPABASE_URL=...
   SUPABASE_SERVICE_KEY=...
   SUPABASE_BUCKET=receipts
   ```

4. **اجرای میگریشن در Production**:
   ```bash
   # در Vercel CLI یا GitHub Actions
   npx prisma migrate deploy
   ```

### تنظیمات Supabase Storage (رایگان)

1. پروژه Supabase بسازید
2. Storage > Create Bucket > `receipts` (Private)
3. Policies > Add Policy:
   ```sql
   -- فقط کاربران احراز هویت شده می‌توانند آپلود کنند
   CREATE POLICY "Authenticated upload" ON storage.objects
   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
   
   -- کاربران فقط فایل‌های خودشان را می‌بینند (via signed URLs)
   CREATE POLICY "Own files read" ON storage.objects
   FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

### مدیریت سیکرت‌ها

- **هرگز** سیکرت‌ها را در کد یا Git commit نکنید
- از Environment Variables در Vercel/Supabase/Neon استفاده کنید
- `NEXTAUTH_SECRET` با `openssl rand -base64 32` تولید کنید

### دسترسی از گوشی (Phone Access)

برای اجرای برنامه روی گوشی‌های دیگر در شبکه neighborhood (Wi-Fi):

```bash
npm run dev -- --hostname 0.0.0.0
```

Then visit from phone:
- http://[COMPUTER_IP]:3000

**Notes:**
- Must be on same Wi-Fi network
- Firewall may block port 3000 (allow it)
- RTL layout and Persian font (Vazirmatn) will display correctly
- AI categorization works if Zhipu API key is configured
- Use Ctrl+C to stop the server
```

## تست‌ها

### تست‌های واحد (Vitest)

```bash
npm run test
```

پوشش:
- API تراکنش‌ها (CRUD، فیلتر، دسته‌بندی)
- جریان احراز هویت (ثبت‌نام، ورود، سشن)
- دسته‌بندی هوشمند (AI + Fallback)

### تست‌های E2E (Playwright)

```bash
# اول سرور رو اجرا کنید
npm run dev

# در ترمینال دیگر
npm run test:e2e
```

سناریوها:
- جریان احراز هویت (Redirect، Login، Register)
- داشبورد (نمایش کارت‌ها، ناوبری)
- تراکنش‌ها (ایجاد، فیلتر، ویرایش)
- RTL Layout و فونت فارسی

## مانیتورینگ و لاگ‌ها

لاگ‌ها در کنسول (Development) یا Stdout (Production) با فرمت JSON:

```json
{
  "level": 30,
  "time": "2024-01-15T10:30:00.000Z",
  "service": "finance-app",
  "userId": "abc123",
  "transactionId": "txn456",
  "categorization": "ai",
  "msg": "Transaction created"
}
```

اطلاعات حساس (`password`، `token`، `apiKey`، `receiptUrl`) به‌صورت خودکار رداکت می‌شوند.

## مشارکت

1. Fork کنید
2. Branch بسازید: `git checkout -b feature/amazing-feature`
3. Commit کنید: `git commit -m 'Add amazing feature'`
4. Push کنید: `git push origin feature/amazing-feature`
5. Pull Request باز کنید

## لایسنس

MIT License - آزاد برای استفاده تجاری و غیرتجاری.

## پشتیبانی

برای گزارش باگ یا درخواست ویژگی، Issue در GitHub باز کنید.

---

**تیم**: ۲ توسعه‌دهنده، ۱ رهبر مالی، ۱ مهندس صنعت
**هدف**: معرفی به تسریع‌کننده دانشگاهی + آنبورد کاربران تست واقعی