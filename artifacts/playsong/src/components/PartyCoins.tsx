import { useRoom } from "@/contexts/RoomContext";
import { Button } from "@/components/ui/button";

export function PartyCoins({ coins }: { coins: number }) {
  const { socket, roomState } = useRoom();

  const handleBoost = () => {
    const currentSong = roomState?.queue?.[0];
    if (currentSong && coins >= 10) {
      socket?.emit("coins:boost", { songId: currentSong.id });
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-card border rounded-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
      <h3 className="text-sm text-muted-foreground uppercase font-bold mb-1">Party Coins</h3>
      <div className="text-3xl font-black text-accent drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] mb-3">
        {coins} 🪙
      </div>
      <Button 
        size="sm" 
        onClick={handleBoost} 
        disabled={coins < 10 || !roomState?.queue?.length}
        className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
      >
        Boost Next Song 🚀 (-10)
      </Button>
    </div>
  );
}