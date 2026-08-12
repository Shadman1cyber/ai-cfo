"use client";

import { useEffect, useRef, useState } from "react";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "وضعیت مالی من چطور است؟",
  "بیشترین هزینه‌های من کدامند؟",
  "چطور می‌توانم هزینه‌هایم را کاهش دهم؟",
  "آخرین تراکنش‌های من چیست؟",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatTurn = { role: "user", content: trimmed };
    const history = messages.slice(-12).map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const json = await res.json();

      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!res.ok || !json.data) {
        setError("خطا در دریافت پاسخ، لطفاً دوباره تلاش کنید");
        return;
      }

      const assistantMessage: ChatTurn = { role: "assistant", content: json.data.reply };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError("خطای شبکه، لطفاً دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">دستیار هوشمند</h1>
        <p className="text-muted-foreground">
          از هوش مصنوعی درباره وضعیت مالی و تراکنش‌های خود سؤال بپرسید
        </p>
      </div>

      <div className="bg-card border rounded-xl flex flex-col h-[65vh] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4">
              <div className="text-5xl">🤖</div>
              <div>
                <p className="font-medium text-foreground mb-1">سلام! من دستیار مالی شما هستم</p>
                <p className="text-sm text-muted-foreground">
                  سؤالاتی مثل این‌ها را از من بپرسید
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                    className="text-right px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-white rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-end">
                  <div className="bg-muted text-foreground px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5">
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-center text-danger text-sm" role="alert">
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              rows={2}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 resize-none px-4 py-2.5 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ارسال
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}