import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";
import { earnedBadges, KarmaStats } from "@/lib/badges";

interface Props {
  stats: KarmaStats;
}

const KarmaBadges = ({ stats }: Props) => {
  const earned = earnedBadges(stats);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{stats.karma} karma</span>
        <span className="text-xs text-muted-foreground">· {earned.length} badges</span>
      </div>
      {earned.length > 0 ? (
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap gap-1.5">
            {earned.map((b) => (
              <Tooltip key={b.key}>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    <span aria-hidden>{b.emoji}</span>
                    <span className="text-[11px]">{b.label}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{b.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <p className="text-xs text-muted-foreground italic">No badges yet — start posting to earn your first!</p>
      )}
    </div>
  );
};

export default KarmaBadges;
