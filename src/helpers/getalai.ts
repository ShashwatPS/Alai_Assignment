import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";
import { getCreatedAt, Instructions } from "./constants";
import { Slide, ScrapedImageGroups, SlideImage } from "../interfaces/Slide";

dotenv.config();

let cachedToken: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
} | null = null;

const TEN_MINUTES_IN_SECONDS = 10 * 60;

export const getAccessToken = async (): Promise<string | null> => {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expires_at - now > TEN_MINUTES_IN_SECONDS) {
    return cachedToken.access_token;
  }

  if (cachedToken) {
    const refreshed = await getAccessTokenFromRefreshToken(
      cachedToken.refresh_token
    );
    if (refreshed) {
      const expiresAt = now + refreshed.expires_in;
      cachedToken = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: expiresAt,
      };
      return cachedToken.access_token;
    }
  }

  const freshToken = await getAccessTokenWithPassword();
  if (
    freshToken?.access_token &&
    freshToken?.refresh_token &&
    freshToken?.expires_at
  ) {
    cachedToken = freshToken;
    return cachedToken.access_token;
  }

  return null;
};

const getAccessTokenWithPassword = async (): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
} | null> => {
  const headers = new Headers({
    accept: "*/*",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    apikey: process.env.ALAI_API_KEY!,
    "content-type": "application/json;charset=UTF-8",
    origin: "https://app.getalai.com",
    priority: "u=1, i",
    "sec-ch-ua":
      '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "x-client-info": "supabase-js-web/2.45.4",
    "x-supabase-api-version": "2024-01-01",
  });

  const body = JSON.stringify({
    email: process.env.ALAI_EMAIL,
    password: process.env.ALAI_PASSWORD,
    gotrue_meta_security: {},
  });

  try {
    const res = await fetch(
      "https://api.getalai.com/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers,
        body,
      }
    );
    const data = await res.json();
    if (data?.access_token && data?.refresh_token && data?.expires_at) {
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      };
    }
  } catch (err) {
    console.error("Failed to get access token via password:", err);
  }
  return null;
};

const getAccessTokenFromRefreshToken = async (
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> => {
  const headers = new Headers({
    accept: "*/*",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    apikey: process.env.ALAI_API_KEY!,
    authorization: `Bearer ${process.env.ALAI_API_KEY!}`,
    "content-type": "application/json;charset=UTF-8",
    origin: "https://app.getalai.com",
    priority: "u=1, i",
    "sec-ch-ua":
      '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "x-client-info": "supabase-js-web/2.45.4",
    "x-supabase-api-version": "2024-01-01",
  });

  const body = JSON.stringify({ refresh_token: refreshToken });

  try {
    const res = await fetch(
      "https://api.getalai.com/auth/v1/token?grant_type=refresh_token",
      {
        method: "POST",
        headers,
        body,
      }
    );
    const data = await res.json();
    if (data?.access_token && data?.refresh_token) {
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      };
    }
  } catch (err) {
    console.error("Error refreshing token:", err);
  }
  return null;
};

const createPresentation = async (): Promise<{
  id: string;
  slideId: string;
} | null> => {
  const token = await getAccessToken();

  const presentation_id = uuidv4();

  if (!token) {
    console.error("No access token found");
    return null;
  }

  const headers = new Headers({
    Accept: "*/*",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Origin: "https://app.getalai.com",
    "User-Agent": "Mozilla/5.0",
    "sec-ch-ua":
      '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
  });

  const body = JSON.stringify({
    presentation_id,
    presentation_title: "Untitled Presentation",
    create_first_slide: true,
    theme_id: "a6bff6e5-3afc-4336-830b-fbc710081012",
    default_color_set_id: 0,
  });

  const requestOptions = {
    method: "POST",
    headers,
    body,
    redirect: "follow" as RequestRedirect,
  };

  try {
    const response = await fetch(
      "https://alai-standalone-backend.getalai.com/create-new-presentation",
      requestOptions
    );

    if (!response.ok) {
      console.error(
        `Failed to create presentation: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const resultText = await response.text();
    const parsedResult = JSON.parse(resultText);

    if (parsedResult.error) {
      console.error("Error creating presentation:", parsedResult.error);
      return null;
    }

    return { id: parsedResult.id, slideId: parsedResult.slides[0].id };
  } catch (error) {
    console.error("Error creating presentation:", error);
    return null;
  }
};

const createSlides = async (
  slidesData: Slide[],
  websiteContent: string,
  presentation_id: string,
  token: string,
  slide_id: string
): Promise<any> => {
  if (!token) {
    console.error("Missing access token for creating slides");
    return;
  }

  let variantPick = true;

  const ws = new WebSocket(
    "wss://alai-standalone-backend.getalai.com/ws/create-slides-from-outlines",
    [],
    {
      headers: {
        Origin: "https://app.getalai.com",
      },
    }
  );

  if (!presentation_id || !token) {
    console.error("Missing presentation ID or access token");
    return;
  }

  const payload = {
    auth_token: token,
    presentation_id: presentation_id,
    presentation_instructions: Instructions,
    raw_context: websiteContent,
    slide_id: slide_id,
    slide_outlines: slidesData,
    starting_slide_order: 0,
    update_tone_verbosity_calibration_status: true,
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  } else {
    ws.on("open", () => {
      ws.send(JSON.stringify(payload));
    });
  }

  ws.on("message", async (data) => {
    const parsedData = JSON.parse(data.toString());

    if (parsedData.slides && Array.isArray(parsedData.slides)) {
      parsedData.slides.forEach(async (slide: any) => {
        if (slide_id != slide.id) {
          console.log("Slide images", slide.slide_outline?.images_on_slide);
          await getVariants(
            token,
            presentation_id,
            slide.id,
            slide.slide_outline?.slide_instructions ?? "",
            slide.slide_outline?.slide_context ?? "",
            slide.slide_outline?.slide_title ?? "",
            slide.slide_outline?.images_on_slide ?? null
          );
        }
      });
    }

    if (parsedData.is_discarded === false && variantPick === true) {
      variantPick = false;
      await setSlideStatus(parsedData.slide_id, token);
      await pickSlideVariant(parsedData.slide_id, parsedData.id, token);
    }
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err);
  });

  ws.on("close", () => {
    console.log("🔒 WebSocket connection closed");
  });
};

export const slidesOutline = async (
  websiteContent: string,
  company_mission: string,
  scrapedImageUrls: ScrapedImageGroups | null
): Promise<string | null> => {
  const token = await getAccessToken();
  const presentationData = await createPresentation();

  if (!presentationData || !token) {
    console.error("Failed to create presentation or token");
    return null;
  }

  const { id: presentation_id, slideId } = presentationData;

  const id1 = uuidv4();
  const id2 = uuidv4();
  const id3 = uuidv4();
  const created_at = getCreatedAt();

  const payload = {
    auth_token: token,
    presentation_id: presentation_id,
    presentation_instructions: Instructions,
    presentation_questions: [
      {
        id: id1,
        presentation_id: presentation_id,
        question_type: "PRESENTATION_GOAL",
        created_at,
        answer: company_mission,
      },
      {
        id: id2,
        presentation_id: presentation_id,
        question_type: "AUDIENCE_INFORMATION",
        created_at,
        answer: null,
      },
      {
        id: id3,
        presentation_id: presentation_id,
        question_type: "AUDIENCE_CURRENT_KNOWLEDGE",
        created_at,
        answer: null,
      },
    ],
    raw_context: websiteContent,
    slide_order: 0,
    slide_range: "2-5",
  };

  const slidesData: Slide[] = [];

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      "wss://alai-standalone-backend.getalai.com/ws/generate-slides-outline",
      [],
      {
        headers: {
          Origin: "https://app.getalai.com",
        },
      }
    );

    ws.on("open", () => {
      ws.send(JSON.stringify(payload));
    });

    ws.on("message", (data) => {
      slidesData.push(JSON.parse(data.toString()));
    });

    ws.on("error", (err) => {
      console.error("❌ WebSocket error:", err);
      reject(err);
    });

    ws.on("close", async () => {
      console.log("🔒 WebSocket connection closed");
      const imageSections = [
        "introduction",
        "features",
        "how_it_works",
        "target_audience",
        "vision",
      ] as const;

      slidesData.forEach((slide, index) => {
        const section = imageSections[index];
        const urls = scrapedImageUrls?.[section];

        if (Array.isArray(urls) && urls.length > 0) {
          slide.images_on_slide = urls.map((url) => ({
            file_path: "",
            url,
          }));
        }
        console.log("Slide data:", slide.images_on_slide);
      });

      await createSlides(
        slidesData,
        websiteContent,
        presentation_id,
        token,
        slideId
      );
      resolve(presentation_id);
    });
  });
};

const setSlideStatus = async (
  slideId: string,
  token: string,
  status: string = "DEFAULT"
): Promise<void> => {
  const headers = new Headers({
    Accept: "*/*",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
    Authorization: `Bearer ${token}`,
    Connection: "keep-alive",
    "Content-Type": "application/json",
    Origin: "https://app.getalai.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "sec-ch-ua":
      '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
  });

  const body = JSON.stringify({
    slide_id: slideId,
    slide_status: status,
  });

  try {
    const response = await fetch(
      "https://alai-standalone-backend.getalai.com/set-slide-status",
      {
        method: "POST",
        headers,
        body,
        redirect: "follow" as RequestRedirect,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ Failed to set slide status:",
        response.status,
        errorText
      );
    } else {
      console.log("✅ Slide status set successfully");
    }
  } catch (error) {
    console.error("❌ Error setting slide status:", error);
  }
};

const getVariants = async (
  auth_token: string,
  presentation_id: string,
  slide_id: string,
  additional_instructions: string,
  slide_specific_context: string,
  slide_title: string,
  images_on_slide: SlideImage[] | null,
): Promise<any> => {
  console.log("Images on Slide : ", images_on_slide);

  const ws = new WebSocket(
    "wss://alai-standalone-backend.getalai.com/ws/create-and-stream-slide-variants",
    [],
    {
      headers: {
        Origin: "https://app.getalai.com",
      },
    }
  );

  if (!presentation_id || !auth_token) {
    console.error("Missing presentation ID or access token");
    return;
  }

  let variantPick = true;

  const payload = {
    additional_instructions,
    auth_token,
    images_on_slide,
    layout_type: "AI_GENERATED_LAYOUT",
    presentation_id,
    slide_id,
    slide_specific_context,
    slide_title,
    update_tone_verbosity_calibration_status: false,
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  } else {
    ws.on("open", () => {
      ws.send(JSON.stringify(payload));
    });
  }

  ws.on("message", async (data) => {
    const parsedData = JSON.parse(data.toString());
    if (parsedData.is_discarded === false && variantPick === true) {
      variantPick = false;
      await pickSlideVariant(parsedData.slide_id, parsedData.id, auth_token);
      await setSlideStatus(parsedData.slide_id, auth_token);
    }
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err);
  });

  ws.on("close", async () => {
    console.log("🔒 WebSocket connection closed");
  });
};

const pickSlideVariant = async (
  slideId: string,
  variantId: string,
  token: string
): Promise<void> => {
  const myHeaders = new Headers();
  myHeaders.append("Accept", "*/*");
  myHeaders.append("Accept-Language", "en-GB,en-US;q=0.9,en;q=0.8");
  myHeaders.append("Authorization", `Bearer ${token}`);
  myHeaders.append("Connection", "keep-alive");
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Origin", "https://app.getalai.com");
  myHeaders.append("Sec-Fetch-Dest", "empty");
  myHeaders.append("Sec-Fetch-Mode", "cors");
  myHeaders.append("Sec-Fetch-Site", "same-site");
  myHeaders.append(
    "User-Agent",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
  );
  myHeaders.append(
    "sec-ch-ua",
    '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"'
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');

  const raw = JSON.stringify({
    slide_id: slideId,
    variant_id: variantId,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow" as RequestRedirect,
  };

  try {
    const response = await fetch(
      "https://alai-standalone-backend.getalai.com/pick-slide-variant",
      requestOptions
    );
    const result = await response.text();
  } catch (error) {
    console.error("❌ Error picking slide variant:", error);
  }
};
