import FirecrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import { Request, Response } from "express";
import dotenv from 'dotenv';
import { slidesOutline } from "../helpers/getalai";

dotenv.config();

const app = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

const imageUrlSchema = z
  .string()
  .url()
  .refine(url => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url), {
    message: "URL must link to an image",
  });

const imageArrayOrNull = z
  .array(imageUrlSchema)
  .transform(arr => (arr.length === 0 ? null : arr))
  .nullable();

const schema = z.object({
  company_mission: z.string(),
  websiteContent: z.string(),
  imageUrls: z.object({
    introduction: imageArrayOrNull,
    features: imageArrayOrNull,
    how_it_works: imageArrayOrNull,
    target_audience: imageArrayOrNull,
    vision: imageArrayOrNull,
  }).nullable(),
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

      const presentation = await slidesOutline(
        scrapeResult.json.websiteContent,
        scrapeResult.json.company_mission,
        scrapeResult.json.imageUrls
      );

      if(!presentation) {
        res.status(500).json({ error: "Failed to create presentation" });
        return;
      }

      const presentationURL = "https://app.getalai.com/presentation/"+ presentation;

      res.status(200).json(scrapeResult);
};