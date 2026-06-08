import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { Room, Guest, Song } from "@workspace/api-client-react";

interface RoomContextType {
  socket: Socket | null;
  roomState: Room | null;
  currentUser: Guest | { hostId: string } | null;
  isHost: boolean;
  joinRoom: (code: string, guestId: string, nickname: string, avatar: string) => void;
  leaveRoom: () => void;
  toastMsg: string | null;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<Guest | { hostId: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const s = io(window.location.origin, { path: "/api/socket.io" });
    setSocket(s);

    s.on("room:state", (state: Room) => {
      setRoomState(state);
    });

    s.on("toast", (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3000);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const joinRoom = (code: string, guestId: string, nickname: string, avatar: string) => {
    if (socket) {
      socket.emit("room:join", { roomCode: code, guestId, nickname, avatar });
    }
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit("room:leave");
      setRoomState(null);
    }
  };

  const isHost = Boolean(roomState && currentUser && 'hostId' in currentUser && roomState.hostId === currentUser.hostId);

  return (
    <RoomContext.Provider value={{ socket, roomState, currentUser, isHost, joinRoom, leaveRoom, toastMsg }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
}
