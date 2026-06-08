import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useRoom } from "@/contexts/RoomContext";

export function SkipVoteBar({ songId, skipVotes = [], guestCount = 1, threshold = 50 }: { songId: string, skipVotes?: string[], guestCount?: number, threshold?: number }) {
  const { socket, currentUser } = useRoom();
  const votes = skipVotes.length;
  const percentage = guestCount > 0 ? Math.min(100, Math.round((votes / guestCount) * 100)) : 0;
  
  const guestId = currentUser && 'id' in currentUser ? currentUser.id : null;
  const hasVoted = guestId ? skipVotes.includes(guestId) : false;

  const handleSkipVote = () => {
    socket?.emit("song:skip-vote", { songId });
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Skip votes: {votes}</span>
        <span className="text-destructive font-bold">{percentage}% / {threshold}%</span>
      </div>
      <div className="relative">
        <Progress value={percentage} className="h-3" />
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10" 
          style={{ left: `${threshold}%` }}
        />
      </div>
      {!hasVoted && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSkipVote}
        >
          Vote to Skip
        </Button>
      )}
    </div>
  );
}