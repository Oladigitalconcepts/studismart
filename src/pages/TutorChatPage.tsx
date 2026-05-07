// AI Tutor chat — clean WhatsApp-style chat with fixed input, history drawer.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Sparkles, AlertTriangle, RotateCcw, History, Plus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { getTutor, type SmartAction } from "@/lib/tutors";
import { useWallet } from "@/hooks/useWallet";
import { StatusBar } from "@/components/studymind/StatusBar";
import { CoinBalancePill } from "@/components/studymind/CoinBalancePill";
import { InsufficientCoinsModal } from "@/components/studymind/InsufficientCoinsModal";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  cached?: boolean;
  pending?: boolean;
  error?: boolean;
  action?: string;
}

interface ChatItem {
  id: string;
  title: string;
  updated_at: string;
}

export default function TutorChatPage() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const tutor = getTutor(tutorId);
  const { wallet } = useWallet();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [insufficientCost, setInsufficientCost] = useState(0);
  const [errorRetry, setErrorRetry] = useState<null | { message: string; action: string }>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ChatItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hello = useMemo(() => tutor ? `Hi! I'm your ${tutor.name}. ${tutor.subtitle}. Ask me anything related to my domain.` : "", [tutor]);

  const loadHistory = async () => {
    if (!tutor) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("tutor_chats")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .eq("tutor_id", tutor.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    setHistory((data ?? []) as ChatItem[]);
  };

  const loadChat = async (id: string) => {
    setChatId(id);
    const { data: msgs } = await supabase
      .from("tutor_messages")
      .select("id, role, content, cached, action")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });
    setMessages((msgs ?? []).map((m: any) => ({ id: m.id, role: m.role, content: m.content, cached: m.cached, action: m.action })));
    setHistoryOpen(false);
  };

  useEffect(() => {
    (async () => {
      if (!tutor) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: chats } = await supabase
        .from("tutor_chats")
        .select("id")
        .eq("user_id", user.id)
        .eq("tutor_id", tutor.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (chats && chats[0]) {
        await loadChat(chats[0].id);
      }
      loadHistory();
    })();
  }, [tutor?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  if (!tutor) return null;

  const send = async (raw: string, action: string = "ask", cost: number = 0) => {
    const text = raw.trim();
    if (!text || sending) return;
    if (cost > 0 && (wallet?.coins ?? 0) < cost) {
      setInsufficientCost(cost);
      setShowInsufficient(true);
      return;
    }
    setErrorRetry(null);
    haptic("light");
    const tempId = `t_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId + "_u", role: "user", content: text, action },
      { id: tempId + "_a", role: "assistant", content: "", pending: true },
    ]);
    setInput("");
    setSending(true);

    try {
      const idempotencyKey = `${tutor.id}_${action}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const { data, error } = await supabase.functions.invoke("tutor-chat", {
        body: { tutorId: tutor.id, action, message: text, chatId, idempotencyKey },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!chatId && data.chatId) setChatId(data.chatId);
      window.dispatchEvent(new CustomEvent("wallet-updated"));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId + "_a"
            ? { ...m, content: data.answer, pending: false, cached: data.cached }
            : m,
        ),
      );
      loadHistory();
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? "error");
      if (msg.includes("insufficient")) {
        setInsufficientCost(cost);
        setShowInsufficient(true);
        setMessages((prev) => prev.filter((m) => m.id !== tempId + "_a" && m.id !== tempId + "_u"));
      } else if (msg.includes("daily_limit")) {
        setMessages((prev) =>
          prev.map((m) => m.id === tempId + "_a" ? { ...m, content: "You've used today's free questions. Try again tomorrow.", pending: false, error: true } : m),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => m.id === tempId + "_a" ? { ...m, content: "Something went wrong. Tap retry.", pending: false, error: true } : m),
        );
        setErrorRetry({ message: text, action });
      }
    } finally {
      setSending(false);
    }
  };

  const onAction = (a: SmartAction) => {
    const last = [...messages].reverse().find((m) => m.role === "user");
    const base = last?.content ?? "";
    if (!base) return;
    send(base, a.key, a.cost);
  };

  const newChat = () => {
    setChatId(null);
    setMessages([]);
    setInput("");
    setHistoryOpen(false);
  };

  const Icon = tutor.icon;
  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].pending;
  // Show only first 3 actions as suggestions after AI reply
  const suggestions = tutor.actions.slice(0, 3);

  return (
    <div className="screen-shell flex flex-col h-screen relative">
      <StatusBar tone="background" />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center gap-2 px-3 h-14">
          <button onClick={() => navigate("/tutor")} className="tap-scale -ml-1 p-2 rounded-full" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className={cn("h-9 w-9 rounded-2xl flex items-center justify-center", tutor.accent)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">{tutor.name}</div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Online
            </div>
          </div>
          <button onClick={() => setHistoryOpen(true)} className="tap-scale p-2 rounded-full" aria-label="History">
            <History className="h-5 w-5" />
          </button>
          <CoinBalancePill compact />
        </div>
      </header>

      {/* Messages — leave bottom space for fixed input */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-3 pb-40 space-y-3">
        {messages.length === 0 && (
          <div className={cn("rounded-2xl border p-3 text-sm", tutor.bubble)}>
            {hello}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex animate-fade-in", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-soft",
                m.role === "user" ? cn(tutor.user, "rounded-br-md") : cn("border", tutor.bubble, "rounded-bl-md"),
              )}
            >
              {m.role === "assistant" && m.cached && (
                <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 mb-1">
                  <Sparkles className="h-3 w-3" /> Instant answer
                </div>
              )}
              {m.error && (
                <div className="flex items-center gap-1 text-[10px] font-medium text-destructive mb-1">
                  <AlertTriangle className="h-3 w-3" /> Error
                </div>
              )}
              {m.pending ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs">AI is thinking…</span>
                </div>
              ) : m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:mt-2 prose-headings:mb-1 prose-code:text-xs">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}
        {errorRetry && (
          <div className="flex justify-center">
            <button
              onClick={() => send(errorRetry.message, errorRetry.action)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-secondary tap-scale"
            >
              <RotateCcw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
      </div>

      {/* Fixed input dock (sits above bottom nav, respects safe-area) */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-md bg-background/95 backdrop-blur-xl border-t border-border z-40"
        style={{ bottom: "calc(var(--bottom-nav-h, 64px) + 4px)" }}
      >
        {/* Suggestions only after an AI reply */}
        {lastIsAssistant && !sending && (
          <div className="px-3 pt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {suggestions.map((a) => (
              <button
                key={a.key}
                onClick={() => onAction(a)}
                className={cn(
                  "shrink-0 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium tap-scale",
                  tutor.bubble,
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <div className="px-3 py-2">
          <div className="flex items-end gap-2 rounded-full bg-card border border-border px-3 py-1.5 shadow-soft">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input, "ask", 1); }
              }}
              rows={1}
              placeholder="Ask anything…"
              className="flex-1 resize-none bg-transparent text-sm py-2 outline-none max-h-32"
            />
            <button
              disabled={sending || !input.trim()}
              onClick={() => send(input, "ask", 0)}
              className={cn("h-9 w-9 rounded-full flex items-center justify-center text-white tap-scale disabled:opacity-50", tutor.inputAccent)}
              aria-label="Send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* History drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setHistoryOpen(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative ml-auto w-[85%] max-w-sm h-full bg-background shadow-elevated flex flex-col animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 h-14 border-b border-border safe-top">
              <h2 className="flex-1 font-semibold text-sm">Chat history</h2>
              <button onClick={newChat} className="tap-scale inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-primary text-primary-foreground">
                <Plus className="h-3.5 w-3.5" /> New
              </button>
              <button onClick={() => setHistoryOpen(false)} className="tap-scale p-2 rounded-full" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {history.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6">No previous chats</div>
              )}
              {history.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadChat(c.id)}
                  className={cn(
                    "w-full text-left rounded-xl border border-border bg-card px-3 py-2 tap-scale",
                    chatId === c.id && "ring-2 ring-primary",
                  )}
                >
                  <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(c.updated_at).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <InsufficientCoinsModal
        open={showInsufficient}
        onOpenChange={setShowInsufficient}
        cost={insufficientCost}
        balance={wallet?.coins ?? 0}
        action="run this tutor action"
      />
    </div>
  );
}
