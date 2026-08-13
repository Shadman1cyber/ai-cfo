"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatNumber, formatDate, getTypeLabel, getTypeColor } from "@/lib/utils";

interface DashboardData {
  summary: {
    income: number;
    expense: number;
    balance: number;
    incomeCount: number;
    expenseCount: number;
  };
  categoryBreakdown: Array<{
    category: { id: string; nameFa: string; icon: string; color: string; type: string } | null;
    type: string;
    totalAmount: number;
    count: number;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    date: string;
    category: { id: string; nameFa: string; icon: string; color: string } | null;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard", {
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        if (json.data) {
          setData(json.data);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">خطا در بارگذاری داشبورد</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-primary hover:underline"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  const { summary, categoryBreakdown, recentTransactions } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">داشبورد</h1>
          <p className="text-muted-foreground">نمای کلی وضعیت مالی کسب‌وکار شما</p>
        </div>
        <Link
          href="/dashboard/transactions/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
        >
          <span>➕</span> تراکنش جدید
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard
          label="مجموع درآمدها"
          value={summary.income}
          count={summary.incomeCount}
          icon="📈"
          color="success"
        />
        <SummaryCard
          label="مجموع هزینه‌ها"
          value={summary.expense}
          count={summary.expenseCount}
          icon="📉"
          color="danger"
        />
        <SummaryCard
          label="موجودی"
          value={summary.balance}
          icon="💰"
          color={summary.balance >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBreakdownChart data={categoryBreakdown} />
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  count,
  icon,
  color,
}: {
  label: string;
  value: number;
  count?: number;
  icon: string;
  color: "success" | "danger" | "warning" | "primary";
}) {
  const colorClasses = {
    success: "bg-success/10 text-success border-success/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    primary: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatNumber(value)} تومان</p>
          {count !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">{count} تراکنش</p>
          )}
        </div>
        <div
          className={`p-3 rounded-xl ${colorClasses[color]}`}
          aria-hidden="true"
        >
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function CategoryBreakdownChart({
  data,
}: {
  data: Array<{
    category: { id: string; nameFa: string; icon: string; color: string; type: string } | null;
    type: string;
    totalAmount: number;
    count: number;
  }>;
}) {
  const expenseData = data.filter((d) => d.type === "EXPENSE");
  const incomeData = data.filter((d) => d.type === "INCOME");
  const totalExpense = expenseData.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalIncome = incomeData.reduce((sum, d) => sum + d.totalAmount, 0);

  return (
    <div className="bg-card border rounded-xl p-5">
      <h2 className="text-lg font-semibold text-foreground mb-4">توزیع دسته‌بندی‌ها</h2>

      <div className="space-y-4">
        {expenseData.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-danger mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-danger" /> هزینه‌ها
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expenseData.map((item) => (
                <CategoryBar
                  key={item.category?.id || "none"}
                  label={item.category?.nameFa || "بدون دسته"}
                  icon={item.category?.icon || "❓"}
                  color={item.category?.color || "#94A3B8"}
                  value={item.totalAmount}
                  total={totalExpense}
                  count={item.count}
                />
              ))}
            </div>
          </div>
        )}

        {incomeData.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-success mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" /> درآمدها
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incomeData.map((item) => (
                <CategoryBar
                  key={item.category?.id || "none"}
                  label={item.category?.nameFa || "بدون دسته"}
                  icon={item.category?.icon || "❓"}
                  color={item.category?.color || "#94A3B8"}
                  value={item.totalAmount}
                  total={totalIncome}
                  count={item.count}
                />
              ))}
            </div>
          </div>
        )}

        {expenseData.length === 0 && incomeData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>هنوز تراکنشی ثبت نشده</p>
            <Link
              href="/dashboard/transactions/new"
              className="text-primary hover:underline mt-2 inline-block"
            >
              اولین تراکنش را ثبت کنید
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryBar({
  label,
  icon,
  color,
  value,
  total,
  count,
}: {
  label: string;
  icon: string;
  color: string;
  value: number;
  total: number;
  count: number;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{formatNumber(value)} تومان</span>
        <span className="text-xs text-muted-foreground">{count} تراکنش</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function RecentTransactions({
  transactions,
}: {
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    date: string;
    category: { id: string; nameFa: string; icon: string; color: string } | null;
  }>;
}) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">آخرین تراکنش‌ها</h2>
        <Link
          href="/dashboard/transactions"
          className="text-sm text-primary hover:underline"
        >
          مشاهده همه
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>هنوز تراکنشی ثبت نشده</p>
          <Link
            href="/dashboard/transactions/new"
            className="text-primary hover:underline mt-2 inline-block"
          >
            اولین تراکنش را ثبت کنید
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <Link
              key={tx.id}
              href={`/dashboard/transactions/${tx.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
            >
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${tx.category?.color || "#94A3B8"}20` }}
              >
                <span className="text-lg">{tx.category?.icon || "📝"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {tx.description || "بدون توضیح"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tx.category?.nameFa || "بدون دسته"} • {formatDate(tx.date)}
                </p>
              </div>
              <div className="text-left">
                <p
                  className={`text-sm font-semibold ${
                    tx.type === "INCOME" ? "text-success" : "text-danger"
                  }`}
                >
                  {tx.type === "INCOME" ? "+" : "-"}
                  {formatNumber(tx.amount)} تومان
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}