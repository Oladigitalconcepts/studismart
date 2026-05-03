import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authUser";
import type { AppNotification } from "@/lib/notifications";

export const useNotifications = () => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await getCurrentUser();
    if (!user) {
      setItems([]);
      setUnread(0);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (data ?? []) as unknown as AppNotification[];
    setItems(list);
    setUnread(list.filter((n) => !n.read_at).length);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await getCurrentUser();
      if (!user) return;
      channel = supabase
        .channel(`notifications:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => { void refresh(); },
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    const { data: { user } } = await getCurrentUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    await refresh();
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    await refresh();
  }, [refresh]);

  return { items, unread, loading, refresh, markAllRead, markRead, remove };
};
