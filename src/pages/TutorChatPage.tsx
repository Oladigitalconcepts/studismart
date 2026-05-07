// AI Tutor chat — premium, ChatGPT-mobile inspired UI.
// Features: streaming-feel typing indicator, copy / regenerate, scroll-to-bottom
// FAB, attachment (PDF/DOCX/TXT/IMG -> text), voice input via Web Speech API,
// auto-expanding textarea, history drawer, markdown + code styling.
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft, Send, Loader2, Sparkles, AlertTriangle, RotateCcw, MoreVertical,
  Plus, X, Copy, Check, Mic, MicOff, Paperclip, ChevronDown, MessageSquarePlus, Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { getTutor, type SmartAction } from "@/lib/tutors";
import { useWallet } from "@/hooks/useWallet";
import { StatusBar } from "@/components/studymind/StatusBar";
import { CoinBalancePill } from "@/components/studymind/CoinBalancePill";
import { InsufficientCoinsModal } from "@/components/studymind/InsufficientCoinsModal";
import { haptic } from "@/lib/haptics";
import { extractTextFromFile } from "@/lib/extractText";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  cached?: boolean;
  pending?: boolean;
  error?: boolean;
  action?: string;
  created_at?: string;
}

interface ChatItem { id: string; title: string; updated_at: string }

const fmtTime = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

const REDIRECT_RE = /\[\[REDIRECT\s+tutor=([a-z]+)\s+prompt="([^"]+)"\s*\]\]/i;
const parseRedirect = (text: string): { clean: string; redirect: { tutor: string; prompt: string } | null } => {
  const m = text.match(REDIRECT_RE);
  if (!m) return { clean: text, redirect: null };
  return { clean: text.replace(REDIRECT_RE, "").trim(), redirect: { tutor: m[1].toLowerCase(), prompt: m[2] } };
};

// Detect Speech Recognition (Chrome/Safari iOS supports webkitSpeechRecognition).
const SR: any = typeof window !== "undefined"
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

export default function TutorChatPage() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);

  const hello = useMemo(
    () => (tutor ? `Hi 👋 I'm your ${tutor.name}. ${tutor.subtitle}. Ask me anything — or just say hi.` : ""),
    [tutor],
  );

  // ---- Data ----
  const loadHistory = useCallback(async () => {
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
  }, [tutor]);

  const loadChat = async (id: string) => {
    setChatId(id);
    const { data: msgs } = await supabase
      .from("tutor_messages")
      .select("id, role, content, cached, action, created_at")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });
    setMessages((msgs ?? []).map((m: any) => ({
      id: m.id, role: m.role, content: m.content, cached: m.cached, action: m.action, created_at: m.created_at,
    })));
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
      if (chats && chats[0]) await loadChat(chats[0].id);
      loadHistory();
    })();
  }, [tutor?.id]);

  // Prefill input from a redirect suggestion.
  useEffect(() => {
    const s = (location.state as any)?.suggested;
    if (s) {
      setInput(s);
      // Clear state so it doesn't refire.
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages.length, sending]);

  // Auto-expand textarea (max ~5 lines).
  useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 140) + "px";
  }, [input]);

  // Show "scroll to bottom" FAB when not at the bottom.
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distFromBottom > 240);
  };

  if (!tutor) return null;

  // ---- Send ----
  const send = async (raw: string, action: string = "ask", cost: number = 1) => {
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
    const nowIso = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { id: tempId + "_u", role: "user", content: text, action, created_at: nowIso },
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
            ? { ...m, content: data.answer, pending: false, cached: data.cached, created_at: new Date().toISOString() }
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
      } else {
        setMessages((prev) =>
          prev.map((m) => m.id === tempId + "_a"
            ? { ...m, content: "Something went wrong. Tap retry.", pending: false, error: true }
            : m),
        );
        setErrorRetry({ message: text, action });
      }
    } finally {
      setSending(false);
    }
  };

  const onAction = (a: SmartAction) => {
    const last = [...messages].reverse().find((m) => m.role === "user");
    if (!last) return;
    send(last.content, a.key, a.cost);
  };

  const regenerate = (assistantId: string) => {
    const idx = messages.findIndex((m) => m.id === assistantId);
    if (idx <= 0) return;
    const userMsg = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!userMsg) return;
    setMessages((prev) => prev.slice(0, idx)); // drop the old assistant reply
    send(userMsg.content, userMsg.action ?? "ask", 1);
  };

  const copyMsg = async (m: ChatMsg) => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopiedId(m.id);
      haptic("selection");
      setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1400);
    } catch {/* noop */}
  };

  const newChat = () => {
    setChatId(null);
    setMessages([]);
    setInput("");
    setHistoryOpen(false);
  };

  const deleteChat = async (id: string) => {
    if (!confirm("Delete this chat? This cannot be undone.")) return;
    await supabase.from("tutor_messages").delete().eq("chat_id", id);
    await supabase.from("tutor_chats").delete().eq("id", id);
    haptic("light");
    if (id === chatId) newChat();
    setHistory((h) => h.filter((c) => c.id !== id));
    toast({ title: "Chat deleted" });
  };

  // ---- Voice input ----
  const toggleVoice = () => {
    if (!SR) {
      toast({ title: "Voice not supported", description: "Try Chrome or Safari on iOS." });
      return;
    }
    if (recording) {
      recogRef.current?.stop();
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    r.onresult = (ev: any) => {
      let txt = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      setInput((prev) => (prev ? prev + " " : "") + txt);
    };
    r.onend = () => setRecording(false);
    r.onerror = () => setRecording(false);
    recogRef.current = r;
    try { r.start(); setRecording(true); haptic("light"); } catch {/* noop */}
  };

  // ---- Attachment ----
  const onAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      toast({ title: "Reading file…", description: f.name });
      const text = await extractTextFromFile(f);
      const trimmed = text.slice(0, 6000);
      setInput((prev) => (prev ? prev + "\n\n" : "") + `Here is the file "${f.name}":\n\n${trimmed}`);
      textareaRef.current?.focus();
    } catch (err: any) {
      toast({ title: "Could not read file", description: err?.message ?? "Try a PDF, DOCX or TXT.", variant: "destructive" });
    }
  };

  const Icon = tutor.icon;
  const lastIsAssistant = messages.length > 0
    && messages[messages.length - 1].role === "assistant"
    && !messages[messages.length - 1].pending;
  const suggestions = tutor.actions.slice(0, 3);

  return (
    <div
      className="fixed inset-x-0 top-0 bottom-0 mx-auto w-full max-w-md flex flex-col bg-background z-20"
      style={{ height: "calc(100dvh - var(--bottom-nav-h, 64px))" }}
    >
      <StatusBar tone="background" />

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center gap-2 px-3 h-14">
          <button
            onClick={() => navigate("/tutor")}
            className="tap-scale -ml-1 h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shadow-soft", tutor.accent)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold leading-tight truncate">{tutor.name}</div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Online
            </div>
          </div>
          <CoinBalancePill compact />
          <button
            onClick={newChat}
            className="tap-scale h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary"
            aria-label="New chat"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            className="tap-scale h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary"
            aria-label="Menu"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* MESSAGES */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto momentum-scroll"
      >
        <div className="mx-auto max-w-md px-4 pt-5 pb-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center pt-6 animate-fade-in">
              <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center shadow-md mb-3", tutor.accent)}>
                <Icon className="h-7 w-7" />
              </div>
              <div className="text-base font-semibold">{tutor.name}</div>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">{hello}</p>
              <div className="grid grid-cols-1 gap-2 mt-5 w-full">
                {suggestions.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => onAction(a)}
                    className="text-left rounded-2xl border border-border bg-card hover:bg-secondary px-4 py-3 text-sm tap-scale"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={cn("group flex flex-col animate-fade-in", isUser ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[86%] rounded-3xl px-4 py-2.5 text-[14.5px] leading-relaxed shadow-soft overflow-hidden break-words [overflow-wrap:anywhere]",
                    isUser
                      ? cn(tutor.user, "rounded-br-md")
                      : "bg-secondary text-foreground rounded-bl-md border border-border/60",
                  )}
                >
                  {!isUser && m.cached && (
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
                    <TypingDots />
                  ) : isUser ? (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  ) : (() => {
                    const { clean, redirect } = parseRedirect(m.content);
                    return (
                      <>
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:mt-3 prose-headings:mb-1 prose-pre:my-2 prose-pre:rounded-xl prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:p-3 prose-pre:overflow-x-auto prose-pre:max-w-full prose-code:text-[12.5px] prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:bg-muted prose-code:before:content-none prose-code:after:content-none [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words [&_a]:break-all">
                          <ReactMarkdown>{clean}</ReactMarkdown>
                        </div>
                        {redirect && (
                          <button
                            onClick={() => navigate(`/tutor/${redirect.tutor}`, { state: { suggested: redirect.prompt } })}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 tap-scale"
                          >
                            <Sparkles className="h-3 w-3" /> Ask the {redirect.tutor} tutor →
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Footer: time + actions */}
                {!m.pending && (
                  <div className={cn(
                    "flex items-center gap-2 mt-1 px-1 text-[10px] text-muted-foreground transition-opacity",
                    isUser ? "flex-row-reverse" : "flex-row",
                  )}>
                    <span>{fmtTime(m.created_at)}</span>
                    {!isUser && (
                      <>
                        <button onClick={() => copyMsg(m)} className="tap-scale inline-flex items-center gap-1 hover:text-foreground">
                          {copiedId === m.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          {copiedId === m.id ? "Copied" : "Copy"}
                        </button>
                        {idx === messages.length - 1 && (
                          <button onClick={() => regenerate(m.id)} className="tap-scale inline-flex items-center gap-1 hover:text-foreground">
                            <RotateCcw className="h-3 w-3" /> Regenerate
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

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
      </div>

      {/* SCROLL TO BOTTOM FAB */}
      {showScrollDown && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
          className="absolute left-1/2 -translate-x-1/2 z-30 h-9 w-9 rounded-full bg-card border border-border shadow-elevated flex items-center justify-center tap-scale animate-fade-in"
          style={{ bottom: "96px" }}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* INPUT DOCK — anchored within flex layout so it never moves while scrolling */}
      <div className="shrink-0 bg-background/95 backdrop-blur-xl border-t border-border z-40 safe-bottom">

        {lastIsAssistant && !sending && (
          <div className="px-3 pt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {suggestions.map((a) => (
              <button
                key={a.key}
                onClick={() => onAction(a)}
                className="shrink-0 inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium tap-scale hover:bg-secondary"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <div className="px-3 py-2.5">
          <div className="flex items-end gap-1.5 rounded-3xl bg-card border border-border px-1.5 py-1 shadow-soft">
            <button
              onClick={() => fileRef.current?.click()}
              className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary tap-scale"
              aria-label="Attach file"
              type="button"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,image/*"
              className="hidden"
              onChange={onAttach}
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input, "ask", 1); }
              }}
              rows={1}
              placeholder={tutor.placeholder}
              className="flex-1 resize-none bg-transparent text-[15px] leading-snug py-2 px-1 outline-none max-h-[140px]"
            />
            {input.trim() ? (
              <button
                disabled={sending}
                onClick={() => send(input, "ask", 1)}
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-white tap-scale disabled:opacity-50 transition-transform",
                  tutor.inputAccent,
                )}
                aria-label="Send"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            ) : (
              <button
                onClick={toggleVoice}
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center tap-scale transition-colors",
                  recording ? "bg-destructive text-white animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
                aria-label={recording ? "Stop recording" : "Voice input"}
                type="button"
              >
                {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* HISTORY DRAWER */}
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
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border border-border bg-card pl-3 pr-1.5 py-2",
                    chatId === c.id && "ring-2 ring-primary",
                  )}
                >
                  <button
                    onClick={() => loadChat(c.id)}
                    className="flex-1 min-w-0 text-left tap-scale"
                  >
                    <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(c.updated_at).toLocaleString()}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteChat(c.id)}
                    className="tap-scale h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1.5" aria-label="AI is typing">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="h-2 w-2 rounded-full bg-muted-foreground/60 inline-block"
        style={{ animation: `typing-bounce 1.2s ${i * 0.15}s infinite ease-in-out` }}
      />
    ))}
    <style>{`@keyframes typing-bounce { 0%,80%,100% { transform: translateY(0); opacity: .4 } 40% { transform: translateY(-4px); opacity: 1 } }`}</style>
  </div>
);
