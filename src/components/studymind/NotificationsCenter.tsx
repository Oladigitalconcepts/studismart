import { ArrowLeft, Bell, BellOff, CheckCheck, Flame, Trophy, Sparkles, BookOpen, Trash2 } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import type { NotifType } from "@/lib/notifications";

const iconFor = (type: NotifType) => {
  switch (type) {
    case "streak": return { icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" };
    case "achievement": return { icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" };
    case "study_pack_ready": return { icon: BookOpen, color: "text-primary", bg: "bg-primary-soft" };
    case "study_reminder": return { icon: Bell, color: "text-blue-500", bg: "bg-blue-500/10" };
    default: return { icon: Sparkles, color: "text-violet-500", bg: "bg-violet-500/10" };
  }
};

interface Props {
  onBack: () => void;
  onOpenItem?: (type: NotifType, data: Record<string, unknown>) => void;
}

export const NotificationsCenter = ({ onBack, onOpenItem }: Props) => {
  const { items, unread, loading, markAllRead, markRead, remove } = useNotifications();

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <header className="flex items-center px-5 pt-2 pb-4 gap-3">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center tap-scale" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-semibold text-base flex-1">Notifications</h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-primary flex items-center gap-1 tap-scale">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </header>

      <div className="px-5 pb-24 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-3">
              <BellOff className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-sm">You're all caught up</p>
            <p className="text-xs text-muted-foreground mt-1">New notifications will appear here.</p>
          </div>
        ) : (
          items.map((n) => {
            const { icon: Icon, color, bg } = iconFor(n.type as NotifType);
            const isUnread = !n.read_at;
            return (
              <div
                key={n.id}
                className={`rounded-2xl border p-3 flex items-start gap-3 transition-colors ${
                  isUnread ? "bg-primary-soft/40 border-primary/20" : "bg-card border-border"
                }`}
              >
                <button
                  className="flex items-start gap-3 flex-1 text-left tap-scale"
                  onClick={() => {
                    void markRead(n.id);
                    onOpenItem?.(n.type as NotifType, n.data);
                  }}
                >
                  <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{n.title}</p>
                      {isUnread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => void remove(n.id)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive tap-scale"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
