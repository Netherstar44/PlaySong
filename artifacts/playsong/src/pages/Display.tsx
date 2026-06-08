import { useParams } from "wouter";
import { useRoom } from "@/contexts/RoomContext";
import { useEffect } from "react";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { NowPlaying } from "@/components/NowPlaying";

export default function Display() {
  const { roomCode } = useParams();
  const { roomState, joinRoom } = useRoom();

  useEffect(() => {
    if (roomCode) {
      joinRoom(roomCode, "display", "Display", "📺");
    }
  }, [roomCode, joinRoom]);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col p-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <AudioVisualizer />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center z-10 space-y-12">
        <h1 className="text-6xl font-black text-primary neon-text-primary mb-8">Room: {roomCode}</h1>
        <div className="w-full max-w-4xl transform scale-150">
          <NowPlaying song={roomState?.currentSong} />
        </div>
      </div>
      
      <div className="z-10 mt-auto pt-12 flex gap-8 overflow-hidden">
        {roomState?.queue?.slice(0,3).map(song => (
          <div key={song.id} className="flex-1 bg-card/80 border p-6 rounded-2xl backdrop-blur">
            <h3 className="text-xl font-bold truncate">{song.title}</h3>
            <p className="text-muted-foreground">{song.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
}