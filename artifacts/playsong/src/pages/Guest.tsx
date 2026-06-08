import { useParams } from "wouter";
import { useRoom } from "@/contexts/RoomContext";
import { useEffect, useState } from "react";
import { NowPlaying } from "@/components/NowPlaying";
import { Queue } from "@/components/Queue";

export default function Guest() {
  const { roomCode } = useParams();
  const { roomState, joinRoom } = useRoom();
  const [nickname] = useState("Guest"); // would normally come from localstorage/picker

  useEffect(() => {
    if (roomCode) {
      joinRoom(roomCode, "temp-id", nickname, "😊");
    }
  }, [roomCode, joinRoom, nickname]);

  return (
    <div className="min-h-screen w-full p-6 bg-background max-w-md mx-auto">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary neon-text-primary">PlaySong</h1>
        <div className="text-accent font-bold">💰 {roomState?.guests?.find(g => g.nickname === nickname)?.coins || 0}</div>
      </header>

      <div className="space-y-6">
        <NowPlaying song={roomState?.currentSong} />
        
        <div className="bg-card rounded-xl p-4 border">
          <h2 className="font-bold mb-4">Up Next</h2>
          <Queue queue={roomState?.queue || []} />
        </div>
      </div>
    </div>
  );
}