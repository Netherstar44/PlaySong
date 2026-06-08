/**
 * Vercel Serverless Function — PlaySong REST API
 *
 * NOTE: Socket.io real-time features (room sync, live queue, reactions)
 * require a persistent server and will NOT work in this serverless adapter.
 * For full real-time functionality, deploy the API server separately on
 * Railway, Render, or Fly.io and point VITE_API_URL at that URL.
 *
 * The REST endpoints below (/rooms, /search, /healthz) work fully on Vercel.
 */

import express, { type Express } from "express";
import cors from "cors";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { nanoid } from "nanoid";

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── In-memory room store (resets per cold-start) ──────────────────────────

interface RoomSettings {
  maxSongsPerUser: number;
  requireApproval: boolean;
  skipVotePercent: number;
  explicitFilter: boolean;
  partyCoins: boolean;
}

interface Guest {
  id: string;
  nickname: string;
  avatar: string;
  coins: number;
  songsAdded: number;
  isBlocked: boolean;
}

interface Song {
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
  reactions: { fire: number; heart: number; skull: number };
  skipVotes: string[];
  status: "pending" | "approved" | "playing" | "played" | "rejected";
  priority: number;
}

interface Room {
  id: string;
  code: string;
  hostId: string;
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
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── Healthz ───────────────────────────────────────────────────────────────

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── Rooms ─────────────────────────────────────────────────────────────────

app.post("/api/rooms", (req, res) => {
  const { hostNickname, settings } = req.body ?? {};
  if (!hostNickname) { res.status(400).json({ error: "hostNickname required" }); return; }

  let code = generateCode();
  while (rooms.has(code)) code = generateCode();

  const room: Room = {
    id: nanoid(),
    code,
    hostId: nanoid(),
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
  res.status(201).json({ ...room, createdAt: room.createdAt.toISOString() });
});

app.get("/api/rooms/active", (_req, res) => {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const active = Array.from(rooms.values())
    .filter((r) => r.createdAt > cutoff)
    .map((r) => ({ code: r.code, hostNickname: r.hostNickname, guestCount: r.guests.length, createdAt: r.createdAt.toISOString() }));
  res.json(active);
});

app.get("/api/rooms/:code", (req, res) => {
  const room = rooms.get((req.params.code as string).toUpperCase());
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  res.json({ ...room, createdAt: room.createdAt.toISOString() });
});

app.get("/api/rooms/:code/stats", (req, res) => {
  const room = rooms.get((req.params.code as string).toUpperCase());
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  const topSongs = [...room.history]
    .sort((a, b) => (b.reactions.fire + b.reactions.heart) - (a.reactions.fire + a.reactions.heart))
    .slice(0, 5);
  res.json({ totalSongsPlayed: room.history.length, topRequesters: [], topSongs, guestCount: room.guests.length });
});

app.get("/api/rooms/:code/history", (req, res) => {
  const room = rooms.get((req.params.code as string).toUpperCase());
  res.json(room?.history ?? []);
});

// ─── YouTube Search ────────────────────────────────────────────────────────

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? "0")) * 3600 + (parseInt(m[2] ?? "0")) * 60 + (parseInt(m[3] ?? "0"));
}

app.get("/api/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q) { res.status(400).json({ error: "q required" }); return; }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "YOUTUBE_API_KEY not configured" }); return; }

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoCategoryId=10&maxResults=10&key=${apiKey}`
    );
    if (!searchRes.ok) { res.status(502).json({ error: "YouTube search failed" }); return; }
    const data = await searchRes.json() as { items?: Array<{ id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string } } } }> };
    const items = data.items ?? [];

    if (items.length === 0) { res.json([]); return; }

    const ids = items.map((i) => i.id.videoId).join(",");
    const detailRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`);
    const details = detailRes.ok ? await detailRes.json() as { items?: Array<{ id: string; contentDetails?: { duration?: string } }> } : { items: [] };
    const durMap = new Map((details.items ?? []).map((v) => [v.id, parseDuration(v.contentDetails?.duration ?? "")]));

    res.json(items.map((item) => ({
      youtubeId: item.id.videoId,
      title: item.snippet.title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
      artist: item.snippet.channelTitle,
      duration: durMap.get(item.id.videoId) ?? 0,
      thumbnail: item.snippet.thumbnails.medium?.url ?? "",
      bpm: null,
    })));
  } catch {
    res.status(500).json({ error: "Search failed" });
  }
});

// ─── Vercel handler ────────────────────────────────────────────────────────

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as never, res as never);
}
