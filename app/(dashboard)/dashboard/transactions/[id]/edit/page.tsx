"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { formatNumber, cn } from "@/lib/utils";

interface Category {
  id: string;
  nameFa: string;
  icon: string;
  color: string;
  type: string;
}

interface FormData {
  amount: string;
  type: "INCOME" | "EXPENSE";
  description: string;
  date: string;
  categoryId: string;
  receiptUrl: string;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
  categoryId?: string;
}

export default function TransactionEditPage() {
  const router = useRouter();
  const params = useParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<FormData>({
    amount: "",
    type: "EXPENSE",
    description: "",
    date: new Date().toISOString().split("T")[0],
    categoryId: "",
    receiptUrl: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categorization, setCategorization] = useState<{
    categoryId: string | null;
    categoryName: string;
    confidence: number;
    fallback: boolean;
  } | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (json.data) setCategories(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransaction = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${params.id}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 404) {
        router.push("/dashboard/transactions");
        return;
      }
      const json = await res.json();
      if (json.data) {
        const tx = json.data;
        setFormData({
          amount: String(tx.amount),
          type: tx.type,
          description: tx.description || "",
          date: tx.date.split("T")[0],
          categoryId: tx.categoryId || "",
          receiptUrl: tx.receiptUrl || "",
        });
        if (json.categorization) {
          setCategorization(json.categorization);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categorizeTransaction = async () => {
    if (!formData.description || !formData.amount) return;

    try {
      const res = await fetch("/api/transactions/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          amount: Number(formData.amount),
          type: formData.type,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setCategorization(json.data);
        if (!formData.categoryId && json.data.categoryId) {
          setFormData((prev) => ({ ...prev, categoryId: json.data.categoryId }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransaction();
  }, [params.id]);

  useEffect(() => {
    if (formData.type && categories.length > 0) {
      const filtered = categories.filter((c) => c.type === formData.type);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredCategories(filtered);
      if (formData.categoryId && !filtered.find((c) => c.id === formData.categoryId)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((prev) => ({ ...prev, categoryId: "" }));
      }
    }
  }, [formData.type, categories]);

  useEffect(() => {
    if (formData.description && formData.amount && !formData.categoryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      categorizeTransaction();
    }
  }, [formData.description, formData.amount, formData.type]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = "مبلغ باید بزرگتر از صفر باشد";
    }

    if (!formData.date) {
      newErrors.date = "تاریخ الزامی است";
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "توضیحات نباید بیشتر از ۵۰۰ کاراکتر باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/transactions/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(formData.amount),
          type: formData.type,
          description: formData.description || undefined,
          date: formData.date,
          categoryId: formData.categoryId || undefined,
          receiptUrl: formData.receiptUrl || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.details) {
          const fieldErrors: FormErrors = {};
          json.details.fieldErrors?.forEach((err: { path: string[]; message: string }) => {
            if (err.path[0]) fieldErrors[err.path[0] as keyof FormErrors] = err.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ amount: json.error || "خطا در به‌روزرسانی" });
        }
        return;
      }

      router.push(`/dashboard/transactions/${params.id}`);
      router.refresh();
    } catch (err) {
      setErrors({ amount: "خطای شبکه، لطفاً دوباره تلاش کنید" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.data) {
        setFormData((prev) => ({ ...prev, receiptUrl: json.data.path }));
      } else {
        alert(json.error || "خطا در آپلود");
      }
    } catch (err) {
      alert("خطای شبکه در آپلود فایل");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ویرایش تراکنش</h1>
          <p className="text-muted-foreground">اطلاعات تراکنش را به‌روزرسانی کنید</p>
        </div>
        <Link
          href={`/dashboard/transactions/${params.id}`}
          className="text-primary hover:underline text-sm"
        >
          ← بازگشت
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-6" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1.5">
              نوع تراکنش <span className="text-danger">*</span>
            </label>
            <div className="flex gap-3">
              {["INCOME", "EXPENSE"].map((type) => (
                <label
                  key={type}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer",
                    formData.type === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={formData.type === type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as "INCOME" | "EXPENSE", categoryId: "" }))}
                    className="sr-only"
                  />
                  <span className="font-medium">{type === "INCOME" ? "📈 درآمد" : "📉 هزینه"}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1.5">
              مبلغ (تومان) <span className="text-danger">*</span>
            </label>
            <input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={formData.amount}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, amount: e.target.value }));
                setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              className={cn(
                "w-full px-4 py-2.5 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                errors.amount && "border-danger focus:ring-danger focus:border-danger"
              )}
              placeholder="مثال: 500000"
              disabled={submitting}
            />
            {errors.amount && <p className="mt-1 text-sm text-danger">{errors.amount}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1.5">
            توضیحات
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, description: e.target.value }));
              setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            className={cn(
              "w-full px-4 py-2.5 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y",
              errors.description && "border-danger focus:ring-danger focus:border-danger"
            )}
            placeholder="مثال: خرید مواد اولیه، پرداخت حقوق، فروش کالا..."
            disabled={submitting}
          />
          {errors.description && <p className="mt-1 text-sm text-danger">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1.5">
              تاریخ <span className="text-danger">*</span>
            </label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, date: e.target.value }));
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              className={cn(
                "w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                errors.date && "border-danger focus:ring-danger focus:border-danger"
              )}
              disabled={submitting}
            />
            {errors.date && <p className="mt-1 text-sm text-danger">{errors.date}</p>}
          </div>

          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-foreground mb-1.5">
              دسته‌بندی
            </label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
              className={cn(
                "w-full px-4 py-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                errors.categoryId && "border-danger focus:ring-danger focus:border-danger"
              )}
              disabled={submitting}
            >
              <option value="">انتخاب دسته‌بندی (اختیاری)</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.nameFa}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="mt-1 text-sm text-danger">{errors.categoryId}</p>}
          </div>
        </div>

        {categorization && (
          <div
            className={cn(
              "p-3 rounded-lg text-sm flex items-center justify-between",
              categorization.fallback ? "bg-warning/10 text-warning border border-warning/20" : "bg-success/10 text-success border border-success/20"
            )}
          >
            <div className="flex items-center gap-2">
              <span>{categorization.fallback ? "🤖" : "🧠"}</span>
              <span>
                دسته‌بندی پیشنهادی: <strong>{categorization.categoryName}</strong>
                {categorization.fallback && " (بر اساس کلمات کلیدی)"}
                {!categorization.fallback && ` (اطمینان: ${Math.round(categorization.confidence * 100)}%)`}
              </span>
            </div>
            {!formData.categoryId && categorization.categoryId && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, categoryId: categorization.categoryId! }))}
                className="px-3 py-1 text-xs font-medium rounded border border-current hover:bg-current/10 transition-colors"
              >
                استفاده از پیشنهاد
              </button>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            تصویر رسید (اختیاری)
          </label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleReceiptUpload(file);
              }}
              className="sr-only"
              id="receipt-upload"
              disabled={submitting}
            />
            <label
              htmlFor="receipt-upload"
              className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-4xl">📎</span>
              <span className="font-medium">فایل را اینجا بکشید یا کلیک کنید</span>
              <span className="text-xs">JPG, PNG, WebP, PDF — حداکثر ۵ مگابایت</span>
            </label>
          </div>
          {formData.receiptUrl && (
            <div className="mt-3 flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-sm font-medium text-foreground">رسید آپلود شده</p>
                  <p className="text-xs text-muted-foreground">آماده برای ذخیره</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 px-6 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "در حال ذخیره..." : "به‌روزرسانی تراکنش"}
          </button>
          <Link
            href={`/dashboard/transactions/${params.id}`}
            className="flex-1 py-3 px-6 bg-muted text-foreground font-medium rounded-lg text-center hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          >
            انصراف
          </Link>
        </div>
      </form>
    </div>
  );
}