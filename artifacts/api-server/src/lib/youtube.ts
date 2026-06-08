import { logger } from "./logger";

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

interface YouTubeVideoItem {
  id: string;
  contentDetails?: { duration?: string };
}

interface YouTubeVideoResponse {
  items?: YouTubeVideoItem[];
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

export interface VideoSearchResult {
  youtubeId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  bpm: number | null;
}

export async function searchYouTube(query: string): Promise<VideoSearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    logger.warn("YOUTUBE_API_KEY not set");
    return [];
  }

  try {
    const q = encodeURIComponent(query);
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&videoCategoryId=10&maxResults=10&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      logger.warn({ status: searchRes.status }, "YouTube search failed");
      return [];
    }
    const searchData = (await searchRes.json()) as YouTubeSearchResponse;
    const items = searchData.items ?? [];
    if (items.length === 0) return [];

    const ids = items.map((i) => i.id.videoId).join(",");
    const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`;
    const detailRes = await fetch(detailUrl);
    const detailData = detailRes.ok
      ? ((await detailRes.json()) as YouTubeVideoResponse)
      : { items: [] };

    const durationMap = new Map<string, number>();
    for (const v of detailData.items ?? []) {
      if (v.contentDetails?.duration) {
        durationMap.set(v.id, parseDuration(v.contentDetails.duration));
      }
    }

    return items.map((item) => ({
      youtubeId: item.id.videoId,
      title: item.snippet.title
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'"),
      artist: item.snippet.channelTitle,
      duration: durationMap.get(item.id.videoId) ?? 0,
      thumbnail:
        item.snippet.thumbnails.medium?.url ??
        item.snippet.thumbnails.default?.url ??
        "",
      bpm: null,
    }));
  } catch (err) {
    logger.error({ err }, "YouTube search error");
    return [];
  }
}
