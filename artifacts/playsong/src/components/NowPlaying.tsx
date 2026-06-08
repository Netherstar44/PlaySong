import { Song } from "@workspace/api-client-react";

export function NowPlaying({ song }: { song?: Song | null }) {
  if (!song) return <div className="p-4 border rounded-xl bg-card text-center">Nothing playing</div>;

  return (
    <div className="p-6 border rounded-xl bg-card flex items-center gap-4 relative overflow-hidden">
      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary relative vinyl-spin">
        <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20 rounded-full border-4 border-black m-8" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-2xl font-bold truncate text-primary neon-text-primary">{song.title}</h3>
        <p className="text-muted-foreground truncate">{song.artist}</p>
        <p className="text-sm mt-2">Requested by: {song.requestedByNickname}</p>
        {song.dedication && <p className="text-sm italic text-secondary">"{song.dedication}"</p>}
      </div>
    </div>
  );
}