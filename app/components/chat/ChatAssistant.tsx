"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  action?: string;
  timestamp: Date;
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    const newUserMessage: ChatMessage = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "خطای ناشناخته" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const json = await res.json();

      if (json.data) {
        const { response, action } = json.data;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response,
            action,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.error || "خطا در پردازش پیام",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "خطای شبکه. لطفاً دوباره تلاش کنید.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiptUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("autoCreate", "true");

    setIsLoading(true);

    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "خطای ناشناخته" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const json = await res.json();

      if (json.data) {
        const { ocr, transaction } = json.data;
        let response = `📄 رسید پردازش شد:\n`;
        response += `💰 مبلغ: ${ocr.data.amount?.toLocaleString("fa-IR") || "تشخیص نشد"} تومان\n`;
        response += `🏪 فروشنده: ${ocr.data.merchant || "تشخیص نشد"}\n`;
        response += `📅 تاریخ: ${ocr.data.date || "تشخیص نشد"}\n`;

        if (transaction) {
          response += `\n✅ تراکنش خودکار ایجاد شد: ${transaction.description} - ${Number(transaction.amount).toLocaleString("fa-IR")} تومان`;
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response, timestamp: new Date() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.error || "خطا در پردازش رسید", timestamp: new Date() },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "خطای شبکه در آپلود رسید", timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
      setShowReceiptUpload(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleReceiptUpload(file);
    e.target.value = "";
  };

  const quickActions = [
    { label: "📊 خلاصه مالی", message: "خلاصه مالی این ماه رو نشون بده" },
    { label: "📝 تراکنش‌های اخیر", message: "آخرین ۱۰ تراکنش رو نشون بده" },
    { label: "➕ تراکنش جدید", message: "تراکنش ۱۰۰ هزار تومان هزینه ناهار ثبت کن" },
    { label: "🏷️ دسته‌بندی‌ها", message: "تمام دسته‌بندی‌ها رو نشون بده" },
    { label: "📄 آپلود رسید", action: () => setShowReceiptUpload(true) },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-4 left-4 z-50 p-3 rounded-full shadow-lg transition-all",
          "bg-primary text-white hover:bg-primary-hover",
          isOpen && "bg-danger"
        )}
        aria-label={isOpen ? "بستن چت" : "باز کردن دستیار مالی"}
        style={{ border: '2px solid red', background: 'green' }} // DEBUG
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div
          ref={chatContainerRef}
          className="fixed bottom-4 left-4 z-50 w-full max-w-md lg:max-w-lg h-[500px] lg:h-[600px] bg-card border border-border rounded-xl shadow-xl flex flex-col overflow-hidden animate-slide-up"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">دستیار مالی هوشمند</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={chatContainerRef}>
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p className="mb-2">سلام! چطور می‌توانم کمکت کنم؟</p>
                <p className="text-sm">{'می‌توانید بپرسید: "خلاصه مالی"، "تراکنش جدید"، "دسته‌بندی‌ها"...'}</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-2 max-w-[85%]",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  )}
                >
                  {msg.content}
                  <div className="text-xs opacity-60 mt-1 text-left">
                    {msg.timestamp.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground px-4 py-2 rounded-2xl rounded-tl-sm animate-pulse">
                  <span className="flex gap-1">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {showReceiptUpload ? (
            <div className="p-4 border-t border-border bg-muted/50">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-medium">آپلود رسید</h4>
                <button
                  onClick={() => setShowReceiptUpload(false)}
                  className="p-1 rounded hover:bg-background transition-colors"
                >
                  ✕
                </button>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="w-full mb-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                رسید را آپلود کنید تا اطلاعات استخراج و تراکنش ایجاد شود
              </p>
            </div>
          ) : (
            <div className="p-4 border-t border-border">
              <div className="flex flex-wrap gap-2 mb-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => action.action ? action.action() : setInput(action.message)}
                    className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="پیام خود را تایپ کنید..."
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  ارسال
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}