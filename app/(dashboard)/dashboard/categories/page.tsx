"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  nameFa: string;
  icon: string | null;
  color: string | null;
  type: "INCOME" | "EXPENSE";
  isDefault: boolean;
  userId: string | null;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameFa: "",
    icon: "",
    color: "#0d9488",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (json.data) setCategories(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, []);

  const resetForm = () => {
    setFormData({ name: "", nameFa: "", icon: "", color: "#0d9488", type: "EXPENSE" });
    setErrors({});
    setEditingCategory(null);
  };

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      nameFa: cat.nameFa,
      icon: cat.icon || "",
      color: cat.color || "#0d9488",
      type: cat.type,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این دسته‌بندی مطمئن هستید؟")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCategories();
      } else {
        alert("خطا در حذف دسته‌بندی");
      }
    } catch {
      alert("خطای شبکه");
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "نام انگلیسی الزامی است";
    if (!formData.nameFa.trim()) newErrors.nameFa = "نام فارسی الزامی است";
    if (!/^[a-z_]+$/.test(formData.name)) newErrors.name = "نام انگلیسی فقط می‌تواند حروف کوچک و underscore باشد";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories";
    const method = editingCategory ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "خطا در ذخیره");
        return;
      }

      resetForm();
      setShowForm(false);
      fetchCategories();
    } catch {
      alert("خطای شبکه");
    } finally {
      setSubmitting(false);
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">دسته‌بندی‌ها</h1>
          <p className="text-muted-foreground">مدیریت دسته‌بندی‌های درآمد و هزینه</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
        >
          <span>➕</span> دسته‌بندی جدید
        </button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {editingCategory ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}
            </h2>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="text-muted-foreground hover:text-foreground text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                  نام انگلیسی (کد) <span className="text-danger">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z_]/g, "") }));
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    errors.name && "border-danger focus:ring-danger focus:border-danger"
                  )}
                  placeholder="مثال: salary, rent, marketing"
                  disabled={submitting || !!editingCategory}
                />
                {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
                <p className="mt-1 text-xs text-muted-foreground">فقط حروف کوچک انگلیسی و underscore</p>
              </div>

              <div>
                <label htmlFor="nameFa" className="block text-sm font-medium text-foreground mb-1.5">
                  نام فارسی <span className="text-danger">*</span>
                </label>
                <input
                  id="nameFa"
                  type="text"
                  value={formData.nameFa}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, nameFa: e.target.value }));
                    setErrors((prev) => ({ ...prev, nameFa: undefined }));
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    errors.nameFa && "border-danger focus:ring-danger focus:border-danger"
                  )}
                  placeholder="مثال: حقوق، اجاره، تبلیغات"
                  disabled={submitting}
                />
                {errors.nameFa && <p className="mt-1 text-sm text-danger">{errors.nameFa}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="icon" className="block text-sm font-medium text-foreground mb-1.5">
                  آیکون (ایموجی)
                </label>
                <input
                  id="icon"
                  type="text"
                  maxLength={4}
                  value={formData.icon}
                  onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-2xl text-center"
                  placeholder="💰"
                  disabled={submitting}
                />
              </div>

              <div>
                <label htmlFor="color" className="block text-sm font-medium text-foreground mb-1.5">
                  رنگ
                </label>
                <input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-full h-12 rounded-lg border border-border cursor-pointer"
                  disabled={submitting}
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1.5">
                  نوع <span className="text-danger">*</span>
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as "INCOME" | "EXPENSE" }))}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={submitting}
                >
                  <option value="INCOME">درآمد</option>
                  <option value="EXPENSE">هزینه</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "در حال ذخیره..." : editingCategory ? "به‌روزرسانی" : "ایجاد دسته‌بندی"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 py-2.5 px-4 bg-muted text-foreground font-medium rounded-lg hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategorySection title="درآمدها" icon="📈" categories={incomeCategories} onEdit={handleEdit} onDelete={handleDelete} />
        <CategorySection title="هزینه‌ها" icon="📉" categories={expenseCategories} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
    </div>
  );
}

function CategorySection({
  title,
  icon,
  categories,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: string;
  categories: Category[];
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="ml-auto px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground">
          {categories.length} دسته
        </span>
      </div>

      <div className="divide-y divide-border">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>هیچ دسته‌بندی‌ای وجود ندارد</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${cat.color || "#94A3B8"}20` }}
                >
                  <span>{cat.icon || "📝"}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{cat.nameFa}</p>
                  <p className="text-xs text-muted-foreground">{cat.name}</p>
                </div>
                {cat.isDefault && (
                  <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                    پیش‌فرض
                  </span>
                )}
                {cat.userId && (
                  <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                    سفارشی
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(cat)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="ویرایش"
                >
                  ✏️
                </button>
                {!cat.isDefault && (
                  <button
                    onClick={() => onDelete(cat.id)}
                    className="p-2 rounded-lg hover:bg-danger-light hover:text-danger transition-colors text-muted-foreground"
                    aria-label="حذف"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}