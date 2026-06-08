import { useEffect, useRef } from "react";
import { useRoom } from "@/contexts/RoomContext";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export function YouTubePlayer() {
  const { roomState, socket, isHost } = useRoom();
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHost) return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: "360",
          width: "640",
          playerVars: {
            autoplay: 1,
            controls: 1,
          },
          events: {
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                socket?.emit("player:skip");
              }
            }
          }
        });
      };
    } else if (containerRef.current && !playerRef.current) {
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "360",
        width: "640",
        playerVars: { autoplay: 1, controls: 1 },
        events: {
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              socket?.emit("player:skip");
            }
          }
        }
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isHost, socket]);

  useEffect(() => {
    if (isHost && playerRef.current && playerRef.current.loadVideoById && roomState?.currentSong?.youtubeId) {
      playerRef.current.loadVideoById(roomState.currentSong.youtubeId);
    }
  }, [roomState?.currentSong?.youtubeId, isHost]);

  if (!isHost) return null;

  return (
    <div className="hidden" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  );
}