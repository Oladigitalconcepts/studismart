import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Search, Mic, StickyNote } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { estimateCapacity } from "@/lib/testBuilder";

interface LibraryItem {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
  capacity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (materialId: string, title: string) => void;
}

export const LibraryPickerSheet = ({ open, onOpenChange, onPick }: Props) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("materials")
        .select("id, title, source_type, created_at, raw_text, transcript")
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      setItems(
        (data ?? [])
          .map((m: any) => {
            const text = `${m.raw_text ?? ""}\n${m.transcript ?? ""}`.trim();
            return {
              id: m.id,
              title: m.title,
              source_type: m.source_type,
              created_at: m.created_at,
              capacity: text.length >= 30 ? estimateCapacity(text) : 0,
            };
          })
          .filter((m) => m.capacity > 0),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((m) => m.title.toLowerCase().includes(s)) : items;
  }, [items, q]);

  const icon = (t: string) => (t === "audio" ? Mic : t === "text" ? StickyNote : FileText);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>Pick from library</SheetTitle>
        </SheetHeader>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your materials…"
              className="h-11 rounded-xl pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              No readable materials yet. Upload one first.
            </p>
          )}
          {filtered.map((m) => {
            const Icon = icon(m.source_type);
            return (
              <button
                key={m.id}
                onClick={() => { onPick(m.id, m.title); onOpenChange(false); }}
                className="w-full text-left rounded-2xl border border-border bg-card p-3 flex items-start gap-3 tap-scale"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words line-clamp-2">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Up to {m.capacity} questions · {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
