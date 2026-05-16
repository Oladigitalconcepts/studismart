import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Sparkles, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Props {
  notebookId: string;
  materials: any[];
}

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: { material_id: string; title: string; quote?: string }[];
}

export const NotebookChat = ({ notebookId, materials }: Props) => {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get or create chat for this notebook
  useEffect(() => {
    (async () => {
      const { data: { user } } = await getCurrentUser();
      if (!user) return;
      const { data: existing } = await supabase
        .from("notebook_chats")
        .select("id")
        .eq("notebook_id", notebookId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let cid = existing?.id;
      if (!cid) {
        const { data: created } = await supabase
          .from("notebook_chats")
          .insert({ user_id: user.id, notebook_id: notebookId })
          .select("id")
          .single();
        cid = created?.id;
      }
      if (!cid) return;
      setChatId(cid);
      const { data: msgs } = await supabase
        .from("notebook_messages")
        .select("id, role, content, citations")
        .eq("chat_id", cid)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []).map((m: any) => ({ ...m, citations: m.citations ?? [] })));
    })();
  }, [notebookId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const send = async () => {
    if (!input.trim() || !chatId || sending) return;
    if (materials.length === 0) {
      toast.error("Add some sources to this notebook first");
      return;
    }
    const question = input.trim();
    setInput("");
    setSending(true);
    // optimistic user msg
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: question, citations: [] },
    ]);
    try {
      const { data, error } = await supabase.functions.invoke("notebook-chat", {
        body: { notebook_id: notebookId, chat_id: chatId, question },
      });
      if (error) throw error;
      const answer = (data as any)?.answer ?? "";
      const citations = (data as any)?.citations ?? [];
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: answer, citations },
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't get an answer");
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold text-foreground">Ask your notebook</p>
            <p className="mt-1">Answers will be grounded in the sources you've added.</p>
          </div>
        ) : messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border",
            )}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
              {m.citations && m.citations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {m.citations.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      <BookOpen className="h-3 w-3 mr-1" /> {c.title}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Ask anything about your sources…"
          disabled={sending}
          className="h-11 rounded-xl"
        />
        <Button onClick={send} disabled={!input.trim() || sending} className="h-11 rounded-xl gradient-primary text-white">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
