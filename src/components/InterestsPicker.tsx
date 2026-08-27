import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["General", "Technology", "Education", "Lifestyle", "Other"];

/**
 * Lets a user declare the topics they care about.
 * These feed straight into the ranking function's topic-relevance term.
 */
const InterestsPicker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_interests" as any)
        .select("category")
        .eq("user_id", user.id);
      setSelected(new Set(((data as any[]) || []).map((r) => r.category)));
      setLoading(false);
    })();
  }, [user]);

  const toggle = (cat: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("user_interests" as any).delete().eq("user_id", user.id);
      if (selected.size > 0) {
        await supabase.from("user_interests" as any).insert(
          [...selected].map((category) => ({ user_id: user.id, category, weight: 1 })),
        );
      }
      toast({ title: "Interests saved", description: "Your feed will adapt from the next refresh." });
    } catch {
      toast({ title: "Error", description: "Couldn't save interests.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Your interests</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Topics you pick rank higher in your feed. You'll still see other content for discovery.
      </p>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat}
                variant={selected.has(cat) ? "default" : "outline"}
                className="cursor-pointer select-none px-3 py-1"
                onClick={() => toggle(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save interests"}
          </Button>
        </>
      )}
    </Card>
  );
};

export default InterestsPicker;
