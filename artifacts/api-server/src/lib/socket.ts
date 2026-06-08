import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./logger";
import {
  getRoom,
  addGuest,
  removeGuest,
  addSong,
  approveSong,
  rejectSong,
  reactToSong,
  voteSkip,
  reorderQueue,
  playNextSong,
  awardCoins,
  boostSong,
  blockGuest,
  kickGuest,
  closeRoom,
  type Song,
  type Guest,
} from "./room-store";
import { nanoid } from "nanoid";
import { getTrackBpm } from "./spotify";

let io: SocketIOServer | null = null;

const socketRoomMap = new Map<string, { roomCode: string; guestId: string }>();

export function setupSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on(
      "room:join",
      (data: { roomCode: string; guestId: string; nickname: string; avatar: string }) => {
        const room = getRoom(data.roomCode);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const guest: Guest = {
          id: data.guestId,
          socketId: socket.id,
          nickname: data.nickname,
          avatar: data.avatar,
          coins: 10,
          songsAdded: 0,
          isBlocked: false,
        };

        socketRoomMap.set(socket.id, { roomCode: data.roomCode, guestId: data.guestId });
        socket.join(data.roomCode);
        addGuest(data.roomCode, guest);

        const updatedRoom = getRoom(data.roomCode);
        io?.to(data.roomCode).emit("room:state", updatedRoom);
        logger.info({ roomCode: data.roomCode, nickname: data.nickname }, "Guest joined room");
      }
    );

    socket.on("room:host", (data: { roomCode: string; hostId: string }) => {
      const room = getRoom(data.roomCode);
      if (!room || room.hostId !== data.hostId) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }
      room.hostSocketId = socket.id;
      socketRoomMap.set(socket.id, { roomCode: data.roomCode, guestId: "host" });
      socket.join(data.roomCode);
      socket.emit("room:state", room);
      logger.info({ roomCode: data.roomCode }, "Host connected to room");
    });

    socket.on("room:leave", () => {
      handleLeave(socket.id);
    });

    socket.on(
      "song:request",
      async (data: {
        roomCode: string;
        youtubeId: string;
        title: string;
        artist: string;
        duration: number;
        thumbnail: string;
        requestedBy: string;
        requestedByNickname: string;
        dedication?: string;
      }) => {
        const room = getRoom(data.roomCode);
        if (!room) return;

        const guest = room.guests.find((g) => g.id === data.requestedBy);
        if (guest?.isBlocked) {
          socket.emit("error", { message: "You are blocked" });
          return;
        }

        const userSongs = room.queue.filter(
          (s) => s.requestedBy === data.requestedBy && s.status !== "rejected"
        ).length;
        if (userSongs >= room.settings.maxSongsPerUser) {
          socket.emit("error", { message: `Max ${room.settings.maxSongsPerUser} songs per person` });
          return;
        }

        const bpm = await getTrackBpm(data.title, data.artist).catch(() => null);

        const song: Song = {
          id: nanoid(),
          youtubeId: data.youtubeId,
          title: data.title,
          artist: data.artist,
          duration: data.duration,
          thumbnail: data.thumbnail,
          bpm: bpm ?? null,
          requestedBy: data.requestedBy,
          requestedByNickname: data.requestedByNickname,
          dedication: data.dedication ?? null,
          reactions: { fire: 0, heart: 0, skull: 0 },
          skipVotes: [],
          status: room.settings.requireApproval ? "pending" : "approved",
          priority: 0,
        };

        if (guest) guest.songsAdded++;
        addSong(data.roomCode, song);

        const updatedRoom = getRoom(data.roomCode);
        io?.to(data.roomCode).emit("room:state", updatedRoom);

        if (!room.currentSong) {
          const next = playNextSong(data.roomCode);
          if (next?.currentSong) {
            io?.to(data.roomCode).emit("player:sync", {
              youtubeId: next.currentSong.youtubeId,
              isPlaying: true,
              position: 0,
            });
            io?.to(data.roomCode).emit("room:state", next);
          }
        }

        if (data.requestedBy !== "host") {
          io?.to(data.roomCode).emit("toast", {
            message: `"${data.title}" added to the queue`,
            guestId: data.requestedBy,
          });
        }
      }
    );

    socket.on("song:approve", (data: { roomCode: string; songId: string }) => {
      approveSong(data.roomCode, data.songId);
      const room = getRoom(data.roomCode);
      io?.to(data.roomCode).emit("room:state", room);

      if (!room?.currentSong) {
        const next = playNextSong(data.roomCode);
        if (next?.currentSong) {
          io?.to(data.roomCode).emit("player:sync", {
            youtubeId: next.currentSong.youtubeId,
            isPlaying: true,
            position: 0,
          });
          io?.to(data.roomCode).emit("room:state", next);
        }
      }
    });

    socket.on("song:reject", (data: { roomCode: string; songId: string }) => {
      rejectSong(data.roomCode, data.songId);
      const room = getRoom(data.roomCode);
      io?.to(data.roomCode).emit("room:state", room);
    });

    socket.on(
      "song:react",
      (data: { roomCode: string; songId: string; reaction: "fire" | "heart" | "skull" }) => {
        reactToSong(data.roomCode, data.songId, data.reaction);
        const room = getRoom(data.roomCode);
        io?.to(data.roomCode).emit("room:state", room);
      }
    );

    socket.on("song:skip-vote", (data: { roomCode: string; songId: string; guestId: string }) => {
      const room = voteSkip(data.roomCode, data.songId, data.guestId);
      if (!room) return;

      const totalVoters = room.guests.length;
      const song = room.currentSong?.id === data.songId ? room.currentSong : null;
      if (song && totalVoters > 0) {
        const votePercent = (song.skipVotes.length / totalVoters) * 100;
        if (votePercent >= room.settings.skipVotePercent) {
          const next = playNextSong(data.roomCode);
          io?.to(data.roomCode).emit("player:sync", {
            youtubeId: next?.currentSong?.youtubeId ?? null,
            isPlaying: !!next?.currentSong,
            position: 0,
          });
          io?.to(data.roomCode).emit("room:state", next);
          io?.to(data.roomCode).emit("toast", { message: "Song skipped by vote!" });
          return;
        }
      }
      io?.to(data.roomCode).emit("room:state", room);
    });

    socket.on("queue:reorder", (data: { roomCode: string; queue: Song[] }) => {
      const room = reorderQueue(data.roomCode, data.queue);
      io?.to(data.roomCode).emit("room:state", room);
    });

    socket.on("player:play", (data: { roomCode: string }) => {
      io?.to(data.roomCode).emit("player:sync", { isPlaying: true });
    });

    socket.on("player:pause", (data: { roomCode: string }) => {
      io?.to(data.roomCode).emit("player:sync", { isPlaying: false });
    });

    socket.on("player:skip", (data: { roomCode: string }) => {
      const room = playNextSong(data.roomCode);
      io?.to(data.roomCode).emit("player:sync", {
        youtubeId: room?.currentSong?.youtubeId ?? null,
        isPlaying: !!room?.currentSong,
        position: 0,
      });
      io?.to(data.roomCode).emit("room:state", room);
    });

    socket.on("player:ended", (data: { roomCode: string }) => {
      const room = playNextSong(data.roomCode);
      io?.to(data.roomCode).emit("player:sync", {
        youtubeId: room?.currentSong?.youtubeId ?? null,
        isPlaying: !!room?.currentSong,
        position: 0,
      });
      io?.to(data.roomCode).emit("room:state", room);
    });

    socket.on(
      "coins:award",
      (data: { roomCode: string; guestId: string; amount: number }) => {
        const room = awardCoins(data.roomCode, data.guestId, data.amount);
        io?.to(data.roomCode).emit("room:state", room);
        const guest = room?.guests.find((g) => g.id === data.guestId);
        if (guest) {
          io?.to(data.roomCode).emit("toast", {
            message: `${guest.nickname} received ${data.amount} party coins!`,
            guestId: data.guestId,
          });
        }
      }
    );

    socket.on(
      "coins:boost",
      (data: { roomCode: string; songId: string; guestId: string }) => {
        const room = boostSong(data.roomCode, data.songId, data.guestId);
        if (!room) {
          socket.emit("error", { message: "Not enough coins or song not found" });
          return;
        }
        io?.to(data.roomCode).emit("room:state", room);
        io?.to(data.roomCode).emit("toast", { message: "Song boosted up the queue!" });
      }
    );

    socket.on("guest:block", (data: { roomCode: string; guestId: string }) => {
      blockGuest(data.roomCode, data.guestId);
      const room = getRoom(data.roomCode);
      const guest = room?.guests.find((g) => g.id === data.guestId);
      io?.to(data.roomCode).emit("room:state", room);
      if (guest) {
        io?.to(guest.socketId).emit("kicked", { reason: "blocked" });
      }
    });

    socket.on("guest:kick", (data: { roomCode: string; guestId: string }) => {
      const room = getRoom(data.roomCode);
      const guest = room?.guests.find((g) => g.id === data.guestId);
      if (guest) {
        io?.to(guest.socketId).emit("kicked", { reason: "kicked" });
      }
      kickGuest(data.roomCode, data.guestId);
      const updatedRoom = getRoom(data.roomCode);
      io?.to(data.roomCode).emit("room:state", updatedRoom);
    });

    socket.on("room:close", (data: { roomCode: string }) => {
      io?.to(data.roomCode).emit("room:closed");
      closeRoom(data.roomCode);
    });

    socket.on("disconnect", () => {
      handleLeave(socket.id);
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

function handleLeave(socketId: string) {
  const info = socketRoomMap.get(socketId);
  if (!info) return;
  socketRoomMap.delete(socketId);

  if (info.guestId === "host") return;

  removeGuest(info.roomCode, info.guestId);
  const room = getRoom(info.roomCode);
  io?.to(info.roomCode).emit("room:state", room);
}

export function getIO(): SocketIOServer | null {
  return io;
}
