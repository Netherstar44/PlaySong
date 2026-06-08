import { logger } from "./logger";

let spotifyToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (spotifyToken && Date.now() < tokenExpiry) {
    return spotifyToken;
  }

  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in: number };
    spotifyToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return spotifyToken;
  } catch (err) {
    logger.warn({ err }, "Failed to get Spotify token");
    return null;
  }
}

export async function getTrackBpm(title: string, artist: string): Promise<number | null> {
  const token = await getSpotifyToken();
  if (!token) return null;

  try {
    const q = encodeURIComponent(`track:${title} artist:${artist}`);
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as {
      tracks?: { items?: Array<{ id: string }> };
    };
    const trackId = searchData.tracks?.items?.[0]?.id;
    if (!trackId) return null;

    const featRes = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!featRes.ok) return null;
    const featData = (await featRes.json()) as { tempo?: number };
    return featData.tempo ? Math.round(featData.tempo) : null;
  } catch (err) {
    logger.warn({ err }, "Failed to get BPM from Spotify");
    return null;
  }
}
