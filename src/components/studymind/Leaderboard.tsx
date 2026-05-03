import { useEffect, useState } from "react";
import { ArrowLeft, Trophy, Loader2, Medal } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authUser";

interface Props { onBack: () => void }

interface Row {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_correct: number;
  total_questions: number;
  sessions: number;
  accuracy: number;
  score: number;
  rank: number;
}

const initials = (n: string) => (n || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export const Leaderboard = ({ onBack }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getCurrentUser();
      setMe(user?.id ?? null);
      const { data } = await supabase.rpc("weekly_leaderboard");
      setRows((data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const myRow = rows.find((r) => r.user_id === me);
  const top = rows.slice(0, 50);

  return (
    <div className="animate-fade-in pb-4">
      <StatusBar />
      <div className="flex items-center px-5 pt-2 pb-3 relative">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center tap-scale" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-base">Weekly Leaderboard</h1>
      </div>

      <div className="px-5">
        <Card className="rounded-2xl p-4 bg-warning/10 border-warning/30 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-warning/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Weekly Challenge</p>
            <p className="text-[11px] text-muted-foreground">Resets every Monday. Score = (accuracy × 70) + (speed × 30).</p>
          </div>
          {myRow && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">You</p>
              <p className="font-bold text-warning">#{myRow.rank}</p>
            </div>
          )}
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : top.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">No entries yet this week. Be the first!</p>
      ) : (
        <div className="px-5 mt-4 space-y-2">
          {top.map((r) => {
            const isMe = r.user_id === me;
            const medalColor =
              r.rank === 1 ? "text-amber-500" :
              r.rank === 2 ? "text-slate-400" :
              r.rank === 3 ? "text-orange-600" : "text-muted-foreground";
            return (
              <div key={r.user_id} className={`p-3 rounded-2xl flex items-center gap-3 border ${isMe ? "bg-primary-soft border-primary/40" : "bg-card border-border"}`}>
                <div className="w-8 text-center font-bold text-sm flex justify-center">
                  {r.rank <= 3 ? <Medal className={`h-5 w-5 ${medalColor}`} /> : <span className="text-muted-foreground">{r.rank}</span>}
                </div>
                <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {r.avatar_url ? <img src={r.avatar_url} alt={r.display_name} className="h-full w-full object-cover" /> : <span>{initials(r.display_name)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{isMe ? "You" : r.display_name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.sessions} sessions • {r.accuracy}% accuracy</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{r.score}</p>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
