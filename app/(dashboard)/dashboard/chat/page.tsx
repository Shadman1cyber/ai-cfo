"use client";

import { useEffect, useRef, useState } from "react";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  image?: string;
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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, historyLoaded]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/chat/history", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const loaded: ChatTurn[] = data.data || [];
        setMessages(loaded.map((m) => ({
          role: m.role,
          content: m.content,
          image: m.image,
        })));
        setHistoryLoaded(true);
      } catch (e) {
        console.error(e);
      }
    }
    loadHistory();
  }, []);

  const sendMessage = async (text: string) => {
    if (loading) return;

    const trimmed = text.trim();
    if (!trimmed) return;

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
        credentials: "include",
        body: JSON.stringify({ message: trimmed, history }),
      });

      const json = await res.json();

      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!res.ok || !json.data) {
        setError(json.error || "خطا در پردازش پیام، لطفاً دوباره تلاش کنید");
        return;
      }

      if (json.data.type === "duplicate_confirm") {
        setPendingConfirm(fileInputRef.current?.files?.[0] ?? null);
      }

      const assistantMessage: ChatTurn = { role: "assistant", content: json.data.response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError("خطای شبکه، لطفاً دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  };

  const sendImage = async (file: File, confirm: boolean = false) => {
    if (loading) return;

    const imageUrl = URL.createObjectURL(file);
    const userMessage: ChatTurn = { role: "user", content: "رسید ارسال شد", image: imageUrl };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setPendingConfirm(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("message", input);
    if (confirm) formData.append("confirm", "1");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const json = await res.json();

      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!res.ok || !json.data) {
        setError(json.error || "خطا در پردازشReceipt");
        return;
      }

      if (json.data.type === "duplicate_confirm") {
        setPendingConfirm(file);
      }

      const assistantMessage: ChatTurn = { role: "assistant", content: json.data.response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError("خطای شبکه، لطفاً دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendImage(file);
    e.target.value = "";
  };

  const deleteHistory = async () => {
    if (confirm("آیا می‌خواهید تاریخچه چت را پاک کنید؟")) {
      const res = await fetch("/api/chat/history", {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setMessages([]);
        setHistoryLoaded(false);
      }
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, historyLoaded]);

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
                {historyLoaded && (
                  <button
                    onClick={() => deleteHistory()}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    پاک کردن تاریخچه
                  </button>
                )}
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
                    {m.image && (
                      <img
                        src={m.image}
                        alt="رسید"
                        className="rounded-lg mb-2 max-h-40 w-auto object-contain bg-white/10"
                      />
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {pendingConfirm && (
                <div className="flex justify-end">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => pendingConfirm && sendImage(pendingConfirm, true)}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                    >
                      بله، دوباره ثبت کن
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingConfirm(null)}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}
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
      </div>

      <div className="border-t border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-end gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="ارسالReceipt"
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-lg" aria-hidden>📎</span>
          </button>
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
  );
}
