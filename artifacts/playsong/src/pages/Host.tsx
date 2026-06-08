import { useRoom } from "@/contexts/RoomContext";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { NowPlaying } from "@/components/NowPlaying";
import { Queue } from "@/components/Queue";

export default function Host() {
  const { roomState } = useRoom();

  return (
    <div className="min-h-screen w-full p-6 bg-background text-foreground">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-secondary neon-text-secondary">DJ Panel</h1>
          <div className="text-2xl font-mono tracking-widest bg-card px-4 py-2 rounded-lg border neon-primary">
            {roomState?.code || "------"}
          </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <AudioVisualizer />
            <NowPlaying song={roomState?.currentSong} />
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Queue</h2>
              <Queue queue={roomState?.queue || []} />
            </div>
          </div>
          
          <div className="space-y-8">
            {/* Guest list, settings, etc */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Guests ({roomState?.guests?.length || 0})</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}