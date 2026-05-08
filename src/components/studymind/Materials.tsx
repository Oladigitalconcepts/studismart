import { useEffect, useMemo, useState } from "react";
import {
  Search, FileText, Plus, Loader2, Star, MoreVertical, Grid3x3, List,
  ArrowDownAZ, Clock, Trash2, Sparkles, BookOpen, Image as ImageIcon, FileType2,
} from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authUser";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cacheGet, cacheSet } from "@/lib/offlineCache";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Props {
  onUpload: () => void;
  onOpenPack: (packId: string) => void;
}

type FilterChip = "all" | "recent" | "favorites" | "ready" | "processing";
type SortOption = "newest" | "oldest" | "az";
type ViewMode = "list" | "grid";

const FAV_KEY = "studymind:favorites";
const VIEW_KEY = "studymind:materials:view";

const getFavorites = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch { return new Set(); }
};
const saveFavorites = (s: Set<string>) => {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...s])); } catch { /* noop */ }
};

const fileIconFor = (sourceType?: string) => {
  if (sourceType === "image") return ImageIcon;
  if (sourceType === "text") return FileType2;
  if (sourceType === "pdf") return BookOpen;
  return FileText;
};

const tryHaptic = (kind: "light" | "success" = "light") => {
  try { haptic(kind as any); } catch { /* noop */ }
};

export const Materials = ({ onUpload, onOpenPack }: Props) => {
  const [items, setItems] = useState<any[]>(() => cacheGet<any[]>(null, "materials") ?? []);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<FilterChip>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_KEY) as ViewMode) || "list",
  );
  const [favorites, setFavorites] = useState<Set<string>>(getFavorites);
  const [loading, setLoading] = useState(items.length === 0);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await getCurrentUser();
      if (user) {
        const cached = cacheGet<any[]>(user.id, "materials");
        if (cached && !cancelled) setItems(cached);
      }
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, status, source_type, created_at, study_packs(id)")
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

  const toggleFavorite = (id: string) => {
    tryHaptic("selection");
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveFavorites(next);
      return next;
    });
  };

  const handleDelete = async (m: any) => {
    const prev = items;
    setItems((arr) => arr.filter((x) => x.id !== m.id));
    setConfirmDelete(null);
    const { error } = await supabase.from("materials").delete().eq("id", m.id);
    if (error) {
      setItems(prev);
      toast.error("Couldn't delete material");
    } else {
      tryHaptic("success");
      toast.success("Material deleted");
      const { data: { user } } = await getCurrentUser();
      cacheSet(user?.id ?? null, "materials", prev.filter((x) => x.id !== m.id));
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = items.filter((i) => !q || i.title.toLowerCase().includes(q));
    if (chip === "favorites") arr = arr.filter((i) => favorites.has(i.id));
    else if (chip === "ready") arr = arr.filter((i) => i.status === "ready");
    else if (chip === "processing") arr = arr.filter((i) => i.status !== "ready" && i.status !== "failed");
    else if (chip === "recent") {
      const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
      arr = arr.filter((i) => new Date(i.created_at).getTime() >= weekAgo);
    }
    arr = [...arr].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "oldest" ? da - db : db - da;
    });
    return arr;
  }, [items, query, chip, sort, favorites]);

  const stats = useMemo(() => ({
    total: items.length,
    ready: items.filter((i) => i.status === "ready").length,
    favorites: items.filter((i) => favorites.has(i.id)).length,
  }), [items, favorites]);

  const chips: { id: FilterChip; label: string }[] = [
    { id: "all", label: "All" },
    { id: "recent", label: "Recent" },
    { id: "favorites", label: "Favorites" },
    { id: "ready", label: "Ready" },
    { id: "processing", label: "Processing" },
  ];

  return (
    <div className="animate-fade-in pb-24">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <div>
          <h1 className="font-bold text-xl">Library</h1>
          <p className="text-xs text-muted-foreground">All your study materials</p>
        </div>
        <button
          onClick={onUpload}
          className="h-10 w-10 rounded-full gradient-primary text-white flex items-center justify-center tap-scale shadow-elevated"
          aria-label="Upload material"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="px-5 mt-1 relative">
        <Search className="absolute left-9 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title"
          className="pl-10 h-12 rounded-2xl bg-secondary border-0"
        />
      </div>

      <div className="px-5 mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => { tryHaptic(); setChip(c.id); }}
            className={cn(
              "shrink-0 px-3 h-8 rounded-full text-xs font-semibold border transition-colors",
              chip === c.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground/80 border-border",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="px-5 mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {stats.total} materials · {stats.ready} ready · {stats.favorites}★
        </p>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 px-2 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-secondary">
              {sort === "az" ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {sort === "newest" ? "Newest" : sort === "oldest" ? "Oldest" : "A→Z"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSort("newest")}>Newest first</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("oldest")}>Oldest first</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("az")}>A → Z</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex rounded-lg border border-border overflow-hidden ml-1">
            <button
              onClick={() => { tryHaptic(); setView("list"); }}
              className={cn("h-8 w-8 flex items-center justify-center", view === "list" ? "bg-primary text-primary-foreground" : "bg-card")}
              aria-label="List view"
            ><List className="h-4 w-4" /></button>
            <button
              onClick={() => { tryHaptic(); setView("grid"); }}
              className={cn("h-8 w-8 flex items-center justify-center", view === "grid" ? "bg-primary text-primary-foreground" : "bg-card")}
              aria-label="Grid view"
            ><Grid3x3 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-3">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="font-semibold">
              {items.length === 0 ? "Your library is empty" : "Nothing matches your filters"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {items.length === 0
                ? "Upload notes, a PDF, or an image to start building your study packs."
                : "Try clearing your search or switching filter chip."}
            </p>
            {items.length === 0 && (
              <button
                onClick={onUpload}
                className="mt-4 h-10 px-5 rounded-xl gradient-primary text-white text-sm font-semibold tap-scale"
              >
                Upload your first material
              </button>
            )}
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((m) => {
              const Icon = fileIconFor(m.source_type);
              const packId = m.study_packs?.[0]?.id;
              const fav = favorites.has(m.id);
              return (
                <div key={m.id} className="relative rounded-2xl bg-card border border-border p-3 flex flex-col tap-scale">
                  <button
                    onClick={() => packId && onOpenPack(packId)}
                    disabled={!packId}
                    className="text-left flex-1 disabled:opacity-60"
                  >
                    <div className="h-20 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-2">
                      <Icon className="h-7 w-7" />
                    </div>
                    <p className="font-semibold text-sm line-clamp-2">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </p>
                  </button>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={m.status === "ready" ? "default" : "secondary"} className="capitalize text-[10px]">
                      {m.status}
                    </Badge>
                    <div className="flex items-center">
                      <button onClick={() => toggleFavorite(m.id)} className="h-7 w-7 flex items-center justify-center" aria-label="Favorite">
                        <Star className={cn("h-4 w-4", fav ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                      </button>
                      <RowMenu m={m} packId={packId} onOpen={onOpenPack} onDelete={() => setConfirmDelete(m)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => {
              const Icon = fileIconFor(m.source_type);
              const packId = m.study_packs?.[0]?.id;
              const fav = favorites.has(m.id);
              return (
                <div key={m.id} className="w-full p-3 rounded-2xl bg-card border border-border flex items-center gap-3">
                  <button
                    onClick={() => packId && onOpenPack(packId)}
                    disabled={!packId}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left tap-scale disabled:opacity-60"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
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
                  <button onClick={() => toggleFavorite(m.id)} className="h-8 w-8 flex items-center justify-center" aria-label="Favorite">
                    <Star className={cn("h-4 w-4", fav ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                  </button>
                  <RowMenu m={m} packId={packId} onOpen={onOpenPack} onDelete={() => setConfirmDelete(m)} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete material?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.title}" and its study pack will be removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const RowMenu = ({
  m, packId, onOpen, onDelete,
}: { m: any; packId?: string; onOpen: (id: string) => void; onDelete: () => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary" aria-label="More actions">
      <MoreVertical className="h-4 w-4 text-muted-foreground" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem disabled={!packId} onClick={() => packId && onOpen(packId)}>
        Open study pack
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4 mr-2" /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
