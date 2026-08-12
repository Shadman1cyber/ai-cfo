"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { formatNumber, formatDateTime, getTypeLabel, getTypeColor, getTypeBg, cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  description: string | null;
  date: string;
  receiptUrl: string | null;
  category: { id: string; nameFa: string; icon: string; color: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function TransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchTransaction = async () => {
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
      if (json.data) setTransaction(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransaction();
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("آیا از حذف این تراکنش مطمئن هستید؟ این کار غیرقابل بازگشت است.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/transactions");
        router.refresh();
      } else {
        alert("خطا در حذف تراکنش");
      }
    } catch {
      alert("خطای شبکه");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">جزئیات تراکنش</h1>
          <p className="text-muted-foreground">مشاهده اطلاعات کامل تراکنش</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/transactions/${params.id}/edit`}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            ✏️ ویرایش
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-danger/10 text-danger border border-danger/20 rounded-lg text-sm font-medium hover:bg-danger/20 transition-colors disabled:opacity-50"
          >
            {deleting ? "در حال حذف..." : "🗑️ حذف"}
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    getTypeBg(transaction.type),
                    getTypeColor(transaction.type)
                  )}
                >
                  {getTypeLabel(transaction.type)}
                </span>
                {transaction.category && (
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: `${transaction.category.color}20`,
                      color: transaction.category.color,
                    }}
                  >
                    {transaction.category.icon} {transaction.category.nameFa}
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-foreground">
                {transaction.type === "INCOME" ? "+" : "-"}
                {formatNumber(transaction.amount)} تومان
              </p>
            </div>
            <div className="text-left text-sm text-muted-foreground">
              <p>ایجاد شده: {formatDateTime(transaction.createdAt)}</p>
              {transaction.updatedAt !== transaction.createdAt && (
                <p>به‌روزرسانی: {formatDateTime(transaction.updatedAt)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">توضیحات</h3>
            <p className="text-foreground whitespace-pre-wrap">
              {transaction.description || <span className="text-muted-foreground">بدون توضیح</span>}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">تاریخ تراکنش</h3>
              <p className="text-foreground">{formatDateTime(transaction.date)}</p>
            </div>
            {transaction.category && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">دسته‌بندی</h3>
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: `${transaction.category.color}20`,
                      color: transaction.category.color,
                    }}
                  >
                    {transaction.category.icon} {transaction.category.nameFa}
                  </span>
                </div>
              </div>
            )}
          </div>

          {transaction.receiptUrl && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">تصویر رسید</h3>
              <div className="relative max-w-xs">
                <img
                  src={`/api/receipts/${transaction.receiptUrl}`}
                  alt="رسید تراکنش"
                  className="w-full rounded-lg border border-border"
                />
                <a
                  href={`/api/receipts/${transaction.receiptUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 left-2 px-3 py-1 bg-black/70 text-white text-xs rounded hover:bg-black/90 transition-colors"
                >
                  مشاهده در تب جدید
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}