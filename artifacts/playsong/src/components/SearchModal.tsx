import { useState } from "react";
import { useSearchSongs } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useRoom } from "@/contexts/RoomContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function SearchModal({ trigger }: { trigger: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const { data: results } = useSearchSongs(
    { q: debouncedQuery },
    { query: { enabled: debouncedQuery.length > 2, queryKey: ["searchSongs", debouncedQuery] as const } }
  );
  const { socket, roomState } = useRoom();
  const [open, setOpen] = useState(false);
  const [dedication, setDedication] = useState("");

  const handleRequest = (song: any) => {
    if (socket && roomState) {
      socket.emit("song:request", { 
        ...song, 
        dedication: dedication || undefined 
      });
      setOpen(false);
      setQuery("");
      setDedication("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-primary">
        <DialogHeader>
          <DialogTitle className="text-secondary neon-text-secondary">Search Songs</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input 
            placeholder="Search for a song..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-input border-muted h-12 text-lg"
          />
          <Input 
            placeholder="Optional dedication..." 
            value={dedication}
            onChange={(e) => setDedication(e.target.value)}
            className="bg-input border-muted"
          />
          
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
            {results?.map((song) => (
              <div key={song.youtubeId} className="flex items-center gap-4 p-3 bg-background border rounded-lg">
                <img src={song.thumbnail} alt={song.title} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{song.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
                <Button onClick={() => handleRequest(song)} className="bg-primary text-primary-foreground neon-primary">
                  Pedir 🎵
                </Button>
              </div>
            ))}
            {!results?.length && debouncedQuery.length > 2 && (
              <p className="text-center text-muted-foreground py-8">No results found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}