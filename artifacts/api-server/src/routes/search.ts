import { Router, type IRouter } from "express";
import { searchYouTube } from "../lib/youtube";
import { SearchSongsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchSongsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const results = await searchYouTube(parsed.data.q);
  res.json(results);
});

export default router;
