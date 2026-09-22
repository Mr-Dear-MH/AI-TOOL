import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON payload up to 50mb (for base64 images/audio)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // API 1: Generate Multi-scene Script & Story with Multilingual Narration
  app.post("/api/generate-script", async (req, res) => {
    try {
      const {
        prompt,
        duration = "30s",
        sceneCount = 4,
        language = "Urdu",
        languageCode = "ur",
        style = "Cinematic Movie",
        aspectRatio = "16:9",
        mood = "Epic & Inspiring",
      } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured in server environment.",
        });
      }

      const systemInstruction = `You are a world-class AI Film Director, Screenwriter, and Multilingual Voiceover Producer like Veo 3 / Sora Director Studio.
Your mission is to turn user prompts (which might be in English, Urdu, Hindi, Roman Urdu, or any language) into a high-production video storyboard.
Output strictly JSON matching the specified schema.
Language requirement: The voiceoverText and captions must be authentically written in the requested language: ${language} (${languageCode}).
If language is Urdu or Hindi, write native script with high emotional impact and correct cadence.
For each scene, provide:
- sceneNumber: 1, 2, ...
- title: Short scene title
- durationSeconds: number (between 4 and 15 seconds per scene, proportional to total duration)
- visualPrompt: Highly detailed visual description optimized for AI video/image generator (lighting, camera lens, color grading, photorealistic details, 8k resolution, Unreal Engine 5, cinematic composition)
- voiceoverText: The exact narration script to be spoken in ${language}
- captionText: Clean subtitle line in ${language}
- cameraMotion: One of ["Cinematic Zoom In", "Dramatic Zoom Out", "Pan Left to Right", "Pan Right to Left", "Dynamic Drone Sweep", "Slow Orbiting 360", "Low Angle Tilt Up", "Slow Motion 120fps", "Static Focused Depth"]
- soundEffectSuggestion: e.g. "thunderous wind", "ambient city street", "gentle orchestral swell"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Create a ${duration} video storyboard with ${sceneCount} continuous scenes based on this idea:
"${prompt}"

Visual Style: ${style}
Aspect Ratio: ${aspectRatio}
Target Voiceover Language: ${language} (${languageCode})
Mood/Atmosphere: ${mood}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              storyLogline: { type: Type.STRING },
              totalDuration: { type: Type.STRING },
              language: { type: Type.STRING },
              visualStyle: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    durationSeconds: { type: Type.NUMBER },
                    visualPrompt: { type: Type.STRING },
                    voiceoverText: { type: Type.STRING },
                    captionText: { type: Type.STRING },
                    cameraMotion: { type: Type.STRING },
                    soundEffectSuggestion: { type: Type.STRING },
                  },
                  required: [
                    "sceneNumber",
                    "title",
                    "durationSeconds",
                    "visualPrompt",
                    "voiceoverText",
                    "cameraMotion",
                  ],
                },
              },
            },
            required: ["title", "storyLogline", "scenes"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed);
    } catch (error: any) {
      console.error("Error generating script:", error);
      return res.status(500).json({
        error: error.message || "Failed to generate script.",
      });
    }
  });

  // API 2: Generate Batch Prompts (up to 50 prompts at once)
  app.post("/api/generate-batch-prompts", async (req, res) => {
    try {
      const {
        concept,
        count = 10,
        language = "Urdu",
        languageCode = "ur",
        style = "Cinematic Movie",
        aspectRatio = "16:9",
      } = req.body;

      if (!concept) {
        return res.status(400).json({ error: "Concept prompt is required." });
      }

      const promptCount = Math.min(Math.max(Number(count) || 5, 2), 50);

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const systemInstruction = `You are a batch AI prompt engineer for massive generative video and image workflows.
Generate exactly ${promptCount} coherent, sequentially numbered prompt cards that trace a magnificent narrative or visual series based on the user's idea.
Each item must contain:
- id: number from 1 to ${promptCount}
- title: Catchy scene title
- imagePrompt: Rich, hyper-detailed visual prompt for Text-to-Image / Veo 3 video generator with camera details, lighting, depth of field, atmosphere
- voiceoverScript: Narration script in ${language} (${languageCode})
- cameraDirection: Suggested camera movement (e.g. Pan, Zoom, Crane, Drone, Orbit)
- durationSeconds: suggested duration between 5 and 15 seconds`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Generate a batch of ${promptCount} connected prompts for: "${concept}".
Visual Style: ${style}, Aspect Ratio: ${aspectRatio}, Voiceover Language: ${language} (${languageCode})`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                title: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                voiceoverScript: { type: Type.STRING },
                cameraDirection: { type: Type.STRING },
                durationSeconds: { type: Type.NUMBER },
              },
              required: ["id", "title", "imagePrompt", "voiceoverScript", "cameraDirection"],
            },
          },
        },
      });

      const batch = JSON.parse(response.text || "[]");
      return res.json({ count: batch.length, prompts: batch });
    } catch (error: any) {
      console.error("Error generating batch prompts:", error);
      return res.status(500).json({
        error: error.message || "Failed to generate batch prompts.",
      });
    }
  });

  // API 3: Generate Image (Gemini Nano Banana / Flash Image or Fallback Engine)
  app.post("/api/generate-image", async (req, res) => {
    try {
      const {
        prompt,
        aspectRatio = "16:9",
        style = "Cinematic Movie",
        seed,
      } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const ai = getGeminiClient();
      let generatedImageUrl: string | null = null;

      if (ai) {
        try {
          // Attempt Gemini 3.1 Flash Lite Image
          const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
          const ar = validRatios.includes(aspectRatio) ? aspectRatio : "16:9";

          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-image",
            contents: {
              parts: [
                {
                  text: `${prompt}. Style: ${style}. Hyperrealistic 8k masterpiece, cinematic lighting, volumetric atmosphere, ultra sharp focus.`,
                },
              ],
            },
            config: {
              imageConfig: {
                aspectRatio: ar as any,
              },
            },
          });

          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                const mimeType = part.inlineData.mimeType || "image/png";
                generatedImageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (geminiImgError: any) {
          console.warn("Gemini direct image generation unavailable or quota exceeded, using high-res neural render pipeline:", geminiImgError.message);
        }
      }

      // If Gemini image model isn't active or fails (e.g. requires paid tier or billing), fallback seamlessly to Pollinations AI neural generator
      if (!generatedImageUrl) {
        const cleanPrompt = encodeURIComponent(
          `${prompt}, ${style}, 8k, photorealistic, cinematic lighting, masterwork`
        );
        const width = aspectRatio === "9:16" ? 720 : aspectRatio === "1:1" ? 1024 : 1280;
        const height = aspectRatio === "9:16" ? 1280 : aspectRatio === "1:1" ? 1024 : 720;
        const randomSeed = seed || Math.floor(Math.random() * 9999999);
        generatedImageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${randomSeed}&nologo=true&enhance=true`;
      }

      return res.json({
        imageUrl: generatedImageUrl,
        prompt,
        aspectRatio,
        style,
      });
    } catch (error: any) {
      console.error("Error in generate-image:", error);
      return res.status(500).json({
        error: error.message || "Failed to generate image.",
      });
    }
  });

  // API 4: Generate Multilingual Speech (Gemini TTS with fallback)
  app.post("/api/generate-tts", async (req, res) => {
    try {
      const {
        text,
        voice = "Kore", // Kore, Puck, Zephyr, Fenrir, Charon
        language = "Urdu",
        languageCode = "ur-PK",
      } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required for TTS." });
      }

      const ai = getGeminiClient();
      let audioBase64: string | null = null;

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [
              {
                parts: [
                  {
                    text: `Speak clearly in ${language} with expressive cinematic narrator tone: ${text}`,
                  },
                ],
              },
            ],
            config: {
              responseModalities: ["AUDIO" as any],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"].includes(voice)
                      ? voice
                      : "Kore",
                  },
                },
              },
            },
          });

          audioBase64 =
            response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        } catch (ttsErr: any) {
          console.warn("Gemini TTS preview fallback to client Web Speech API synthesis:", ttsErr.message);
        }
      }

      return res.json({
        audioBase64,
        text,
        language,
        languageCode,
        voice,
        browserSpeechFallback: !audioBase64,
      });
    } catch (error: any) {
      console.error("Error generating TTS:", error);
      return res.status(500).json({
        error: error.message || "Failed to generate voiceover.",
      });
    }
  });

  // API 5: Veo 3 Video Generation (Veo 3.1 preview models)
  app.post("/api/veo/generate", async (req, res) => {
    try {
      const {
        prompt,
        imageBytes,
        mimeType = "image/png",
        model = "veo-3.1-lite-generate-preview",
        aspectRatio = "16:9",
        resolution = "720p",
      } = req.body;

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const validAspect = aspectRatio === "9:16" ? "9:16" : "16:9";
      const configObj: any = {
        numberOfVideos: 1,
        resolution: resolution === "1080p" ? "1080p" : "720p",
        aspectRatio: validAspect,
      };

      const params: any = {
        model: model || "veo-3.1-lite-generate-preview",
        prompt: prompt || "Cinematic scene with smooth dynamic motion",
        config: configObj,
      };

      if (imageBytes) {
        // Strip data:image/...;base64, prefix if present
        const base64Data = imageBytes.includes(",") ? imageBytes.split(",")[1] : imageBytes;
        params.image = {
          imageBytes: base64Data,
          mimeType,
        };
      }

      const operation = await (ai.models as any).generateVideos(params);
      return res.json({ operationName: operation.name });
    } catch (error: any) {
      console.error("Error calling Veo generate:", error);
      return res.status(500).json({
        error: error.message || "Failed to initiate Veo video generation.",
      });
    }
  });

  // API 6: Veo Operation Status Check
  app.post("/api/veo/status", async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: "operationName is required." });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const op = { name: operationName };
      const updated = await (ai.operations as any).getVideosOperation({ operation: op });

      return res.json({
        done: Boolean(updated.done),
        error: updated.error || null,
        videoUri: updated.response?.generatedVideos?.[0]?.video?.uri || null,
      });
    } catch (error: any) {
      console.error("Error polling Veo operation:", error);
      return res.status(500).json({
        error: error.message || "Failed to check video status.",
      });
    }
  });

  // API 7: Veo Video Download & Proxy
  app.post("/api/veo/download", async (req, res) => {
    try {
      const { operationName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!operationName || !apiKey) {
        return res.status(400).json({ error: "Missing operationName or API key." });
      }

      const ai = getGeminiClient();
      if (!ai) return res.status(500).json({ error: "API not ready" });

      const op = { name: operationName };
      const updated = await (ai.operations as any).getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

      if (!uri) {
        return res.status(404).json({ error: "Video URI not found yet." });
      }

      const videoRes = await fetch(uri, {
        headers: { "x-goog-api-key": apiKey },
      });

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'inline; filename="generated-video.mp4"');

      const arrayBuffer = await videoRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("Error downloading Veo video:", error);
      return res.status(500).json({ error: "Failed to download video stream." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VeoStudio Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
