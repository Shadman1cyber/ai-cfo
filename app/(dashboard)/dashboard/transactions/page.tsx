"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatNumber, formatDate, getTypeLabel, getTypeColor, getTypeBg, cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  description: string | null;
  date: string;
  receiptUrl: string | null;
  category: { id: string; nameFa: string; icon: string; color: string } | null;
}

interface Category {
  id: string;
  nameFa: string;
  icon: string;
  color: string;
  type: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
    categoryId: searchParams.get("categoryId") || "",
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
    search: searchParams.get("search") || "",
    sortBy: searchParams.get("sortBy") || "date",
    sortOrder: searchParams.get("sortOrder") || "desc",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (json.data) setCategories(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));

    try {
      const res = await fetch(`/api/transactions?${params}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (json.data) {
        setTransactions(json.data);
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      type: "",
      categoryId: "",
      startDate: "",
      endDate: "",
      search: "",
      sortBy: "date",
      sortOrder: "desc",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">تراکنش‌ها</h1>
          <p className="text-muted-foreground">مدیریت و فیلتر تراکنش‌های مالی</p>
        </div>
        <Link
          href="/dashboard/transactions/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
        >
          <span>➕</span> تراکنش جدید
        </Link>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="search" className="sr-only">جستجو</label>
              <input
                id="search"
                type="text"
                placeholder="جستجو در توضیحات..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            </div>
            <select
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">همه انواع</option>
              <option value="INCOME">درآمد</option>
              <option value="EXPENSE">هزینه</option>
            </select>
            <select
              value={filters.categoryId}
              onChange={(e) => updateFilter("categoryId", e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">همه دسته‌ها</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.nameFa}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                showFilters
                  ? "bg-primary text-white"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              {showFilters ? "بستن فیلترها" : "فیلترهای پیشرفته"}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 border-b border-border bg-muted/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="startDate" className="block text-xs text-muted-foreground mb-1">
                از تاریخ
              </label>
              <input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter("startDate", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-xs text-muted-foreground mb-1">
                تا تاریخ
              </label>
              <input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter("endDate", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="sortBy" className="block text-xs text-muted-foreground mb-1">
                مرتب‌سازی بر اساس
              </label>
              <select
                id="sortBy"
                value={filters.sortBy}
                onChange={(e) => updateFilter("sortBy", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="date">تاریخ</option>
                <option value="amount">مبلغ</option>
                <option value="createdAt">زمان ثبت</option>
              </select>
            </div>
            <div>
              <label htmlFor="sortOrder" className="block text-xs text-muted-foreground mb-1">
                ترتیب
              </label>
              <select
                id="sortOrder"
                value={filters.sortOrder}
                onChange={(e) => updateFilter("sortOrder", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="desc">نزولی (مجدیدتر)</option>
                <option value="asc">صعودی (قدیمی‌تر)</option>
              </select>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">فیلتر فعال</span>
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline"
            >
              پاک کردن همه
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">تاریخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">توضیح</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">دسته</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">نوع</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">مبلغ</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                      بارگذاری...
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <p className="mb-2">هیچ تراکنشی یافت نشد</p>
                    <Link
                      href="/dashboard/transactions/new"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <span>➕</span> ثبت تراکنش جدید
                    </Link>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">
                      {tx.description || <span className="text-muted-foreground">بدون توضیح</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.category ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${tx.category.color}20`,
                            color: tx.category.color,
                          }}
                        >
                          <span>{tx.category.icon}</span>
                          {tx.category.nameFa}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">بدون دسته</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          getTypeBg(tx.type),
                          getTypeColor(tx.type)
                        )}
                      >
                        {getTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span
                        className={cn("font-semibold", getTypeColor(tx.type))}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatNumber(tx.amount)} تومان
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/dashboard/transactions/${tx.id}`}
                          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          aria-label="مشاهده جزئیات"
                        >
                          👁️
                        </Link>
                        <Link
                          href={`/dashboard/transactions/${tx.id}/edit`}
                          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          aria-label="ویرایش"
                        >
                          ✏️
                        </Link>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-2 rounded-lg hover:bg-danger-light hover:text-danger transition-colors text-muted-foreground"
                          aria-label="حذف"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              نمایش {((pagination.page - 1) * pagination.limit) + 1} تا {Math.min(pagination.page * pagination.limit, pagination.total)} از {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                قبلی
              </button>
              <span className="px-3 text-sm text-foreground">
                صفحه {pagination.page} از {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function handleDelete(id: string) {
  if (!confirm("آیا از حذف این تراکنش مطمئن هستید؟")) return;

  fetch(`/api/transactions/${id}`, { method: "DELETE" })
    .then((res) => {
      if (res.ok) {
        window.location.reload();
      } else {
        alert("خطا در حذف تراکنش");
      }
    })
    .catch(() => alert("خطای شبکه"));
}