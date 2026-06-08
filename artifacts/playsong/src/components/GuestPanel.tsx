import { useState } from "react";
import { Guest } from "@workspace/api-client-react";
import { useRoom } from "@/contexts/RoomContext";
import { Button } from "@/components/ui/button";

export function GuestPanel({ guests }: { guests: Guest[] }) {
  const { socket, isHost } = useRoom();

  const awardCoins = (guestId: string) => {
    socket?.emit("coins:award", { guestId, amount: 5 });
  };

  const kickGuest = (guestId: string) => {
    socket?.emit("guest:kick", { guestId });
  };

  const blockGuest = (guestId: string) => {
    socket?.emit("guest:block", { guestId });
  };

  return (
    <div className="space-y-3">
      {guests.map(guest => (
        <div key={guest.id} className="p-3 bg-card border rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{guest.avatar}</span>
            <div>
              <p className="font-bold">{guest.nickname}</p>
              <p className="text-xs text-muted-foreground">{guest.coins} coins • {guest.songsAdded} songs</p>
            </div>
          </div>
          {isHost && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-accent text-accent" onClick={() => awardCoins(guest.id)}>+5 🪙</Button>
              <Button size="sm" variant="destructive" onClick={() => kickGuest(guest.id)}>Kick</Button>
              <Button size="sm" variant="destructive" onClick={() => blockGuest(guest.id)}>Block</Button>
            </div>
          )}
        </div>
      ))}
      {guests.length === 0 && <p className="text-muted-foreground text-sm">No guests yet.</p>}
    </div>
  );
}