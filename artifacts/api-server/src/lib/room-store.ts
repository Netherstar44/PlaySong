import { nanoid } from "nanoid";

export interface RoomSettings {
  maxSongsPerUser: number;
  requireApproval: boolean;
  skipVotePercent: number;
  explicitFilter: boolean;
  partyCoins: boolean;
}

export interface Guest {
  id: string;
  socketId: string;
  nickname: string;
  avatar: string;
  coins: number;
  songsAdded: number;
  isBlocked: boolean;
}

export interface SongReactions {
  fire: number;
  heart: number;
  skull: number;
}

export type SongStatus = "pending" | "approved" | "playing" | "played" | "rejected";

export interface Song {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  bpm: number | null;
  requestedBy: string;
  requestedByNickname: string;
  dedication: string | null;
  reactions: SongReactions;
  skipVotes: string[];
  status: SongStatus;
  priority: number;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  hostSocketId: string;
  hostNickname: string;
  guests: Guest[];
  queue: Song[];
  history: Song[];
  currentSong: Song | null;
  settings: RoomSettings;
  createdAt: Date;
}

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(hostNickname: string, settings?: Partial<RoomSettings>): Room {
  let code = generateCode();
  while (rooms.has(code)) {
    code = generateCode();
  }

  const room: Room = {
    id: nanoid(),
    code,
    hostId: nanoid(),
    hostSocketId: "",
    hostNickname,
    guests: [],
    queue: [],
    history: [],
    currentSong: null,
    settings: {
      maxSongsPerUser: settings?.maxSongsPerUser ?? 3,
      requireApproval: settings?.requireApproval ?? false,
      skipVotePercent: settings?.skipVotePercent ?? 60,
      explicitFilter: settings?.explicitFilter ?? false,
      partyCoins: settings?.partyCoins ?? true,
    },
    createdAt: new Date(),
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function getActiveRooms(): Room[] {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return Array.from(rooms.values()).filter(
    (r) => r.createdAt > thirtyMinutesAgo
  );
}

export function addGuest(code: string, guest: Guest): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const existing = room.guests.findIndex((g) => g.id === guest.id);
  if (existing >= 0) {
    room.guests[existing] = { ...room.guests[existing], socketId: guest.socketId };
  } else {
    room.guests.push(guest);
  }
  return room;
}

export function removeGuest(code: string, guestId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.guests = room.guests.filter((g) => g.id !== guestId);
  return room;
}

export function addSong(code: string, song: Song): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.queue.push(song);
  return room;
}

export function approveSong(code: string, songId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const song = room.queue.find((s) => s.id === songId);
  if (song) song.status = "approved";
  return room;
}

export function rejectSong(code: string, songId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const song = room.queue.find((s) => s.id === songId);
  if (song) song.status = "rejected";
  return room;
}

export function reactToSong(
  code: string,
  songId: string,
  reaction: "fire" | "heart" | "skull"
): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const song = room.queue.find((s) => s.id === songId) ?? (room.currentSong?.id === songId ? room.currentSong : null);
  if (song) song.reactions[reaction]++;
  return room;
}

export function voteSkip(code: string, songId: string, guestId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const song = room.currentSong?.id === songId ? room.currentSong : room.queue.find((s) => s.id === songId);
  if (song && !song.skipVotes.includes(guestId)) {
    song.skipVotes.push(guestId);
  }
  return room;
}

export function reorderQueue(code: string, newQueue: Song[]): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.queue = newQueue;
  return room;
}

export function playNextSong(code: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.currentSong) {
    room.currentSong.status = "played";
    room.history.push(room.currentSong);
  }
  const next = room.queue.find((s) => s.status === "approved" || (!room.settings.requireApproval && s.status === "pending"));
  if (next) {
    next.status = "playing";
    room.currentSong = next;
    room.queue = room.queue.filter((s) => s.id !== next.id);
  } else {
    room.currentSong = null;
  }
  return room;
}

export function awardCoins(code: string, guestId: string, amount: number): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const guest = room.guests.find((g) => g.id === guestId);
  if (guest) guest.coins = Math.max(0, guest.coins + amount);
  return room;
}

export function boostSong(code: string, songId: string, guestId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const guest = room.guests.find((g) => g.id === guestId);
  if (!guest || guest.coins < 5) return null;
  const song = room.queue.find((s) => s.id === songId);
  if (!song) return null;
  guest.coins -= 5;
  song.priority += 1;
  room.queue.sort((a, b) => b.priority - a.priority);
  return room;
}

export function blockGuest(code: string, guestId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const guest = room.guests.find((g) => g.id === guestId);
  if (guest) guest.isBlocked = true;
  return room;
}

export function kickGuest(code: string, guestId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.guests = room.guests.filter((g) => g.id !== guestId);
  return room;
}

export function closeRoom(code: string): void {
  rooms.delete(code);
}

export function getRoomHistory(code: string): Song[] {
  return rooms.get(code)?.history ?? [];
}
