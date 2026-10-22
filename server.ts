import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to get GoogleGenAI client with server-side API key
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from server environment. Please attach a Gemini API key in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "ELASK-Backend",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Chat endpoint supporting bilingual English, Tamil, and Tanglish with optional Search Grounding
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const {
      message,
      history = [],
      languagePreference = "auto",
      enableWebSearch = true,
      ownerName = "Owner",
    } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server. Please attach an API key in the AI Studio Settings > Secrets panel.",
      });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are ELASK (Electronic Logic & Adaptive Speech Kernel), a futuristic, highly capable personal AI assistant for ${ownerName} on Windows.
Your visual presence is inspired by dark, cyan-holographic HUD interfaces.
You are powered by Google's Gemini models. Never claim to be JARVIS, ChatGPT, or Claude. Identify as ELASK.

LANGUAGE RULES:
- You are strictly bilingual in Tamil (தமிழ்), English, and Tanglish (Tamil words written in English alphabet or mixed conversation).
- If the user asks or speaks in Tamil, respond in polite, natural Tamil.
- If the user uses Tanglish (e.g. "Enna panringa?", "Edge browser open pannunga", "WhatsApp la Rajesh ku message anupalam"), reply naturally in Tanglish or clean conversational English with Tamil understanding.
- If the user speaks in English, reply in crisp, concise English.
- Language Preference setting from user: "${languagePreference}". Respect this if set to specific 'tamil' or 'english', otherwise auto-adapt dynamically.
- Keep spoken responses scannable, natural, and concise (ideal for voice playback).

WINDOWS OS & PRODUCTIVITY ACTIONS:
ELASK can identify when the user wants to execute an action on their Windows machine.
Supported actions:
1. LAUNCH_APP: Launching an owner-approved Windows app (e.g., "Microsoft Edge", "Notepad", "Calculator", "Visual Studio Code", "File Explorer", "Command Prompt").
2. OPEN_URL: Opening a website inside Microsoft Edge (e.g., "open github.com in Edge", "youtube open pannu").
3. WHATSAPP_MESSAGE: Preparing or sending a WhatsApp message. You MUST identify the recipient name or phone number and message text.
4. ZOOM: Window zoom in or zoom out.
5. SYSTEM_CHECK: Checking local Windows companion, battery, or disk status.

If an action is detected, provide your standard conversational response first, and then append a JSON block at the very end in this exact format:
\`\`\`json_action
{
  "type": "LAUNCH_APP" | "OPEN_URL" | "WHATSAPP_MESSAGE" | "ZOOM" | "SYSTEM_CHECK",
  "appName": "Microsoft Edge", // or target app
  "url": "https://...", // if OPEN_URL
  "recipient": "Rajesh", // if WHATSAPP_MESSAGE
  "message": "Hey, I will be 10 minutes late.", // if WHATSAPP_MESSAGE
  "zoomDirection": "in" | "out", // if ZOOM
  "targetWindow": "Microsoft Edge", // if ZOOM
  "explanation": "Opening Microsoft Edge on Windows"
}
\`\`\`

If no Windows action is needed (general Q&A, reasoning, coding, chit-chat), DO NOT include the json_action block.
Always be accurate, respectful, and safe. Never execute destructive commands.`;

    // Construct contents
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add recent history if present (last 6 turns for context)
    const validHistory = Array.isArray(history) ? history.slice(-6) : [];
    for (const h of validHistory) {
      if (h.role === "user" || h.role === "assistant" || h.role === "model") {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.text || h.content || "" }],
        });
      }
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Check if query warrants web search
    const requiresWebSearch =
      enableWebSearch &&
      (message.toLowerCase().includes("today") ||
        message.toLowerCase().includes("news") ||
        message.toLowerCase().includes("weather") ||
        message.toLowerCase().includes("current") ||
        message.toLowerCase().includes("latest") ||
        message.toLowerCase().includes("score") ||
        message.toLowerCase().includes("price") ||
        message.toLowerCase().includes("who is") ||
        message.toLowerCase().includes("ennathu") ||
        message.toLowerCase().includes("seithi") ||
        message.toLowerCase().includes("ippo"));

    const toolsConfig: any[] = [];
    if (requiresWebSearch) {
      toolsConfig.push({ googleSearch: {} });
    }

    // Helper to extract HTTP status code from GoogleGenAI errors
    const getErrorCode = (err: any): number => {
      if (typeof err?.status === "number") return err.status;
      if (typeof err?.code === "number") return err.code;
      if (typeof err?.statusCode === "number") return err.statusCode;
      if (typeof err?.message === "string") {
        try {
          const parsed = JSON.parse(err.message);
          if (typeof parsed?.error?.code === "number") return parsed.error.code;
        } catch (_e) {
          const match = err.message.match(/"code":\s*(\d+)/);
          if (match && match[1]) return parseInt(match[1], 10);
        }
        if (err.message.includes("503") || err.message.includes("UNAVAILABLE") || err.message.includes("high demand")) return 503;
        if (err.message.includes("400") || err.message.includes("INVALID_ARGUMENT")) return 400;
        if (err.message.includes("401") || err.message.includes("UNAUTHENTICATED")) return 401;
        if (err.message.includes("403") || err.message.includes("PERMISSION_DENIED")) return 403;
        if (err.message.includes("404") || err.message.includes("NOT_FOUND")) return 404;
        if (err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED")) return 429;
      }
      return 500;
    };

    // Helper to sanitize error message and prevent leaking API keys
    const sanitizeError = (raw: string): string => {
      let msg = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error?.message) msg = parsed.error.message;
      } catch (_e) {}
      return msg.replace(/key=[A-Za-z0-9_\-\.]+/gi, "key=***").replace(/apiKey[:=]\s*["']?[A-Za-z0-9_\-\.]+["']?/gi, "apiKey=***");
    };

    // Candidate models cascade:
    // User requested primary model (gemini-3.8-flash) with fallback to gemini-3.7-flash, gemini-3.5-flash, gemini-flash-lite-latest
    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.5-flash",
      "gemini-flash-lite-latest",
    ];

    let response: any = null;
    let successfulModel = "";
    let terminalError: { code: number; message: string } | null = null;
    let lastErrorMsg = "";
    let is503Unavailable = false;

    for (const modelName of candidateModels) {
      let retryCount = 0;
      const max503Retries = 2; // Maximum 2 retries for 503 errors

      while (retryCount <= max503Retries) {
        try {
          console.log(`[ELASK-GEMINI] Querying model: ${modelName} (attempt ${retryCount + 1}/${max503Retries + 1})...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: contents as any,
            config: {
              systemInstruction,
              temperature: 0.7,
              ...(toolsConfig.length > 0 ? { tools: toolsConfig } : {}),
            },
          });

          if (response && response.text) {
            successfulModel = modelName;
            console.log(`[ELASK-GEMINI] Success from model: ${modelName}`);
            break; // model succeeded
          }
        } catch (err: any) {
          const code = getErrorCode(err);
          const cleanMsg = sanitizeError(err?.message || "Unknown Gemini error");
          lastErrorMsg = cleanMsg;

          console.warn(`[ELASK-GEMINI] Model ${modelName} failed with code ${code}: ${cleanMsg}`);

          // RULE: Do not retry 400, 401, or 403 errors
          if (code === 400 || code === 401 || code === 403) {
            terminalError = {
              code,
              message:
                code === 401 || code === 403
                  ? "Gemini API authentication or permission failed. Please verify your API key in Settings > Secrets."
                  : cleanMsg,
            };
            break; // stop retrying this model
          }

          // RULE: For temporary 503 errors (or UNAVAILABLE / high demand), retry maximum 2 times with exponential backoff & jitter
          const is503 = code === 503 || cleanMsg.includes("503") || cleanMsg.includes("high demand") || cleanMsg.includes("UNAVAILABLE");
          if (is503) {
            is503Unavailable = true;
            if (retryCount < max503Retries) {
              const jitter = Math.floor(Math.random() * 250);
              const delay = 500 * Math.pow(2, retryCount) + jitter;
              console.log(`[ELASK-GEMINI] 503 received for ${modelName}. Retrying in ${delay}ms with jitter (retry ${retryCount + 1}/${max503Retries})...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              retryCount++;
              continue;
            } else {
              console.warn(`[ELASK-GEMINI] Model ${modelName} exhausted ${max503Retries} retries for 503. Cascading to fallback model...`);
              break; // cascade to next model in candidateModels
            }
          }

          // For 429 quota or other errors on this specific model, cascade directly to next fallback model
          break;
        }
      }

      // If fatal non-retryable error (400, 401, 403), do not cascade; return immediately
      if (terminalError) {
        break;
      }

      // If we got a successful response, stop cascading
      if (response && response.text) {
        break;
      }
    }

    // Handle terminal client/auth error
    if (terminalError) {
      res.status(terminalError.code).json({
        error: terminalError.message,
        isUnavailable: false,
      });
      return;
    }

    // If no model was able to answer
    if (!response || !response.text) {
      const isUnavailable = is503Unavailable || lastErrorMsg.includes("UNAVAILABLE") || lastErrorMsg.includes("high demand");
      res.status(503).json({
        error: isUnavailable
          ? "All Gemini models are temporarily experiencing high demand (503 UNAVAILABLE). Please click Retry below."
          : `All Gemini models failed: ${lastErrorMsg}`,
        isUnavailable: true,
      });
      return;
    }

    const fullText = response.text || "";

    // Parse potential action block
    let replyText = fullText;
    let detectedAction = null;

    const actionMatch = fullText.match(/```json_action\s*([\s\S]*?)\s*```/);
    if (actionMatch && actionMatch[1]) {
      try {
        detectedAction = JSON.parse(actionMatch[1]);
        replyText = fullText.replace(/```json_action\s*[\s\S]*?\s*```/, "").trim();
      } catch (err) {
        console.warn("Failed to parse json_action block:", err);
      }
    }

    // Extract grounding sources if available
    const groundingSources: Array<{ title: string; url: string }> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if (chunk.web?.uri) {
          groundingSources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      }
    }

    res.json({
      text: replyText,
      raw: fullText,
      action: detectedAction,
      sources: groundingSources,
      model: successfulModel,
    });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    let errMsg = error?.message || "Internal server error processing chat request";
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed.error?.message) errMsg = parsed.error.message;
    } catch (_e) {}
    res.status(500).json({ error: errMsg, isUnavailable: false });
  }
});

// Text-to-Speech endpoint with gemini-3.8-flash-lite-tts
app.post("/api/tts", async (req: Request, res: Response) => {
  try {
    const { text, voice = "Kore" } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.json({ fallbackWebSpeech: true, reason: "No API key" });
      return;
    }

    const ai = getGeminiClient();

    // gemini-3.8-flash-lite-tts supports voices like 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    // For pure Tamil script, Gemini TTS handles bilingual speech, but browser WebSpeech is also supplied as seamless client fallback.
    const validVoices = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"];
    const chosenVoice = validVoices.includes(voice) ? voice : "Kore";

    // Truncate text for TTS preview if excessively long
    const cleanText = text.slice(0, 450);

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: cleanText,
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      res.json({
        audio: base64Audio,
        mimeType: "audio/wav",
        voice: chosenVoice,
      });
    } else {
      res.json({
        fallbackWebSpeech: true,
        reason: "No audio stream returned",
      });
    }
  } catch (error: any) {
    console.warn("TTS Generation note (using browser fallback):", error?.message);
    res.json({
      fallbackWebSpeech: true,
      error: error?.message,
    });
  }
});

// Windows Companion proxy & status check
app.get("/api/companion/check", async (_req: Request, res: Response) => {
  // Probes http://127.0.0.1:9123/health
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const response = await fetch("http://127.0.0.1:9123/health", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      res.json({ online: true, localData: data });
      return;
    }
  } catch (_e) {
    // companion offline
  }

  res.json({
    online: false,
    message: "Windows Companion service not detected on localhost:9123",
    instructions: "Run 'npm run companion' or 'start-companion.bat' on your Windows machine.",
  });
});

// Forward approved action to Windows Companion
app.post("/api/companion/dispatch", async (req: Request, res: Response) => {
  const { action, token } = req.body;
  if (!action) {
    res.status(400).json({ error: "Action payload is required" });
    return;
  }

  if (!token || typeof token !== "string") {
    res.status(401).json({
      error: "Companion pairing token is required. Please set your pairing token in Settings > Companion.",
    });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch("http://127.0.0.1:9123/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ELASK-TOKEN": token,
      },
      body: JSON.stringify(action),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    res.json(data);
  } catch (_err) {
    res.status(503).json({
      success: false,
      error: "Companion unavailable. Please verify the Windows Companion is running on port 9123.",
      companionOffline: true,
    });
  }
});

// Setup Vite middleware in dev or static files in production
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, "dist")));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log(`[ELASK-SYSTEM] Server online on http://0.0.0.0:${port}`);
});
