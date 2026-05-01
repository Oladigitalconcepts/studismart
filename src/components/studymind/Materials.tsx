import { useEffect, useState } from "react";
import { Search, FileText, Plus, Loader2 } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cacheGet, cacheSet } from "@/lib/offlineCache";

interface Props {
  onUpload: () => void;
  onOpenPack: (packId: string) => void;
}

export const Materials = ({ onUpload, onOpenPack }: Props) => {
  // Hydrate immediately from cache so offline users see prior materials.
  const [items, setItems] = useState<any[]>(() => cacheGet<any[]>(null, "materials") ?? []);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(items.length === 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Re-hydrate with user-scoped cache once we know the user id.
      if (user) {
        const cached = cacheGet<any[]>(user.id, "materials");
        if (cached && !cancelled) setItems(cached);
      }
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, status, created_at, study_packs(id)")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (!error && data) {
        setItems(data);
        cacheSet(user?.id ?? null, "materials", data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <h1 className="font-bold text-lg">Materials</h1>
      </header>

      <div className="px-5 mt-2 relative">
        <Search className="absolute left-9 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search materials"
          className="pl-10 h-12 rounded-2xl bg-secondary border-0"
        />
      </div>

      <div className="px-5 mt-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-12">
            {items.length === 0 ? "No materials yet. Tap + to upload." : "No materials match your search."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => {
              const packId = m.study_packs?.[0]?.id;
              return (
                <button
                  key={m.id}
                  onClick={() => packId && onOpenPack(packId)}
                  disabled={!packId}
                  className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale text-left disabled:opacity-60"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={m.status === "ready" ? "default" : "secondary"} className="capitalize text-[10px]">
                    {m.status}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={onUpload}
        className="fixed bottom-20 left-1/2 translate-x-[7.5rem] h-14 w-14 rounded-full gradient-primary text-white shadow-elevated flex items-center justify-center tap-scale z-40"
        aria-label="Upload material"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
};
