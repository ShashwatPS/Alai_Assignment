import dotenv from 'dotenv';
import { v4 as uuidv4 } from "uuid";
import WebSocket from 'ws'; 
import { getCreatedAt, Instructions } from './constants';
import { Slide } from '../interfaces/Slide';

dotenv.config();

const getAccessToken = async (): Promise<string | null> => {
  if (!process.env.ALAI_API_KEY || !process.env.ALAI_EMAIL || !process.env.ALAI_PASSWORD) {
    console.error("API key, email, and password are required");
    return null;
  }

  const myHeaders = new Headers();
  myHeaders.append("accept", "*/*");
  myHeaders.append("accept-language", "en-GB,en-US;q=0.9,en;q=0.8");
  myHeaders.append("apikey", process.env.ALAI_API_KEY!);
  myHeaders.append("content-type", "application/json;charset=UTF-8");
  myHeaders.append("origin", "https://app.getalai.com");
  myHeaders.append("priority", "u=1, i");
  myHeaders.append("sec-ch-ua", "\"Chromium\";v=\"134\", \"Not:A-Brand\";v=\"24\", \"Google Chrome\";v=\"134\"");
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", "\"macOS\"");
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36");
  myHeaders.append("x-client-info", "supabase-js-web/2.45.4");
  myHeaders.append("x-supabase-api-version", "2024-01-01");

  const raw = JSON.stringify({
    email: process.env.ALAI_EMAIL,
    password: process.env.ALAI_PASSWORD,
    gotrue_meta_security: {}
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow" as RequestRedirect
  };

  try {
    const response = await fetch("https://api.getalai.com/auth/v1/token?grant_type=password", requestOptions);
    const result = await response.text();
    const parsed = JSON.parse(result);

    return parsed.access_token ?? null;
  } catch (error) {
    console.error("Failed to fetch access token:", error);
    return null;
  }
};

const createPresentation = async (): Promise<{ id: string, slideId: string } | null> => {
  const token = await getAccessToken();

  const presentation_id = uuidv4();

  if (!token) {
    console.error("No access token found");
    return null;
  }

  const headers = new Headers({
    "Accept": "*/*",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Origin": "https://app.getalai.com",
    "User-Agent": "Mozilla/5.0",
    "sec-ch-ua": "\"Chromium\";v=\"134\", \"Not:A-Brand\";v=\"24\", \"Google Chrome\";v=\"134\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\""
  });

  const body = JSON.stringify({
    presentation_id,
    presentation_title: "Untitled Presentation",
    create_first_slide: true,
    theme_id: "a6bff6e5-3afc-4336-830b-fbc710081012",
    default_color_set_id: 0
  });

  const requestOptions = {
    method: "POST",
    headers,
    body,
    redirect: "follow" as RequestRedirect
  };

  try {
    const response = await fetch("https://alai-standalone-backend.getalai.com/create-new-presentation", requestOptions);

    if (!response.ok) {
      console.error(`Failed to create presentation: ${response.status} ${response.statusText}`);
      return null;
    }

    const resultText = await response.text();
    const parsedResult = JSON.parse(resultText);

    if (parsedResult.error) {
      console.error("Error creating presentation:", parsedResult.error);
      return null;
    }

    return {id: parsedResult.id, slideId: parsedResult.slides[0].id};
  } catch (error) {
    console.error("Error creating presentation:", error);
    return null;
  }
};

const createSlides = async (slidesData: Slide[], websiteContent: string, presentation_id: string, token: string, slide_id: string): Promise<any> => {
  if(!token) {
    console.error("Missing access token for creating slides");
    return;
  }

  // await getCalibrationSampleText(presentation_id, websiteContent, token);

  const ws = new WebSocket('wss://alai-standalone-backend.getalai.com/ws/create-slides-from-outlines', [], {
    headers: {
      Origin: 'https://app.getalai.com'
    }
  });

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

  if( ws.readyState === WebSocket.OPEN) {
  ws.send(JSON.stringify(payload));
  } else {
    ws.on('open', () => {
      ws.send(JSON.stringify(payload));
    });
  }

  ws.on('message', (data) => {
    console.log('📩 Message from server:', data.toString());
    const parsedData = JSON.parse(data.toString());

    console.log("Parsed Data:", parsedData);

    if (parsedData.slides && Array.isArray(parsedData.slides)) {
      parsedData.slides.forEach(async (slide: any) => {
          console.log("Processing slide:", slide);
          if(slide_id != slide.id) {
          getVariants(
              token, 
              presentation_id,
              slide.id,
              slide.slide_outline?.slide_instructions ?? "",
              slide.slide_outline?.slide_context ?? "",
              slide.slide_outline?.slide_title ?? ""
          );
        }
      });
  }
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
  });

  ws.on('close', () => {
    console.log('🔒 WebSocket connection closed');
  });
};


export const slidesOutline = async ( websiteContent: string, company_mission: string): Promise<any> => {
  const ws = new WebSocket('wss://alai-standalone-backend.getalai.com/ws/generate-slides-outline', [], {
    headers: {
      Origin: 'https://app.getalai.com'
    }
  });

  const presentationData = await createPresentation();
if (!presentationData) {
  console.error("Failed to create presentation");
  return;
}

const { id: presentation_id, slideId } = presentationData;  
  const token = await getAccessToken();
  const id1 = uuidv4();
  const id2 = uuidv4();
  const id3 = uuidv4();
  const created_at = getCreatedAt();

  if (!presentation_id || !token) {
    console.error("Missing presentation ID or access token");
    return;
  }

  let slidesData: Slide[] = [];

  const payload = {
    auth_token: token,
    presentation_id: presentation_id,
    presentation_instructions: Instructions,
    presentation_questions: [
      {
        id: id1,
        presentation_id: presentation_id,
        question_type: "PRESENTATION_GOAL",
        created_at: created_at,
        answer: company_mission
      },
      {
        id: id2,
        presentation_id: presentation_id,
        question_type: "AUDIENCE_INFORMATION",
        created_at: created_at,
        answer: null
      },
      {
        id: id3,
        presentation_id: presentation_id,
        created_at: created_at,
        question_type: "AUDIENCE_CURRENT_KNOWLEDGE",
        answer: null
      }
    ],
    raw_context: websiteContent,
    slide_order: 0,
    slide_range: "2-5"
  };

  ws.send(JSON.stringify(payload));

  ws.on('message', (data) => {
    console.log('📩 Message from server:', data.toString());
    slidesData.push(JSON.parse(data.toString()));
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
  });

  ws.on('close', async () => {
  console.log('🔒 WebSocket connection closed');
  await createSlides(slidesData, websiteContent, presentation_id, token, slideId);
});
};

export const getVariants = async ( auth_token: string, presentation_id: string,slide_id: string, additional_instructions: string, slide_specific_context: string,slide_title: string ): Promise<any> => {
  const ws = new WebSocket('wss://alai-standalone-backend.getalai.com/ws/create-and-stream-slide-variants', [], {
    headers: {
      Origin: 'https://app.getalai.com'
    }
  });

  console.log("Getting variants");

  if (!presentation_id || !auth_token) {
    console.error("Missing presentation ID or access token");
    return;
  }

  let slidesData: Slide[] = [];

  const payload = {
    additional_instructions,
    auth_token,
    images_on_slide: [],
    layout_type: "AI_GENERATED_LAYOUT",
    presentation_id,
    slide_id,
    slide_specific_context,
    slide_title,
    update_tone_verbosity_calibration_status: false
  };

  if (ws.readyState === WebSocket.OPEN) {
  ws.send(JSON.stringify(payload));
  } else {
    ws.on('open', () => {
      ws.send(JSON.stringify(payload));
    });
  }
  console.log("Payload sent:", payload);

  ws.on('message', (data) => {
    console.log('📩 Message from server:', data.toString());
    slidesData.push(JSON.parse(data.toString()));
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
  });

  ws.on('close', async () => {
  console.log('🔒 WebSocket connection closed');
  // await createSlides(slidesData, websiteContent, presentation_id, token, slideId);
});
};