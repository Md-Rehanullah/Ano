import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface Props {
  postId: string;
}

const PollBlock = ({ postId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pollId, setPollId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOption[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [postId, user?.id]);

  const load = async () => {
    setLoading(true);
    const { data: poll } = await supabase
      .from("polls" as any)
      .select("id, question")
      .eq("post_id", postId)
      .maybeSingle();
    if (!poll) { setLoading(false); return; }
    setPollId((poll as any).id);
    setQuestion((poll as any).question);

    const { data: opts } = await supabase
      .from("poll_options" as any)
      .select("id, label")
      .eq("poll_id", (poll as any).id)
      .order("position", { ascending: true });

    const { data: votes } = await supabase
      .from("poll_votes" as any)
      .select("option_id, user_id")
      .eq("poll_id", (poll as any).id);

    const tally: Record<string, number> = {};
    (votes || []).forEach((v: any) => { tally[v.option_id] = (tally[v.option_id] || 0) + 1; });

    setOptions((opts || []).map((o: any) => ({ id: o.id, label: o.label, votes: tally[o.id] || 0 })));
    if (user) {
      const mine = (votes || []).find((v: any) => v.user_id === user.id);
      setMyVote(mine ? (mine as any).option_id : null);
    }
    setLoading(false);
  };

  const vote = async (optionId: string) => {
    if (!user) { toast({ title: "Sign in to vote", variant: "destructive" }); return; }
    if (!pollId || voting) return;
    setVoting(true);
    try {
      // Upsert: one vote per (poll, user)
      const { error } = await supabase
        .from("poll_votes" as any)
        .upsert(
          { poll_id: pollId, option_id: optionId, user_id: user.id },
          { onConflict: "poll_id,user_id" }
        );
      if (error) throw error;
      await load();
    } catch {
      toast({ title: "Failed to record vote", variant: "destructive" });
    } finally {
      setVoting(false);
    }
  };

  if (loading || !pollId) return null;

  const total = options.reduce((s, o) => s + o.votes, 0);

  return (
    <Card className="p-3 sm:p-4 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{question}</p>
      </div>
      <div className="space-y-2">
        {options.map((o) => {
          const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
          const selected = myVote === o.id;
          return (
            <div key={o.id} className="space-y-1">
              <Button
                type="button"
                variant={selected ? "default" : "outline"}
                size="sm"
                disabled={voting}
                onClick={() => vote(o.id)}
                className="w-full justify-between h-auto py-2"
              >
                <span className="text-left truncate">{o.label}</span>
                <span className="text-xs ml-2 shrink-0">
                  {voting ? <Loader2 className="h-3 w-3 animate-spin" /> : `${pct}% · ${o.votes}`}
                </span>
              </Button>
              {myVote && <Progress value={pct} className="h-1" />}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {total} {total === 1 ? "vote" : "votes"}
        {myVote && " · you can change your vote"}
      </p>
    </Card>
  );
};

export default PollBlock;
