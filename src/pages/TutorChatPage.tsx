// AI Tutor chat screen — premium chat UI with smart action buttons,
// coin-aware sends, caching badge, and streaming-feel UX (non-streaming).
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, Loader2, Sparkles, AlertTriangle, RotateCcw, Coins } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const hello = useMemo(() => tutor ? `Hi! I'm your ${tutor.name}. ${tutor.subtitle}. Ask me anything related to my domain.` : "", [tutor]);

  useEffect(() => {
    // Restore most recent chat for this tutor (if any)
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
        setChatId(chats[0].id);
        const { data: msgs } = await supabase
          .from("tutor_messages")
          .select("id, role, content, cached, action")
          .eq("chat_id", chats[0].id)
          .order("created_at", { ascending: true });
        setMessages((msgs ?? []).map((m: any) => ({ id: m.id, role: m.role, content: m.content, cached: m.cached, action: m.action })));
      }
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
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? "error");
      if (msg.includes("insufficient")) {
        setInsufficientCost(cost);
        setShowInsufficient(true);
        setMessages((prev) => prev.filter((m) => m.id !== tempId + "_a" && m.id !== tempId + "_u"));
      } else if (msg.includes("daily_limit")) {
        setMessages((prev) =>
          prev.map((m) => m.id === tempId + "_a" ? { ...m, content: "You've used today's free questions. Try a paid action or come back tomorrow.", pending: false, error: true } : m),
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
    const base = last?.content ?? input.trim();
    if (!base) {
      setInput("");
      return;
    }
    send(base, a.key, a.cost);
  };

  const Icon = tutor.icon;
  const coins = wallet?.coins ?? 0;
  const showCoinWarn = input.length > 0 && coins < 1;

  return (
    <div className="screen-shell pb-24 flex flex-col h-screen">
      <StatusBar tone="background" />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-3 h-16">
          <button onClick={() => navigate("/tutor")} className="tap-scale -ml-1 p-2 rounded-full" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", tutor.accent)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">{tutor.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{tutor.subtitle}</div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Online
            </div>
          </div>
          <CoinBalancePill />
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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

      {/* Smart actions */}
      <div className="px-3 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {tutor.actions.map((a) => (
          <button
            key={a.key}
            disabled={sending}
            onClick={() => onAction(a)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium tap-scale disabled:opacity-50",
              tutor.bubble,
            )}
          >
            <span>{a.label}</span>
            {a.cost > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-amber-600">
                <Coins className="h-3 w-3" /> +{a.cost}
              </span>
            ) : (
              <span className="text-muted-foreground">Free</span>
            )}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex items-end gap-2 rounded-full bg-card border border-border px-2 py-1.5 shadow-soft">
          <button className="p-2 text-muted-foreground tap-scale" aria-label="Attach"><Paperclip className="h-4 w-4" /></button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input, "ask", 0); }
            }}
            rows={1}
            placeholder={tutor.placeholder}
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
        <div className="flex items-center justify-center text-[10px] text-muted-foreground mt-1.5 gap-1">
          {showCoinWarn ? (
            <span className="text-amber-600 inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Low coins — actions may require coins
            </span>
          ) : (
            <>This action costs <Coins className="h-3 w-3 text-amber-500 inline" /> 0 (Q&A free daily)</>
          )}
        </div>
      </div>

      <InsufficientCoinsModal
        open={showInsufficient}
        onOpenChange={setShowInsufficient}
        cost={insufficientCost}
        balance={coins}
        action="run this tutor action"
      />
    </div>
  );
}
