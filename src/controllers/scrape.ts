import FirecrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import { Request, Response } from "express";
import dotenv from 'dotenv';
import { slidesOutline } from "../helpers/getalai";

dotenv.config();

const app = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

const schema = z.object({
  company_mission: z.string(),
  images: z.array(z.string()),
  websiteContent: z.string(),
});

export const crawlWebsite = async (req: Request, res: Response): Promise<any> => {
    const { url } = req.body

    console.log("URL:", url);
    console.log("API Key:", process.env.FIRECRAWL_API_KEY);

    if (!url) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    const scrapeResult = await app.scrapeUrl(url, {
        formats: ["json"],
        jsonOptions: { schema: schema }
      });
      
      if (!scrapeResult.success) {
        res.status(500).json({ error: scrapeResult.error });
        return;
      }
      
      if(!scrapeResult.json?.websiteContent || scrapeResult.json?.websiteContent === "") {
        res.status(500).json({ error: "No website content found or company mission is missing" });
        return;
      }

      await slidesOutline({
        websiteContent: scrapeResult.json.websiteContent,
        company_mission: scrapeResult.json.company_mission
      });

      res.status(200).json(scrapeResult.json?.websiteContent);
      // console.log(scrapeResult.extract);
};