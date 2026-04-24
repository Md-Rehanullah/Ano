import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Trophy, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

interface Row {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  posts_this_week: number;
  likes_this_week: number;
  week_score: number;
}

const WeeklyLeaderboard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("weekly_leaderboard" as any)
        .select("*")
        .limit(5);
      if (data) setRows(data as any);
      setLoading(false);
    })();
  }, []);

  if (loading || rows.length === 0) return null;

  return (
    <Card className="p-4 mb-6 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Top Contributors This Week</h3>
      </div>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.user_id}>
            <Link
              to={`/u/${r.user_id}`}
              className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <span
                className={cn(
                  "flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold shrink-0",
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {i === 0 ? <Crown className="h-3 w-3" /> : i + 1}
              </span>
              <UserAvatar src={r.avatar_url} name={r.display_name} className="h-7 w-7" fallbackClassName="text-[10px]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.display_name || "Anonymous"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.posts_this_week} posts · {r.likes_this_week} likes
                </p>
              </div>
              <span className="text-xs font-semibold text-primary">{r.week_score}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
};

export default WeeklyLeaderboard;
