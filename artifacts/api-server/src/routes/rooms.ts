import { Router, type IRouter } from "express";
import {
  createRoom,
  getRoom,
  getActiveRooms,
  getRoomHistory,
} from "../lib/room-store";
import {
  CreateRoomBody,
  GetRoomParams,
  GetRoomStatsParams,
  GetRoomHistoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const room = createRoom(parsed.data.hostNickname, parsed.data.settings ?? undefined);

  res.status(201).json({
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    hostNickname: room.hostNickname,
    guests: room.guests,
    queue: room.queue,
    currentSong: room.currentSong,
    settings: room.settings,
    createdAt: room.createdAt.toISOString(),
  });
});

router.get("/rooms/active", async (_req, res): Promise<void> => {
  const rooms = getActiveRooms();
  res.json(
    rooms.map((r) => ({
      code: r.code,
      hostNickname: r.hostNickname,
      guestCount: r.guests.length,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.get("/rooms/:code", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const room = getRoom(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json({
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    hostNickname: room.hostNickname,
    guests: room.guests,
    queue: room.queue,
    currentSong: room.currentSong,
    settings: room.settings,
    createdAt: room.createdAt.toISOString(),
  });
});

router.get("/rooms/:code/stats", async (req, res): Promise<void> => {
  const params = GetRoomStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const room = getRoom(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const history = getRoomHistory(params.data.code);
  const topSongs = [...history]
    .sort((a, b) => (b.reactions.fire + b.reactions.heart) - (a.reactions.fire + a.reactions.heart))
    .slice(0, 5);

  const guestStats = new Map<string, { nickname: string; avatar: string; songsAdded: number; totalReactions: number }>();
  for (const song of history) {
    const existing = guestStats.get(song.requestedBy) ?? {
      nickname: song.requestedByNickname,
      avatar: "",
      songsAdded: 0,
      totalReactions: 0,
    };
    existing.songsAdded++;
    existing.totalReactions += song.reactions.fire + song.reactions.heart;
    guestStats.set(song.requestedBy, existing);
  }

  const topRequesters = Array.from(guestStats.values())
    .sort((a, b) => b.totalReactions - a.totalReactions)
    .slice(0, 3);

  res.json({
    totalSongsPlayed: history.length,
    topRequesters,
    topSongs,
    guestCount: room.guests.length,
  });
});

router.get("/rooms/:code/history", async (req, res): Promise<void> => {
  const params = GetRoomHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const history = getRoomHistory(params.data.code);
  res.json(history);
});

export default router;
