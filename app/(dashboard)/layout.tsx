import { auth } from "@/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { ChatAssistant } from "@/components/chat/ChatAssistant";

const navigation = [
  { href: "/dashboard", label: "داشبورد", icon: "📊" },
  { href: "/dashboard/transactions", label: "تراکنش‌ها", icon: "📝" },
  { href: "/dashboard/categories", label: "دسته‌بندی‌ها", icon: "🏷️" },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:min-h-screen bg-card border-l border-border">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <span className="text-xl font-bold text-foreground">حسابداری هوشمند</span>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1" role="navigation" aria-label="منوی اصلی">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-danger-light hover:text-danger transition-colors"
              >
                <span className="text-xl">🚪</span>
                <span className="font-medium">خروج</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 lg:ml-0">
        <header className="lg:hidden fixed top-0 right-0 left-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between h-16 px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <span className="font-bold text-foreground">حسابداری هوشمند</span>
            </Link>
          </div>
        </header>

        <div className="lg:pt-0 pt-16 pb-20 lg:pb-0 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </div>

        <nav
          className="lg:hidden fixed bottom-0 right-0 left-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border"
          role="navigation"
          aria-label="منوی موبایل"
        >
          <div className="flex justify-around h-16">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 text-foreground"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
            <form action="/api/auth/signout" method="POST" className="flex flex-col items-center justify-center gap-1 text-foreground cursor-pointer">
              <button type="submit" className="flex flex-col items-center justify-center gap-1">
                <span className="text-xl">🚪</span>
                <span className="text-[10px] font-medium">خروج</span>
              </button>
            </form>
          </div>
        </nav>
      </main>

      <ChatAssistant />
    </div>
  );
}