import { Song } from "@workspace/api-client-react";
import { useRoom } from "@/contexts/RoomContext";
import { Button } from "./ui/button";

export function Queue({ queue }: { queue: Song[] }) {
  const { socket, isHost } = useRoom();

  const handleReact = (songId: string, reaction: string) => {
    socket?.emit("song:react", { songId, reaction });
  };

  return (
    <div className="space-y-2">
      {queue.map((song) => (
        <div key={song.id} className="p-3 border rounded-lg flex items-center gap-3 bg-card hover:bg-muted transition-colors">
          <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded object-cover" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{song.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => handleReact(song.id, 'fire')}>🔥 {song.reactions.fire}</Button>
          </div>
          {isHost && song.status === 'pending' && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => socket?.emit("song:approve", { songId: song.id })}>Approve</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}