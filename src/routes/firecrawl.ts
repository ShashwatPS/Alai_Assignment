import { Router } from "express";
import * as firecrawlController from "../controllers/scrape";

const router = Router();

router.post("/scrape", firecrawlController.crawlWebsite);

export default router;