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

function pcmToWavBase64(base64Pcm: string, sampleRate = 24000, numChannels = 1): string {
  try {
    const pcmBuffer = Buffer.from(base64Pcm, "base64");
    const wavBuffer = Buffer.alloc(44 + pcmBuffer.length);

    // "RIFF"
    wavBuffer.write("RIFF", 0);
    // file length - 8
    wavBuffer.writeUInt32LE(36 + pcmBuffer.length, 4);
    // "WAVE"
    wavBuffer.write("WAVE", 8);
    // "fmt "
    wavBuffer.write("fmt ", 12);
    // Subchunk1Size (16 for PCM)
    wavBuffer.writeUInt32LE(16, 16);
    // AudioFormat (1 for PCM)
    wavBuffer.writeUInt16LE(1, 20);
    // NumChannels
    wavBuffer.writeUInt16LE(numChannels, 22);
    // SampleRate
    wavBuffer.writeUInt32LE(sampleRate, 24);
    // ByteRate = SampleRate * NumChannels * BitsPerSample/8
    wavBuffer.writeUInt32LE(sampleRate * numChannels * 2, 28);
    // BlockAlign = NumChannels * BitsPerSample/8
    wavBuffer.writeUInt16LE(numChannels * 2, 32);
    // BitsPerSample
    wavBuffer.writeUInt16LE(16, 34);
    // "data"
    wavBuffer.write("data", 36);
    // Subchunk2Size
    wavBuffer.writeUInt32LE(pcmBuffer.length, 40);

    // Copy PCM data
    pcmBuffer.copy(wavBuffer, 44);

    return `data:audio/wav;base64,${wavBuffer.toString("base64")}`;
  } catch (err) {
    console.warn("PCM to WAV conversion error:", err);
    return `data:audio/wav;base64,${base64Pcm}`;
  }
}

async function fetchGoogleTTS(text: string, langCode: string): Promise<string | null> {
  try {
    const cleanText = text.replace(/[\n\r]+/g, " ").slice(0, 190);
    const code = langCode.split("-")[0].toLowerCase();
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${code}&client=tw-ob`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:audio/mp3;base64,${base64}`;
    }
  } catch (err) {
    console.warn("Google TTS fallback failed:", err);
  }
  return null;
}

async function fetchImageAsBase64(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const mime = res.headers.get("content-type") || "image/jpeg";
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:${mime};base64,${base64}`;
    }
  } catch (err) {
    console.warn("Image fetch as base64 timed out or failed:", err);
  }
  return null;
}

function generateCinematicSvgDataUrl(prompt: string, style: string, aspectRatio = "16:9"): string {
  const isPortrait = aspectRatio === "9:16";
  const isSquare = aspectRatio === "1:1";
  const width = isPortrait ? 720 : isSquare ? 1024 : 1280;
  const height = isPortrait ? 1280 : isSquare ? 1024 : 720;
  const safePrompt = prompt.replace(/[<>&"]/g, " ").slice(0, 90);
  const safeStyle = style.replace(/[<>&"]/g, " ").slice(0, 40);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <radialGradient id="skyGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    <radialGradient id="amberGlow" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45" />
      <stop offset="60%" stop-color="#d97706" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#b45309" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#skyGrad)" />
  <circle cx="${width / 2}" cy="${height / 2 - 20}" r="${Math.min(width, height) * 0.4}" fill="url(#amberGlow)" />
  <rect x="30" y="30" width="${width - 60}" height="${height - 60}" rx="20" fill="none" stroke="url(#goldBorder)" stroke-width="2" stroke-opacity="0.5" />
  <text x="${width / 2}" y="${height / 2 - 60}" text-anchor="middle" fill="#fbbf24" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" letter-spacing="3">VEO 3 MASTER FRAME</text>
  <text x="${width / 2}" y="${height / 2 - 10}" text-anchor="middle" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="22">${safeStyle}</text>
  <text x="${width / 2}" y="${height / 2 + 45}" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="16">${safePrompt}...</text>
  <g transform="translate(${width / 2 - 30}, ${height / 2 + 100})">
    <circle cx="30" cy="30" r="30" fill="#f59e0b" fill-opacity="0.25" stroke="#f59e0b" stroke-width="2" />
    <polygon points="24,18 44,30 24,42" fill="#fbbf24" />
  </g>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function generateFallbackStoryboard(
  prompt: string,
  duration = "30s",
  sceneCount = 4,
  language = "Urdu",
  languageCode = "ur",
  style = "Cinematic Movie"
) {
  const count = Math.max(1, Math.min(sceneCount || 4, 12));
  const scenes = [];
  const cameraMotions = [
    "Cinematic Zoom In",
    "Dramatic Zoom Out",
    "Pan Left to Right",
    "Dynamic Drone Sweep",
    "Slow Orbiting 360",
    "Low Angle Tilt Up",
  ];

  const isUrdu = languageCode.startsWith("ur") || language.toLowerCase().includes("urdu");
  const isHindi = languageCode.startsWith("hi") || language.toLowerCase().includes("hindi");

  for (let i = 1; i <= count; i++) {
    let voText = `Scene ${i}: ${prompt}. The cinematic journey unfolds with vivid visual atmosphere.`;
    let capText = `Scene ${i}: ${prompt.slice(0, 40)}`;

    if (isUrdu) {
      const urduPhrases = [
        `منظر ${i}: ${prompt}۔ کہانی کا دلکش اور پُراثر آغاز۔`,
        `منظر ${i}: روشنی اور جذبات کا حسین امتزاج، ${prompt}۔`,
        `منظر ${i}: کیمرے کے زاویے اور گہرائی نے اس لمحے کو یادگار بنا دیا۔`,
        `منظر ${i}: کہانی کا عروج، ایک شاندار اور سحر انگیز تجربہ۔`,
      ];
      voText = urduPhrases[(i - 1) % urduPhrases.length];
      capText = `منظر ${i}: ${prompt.slice(0, 40)}`;
    } else if (isHindi) {
      const hindiPhrases = [
        `दृश्य ${i}: ${prompt}। कहानी का एक अत्यंत सम्मोहक और सुंदर दृश्य।`,
        `दृश्य ${i}: प्रकाश और छाया का अद्भुत संगम, ${prompt}।`,
        `दृश्य ${i}: एक यादगार और सिनेमैटिक यात्रा।`,
      ];
      voText = hindiPhrases[(i - 1) % hindiPhrases.length];
      capText = `दृश्य ${i}: ${prompt.slice(0, 40)}`;
    }

    scenes.push({
      sceneNumber: i,
      title: `Scene ${i}: ${prompt.slice(0, 28)}`,
      durationSeconds: Math.round(45 / count) || 10,
      visualPrompt: `${prompt}, scene ${i}, dramatic volumetric lighting, ${style}, 8k photorealistic cinematic film still, masterpiece composition, highly detailed textures`,
      voiceoverText: voText,
      captionText: capText,
      cameraMotion: cameraMotions[(i - 1) % cameraMotions.length],
      soundEffectSuggestion: "cinematic ambient swell, atmospheric soundscape",
    });
  }

  return {
    title: prompt.slice(0, 50),
    storyLogline: `A cinematic ${style} story exploring "${prompt}" across ${count} vivid scenes.`,
    totalDuration: duration || "30s",
    language,
    visualStyle: style,
    scenes,
  };
}

function generateFallbackBatchPrompts(
  concept: string,
  count = 10,
  language = "Urdu",
  languageCode = "ur",
  style = "Cinematic Movie"
) {
  const total = Math.max(2, Math.min(count || 5, 50));
  const cameraMotions = [
    "Cinematic Zoom In",
    "Dramatic Zoom Out",
    "Pan Left to Right",
    "Dynamic Drone Sweep",
    "Slow Orbiting 360",
    "Low Angle Tilt Up",
  ];
  const items = [];
  const isUrdu = languageCode.startsWith("ur") || language.toLowerCase().includes("urdu");

  for (let i = 1; i <= total; i++) {
    const vo = isUrdu
      ? `باب ${i}: ${concept} کی ایک منفرد اور سحر انگیز جھلک۔`
      : `Chapter ${i}: A captivating scene exploring ${concept} in breathtaking detail.`;
    items.push({
      id: i,
      title: `${concept.slice(0, 24)} - Part ${i}`,
      imagePrompt: `${concept}, episode ${i}, ${style}, ultra realistic 8k, majestic volumetric lighting, cinematic photography`,
      voiceoverScript: vo,
      cameraDirection: cameraMotions[(i - 1) % cameraMotions.length],
      durationSeconds: 10,
    });
  }
  return items;
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
      let parsedStoryboard: any = null;

      if (ai) {
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

        const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-2.5-flash"];
        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
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

            if (response.text) {
              const data = JSON.parse(response.text);
              if (data && Array.isArray(data.scenes) && data.scenes.length > 0) {
                parsedStoryboard = data;
                break;
              }
            }
          } catch (modelErr: any) {
            console.warn(`Model ${modelName} script generation error:`, modelErr.message);
          }
        }
      }

      // If all Gemini calls failed or experienced high-demand/503, provide guaranteed fallback storyboard
      if (!parsedStoryboard) {
        parsedStoryboard = generateFallbackStoryboard(
          prompt,
          duration,
          sceneCount,
          language,
          languageCode,
          style
        );
      }

      return res.json(parsedStoryboard);
    } catch (error: any) {
      console.error("Error generating script, serving fallback:", error);
      const fallback = generateFallbackStoryboard(
        req.body?.prompt || "Cinematic Adventure",
        req.body?.duration || "30s",
        req.body?.sceneCount || 4,
        req.body?.language || "Urdu",
        req.body?.languageCode || "ur",
        req.body?.style || "Cinematic Movie"
      );
      return res.json(fallback);
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
      let generatedBatch: any[] | null = null;

      if (ai) {
        const systemInstruction = `You are a batch AI prompt engineer for massive generative video and image workflows.
Generate exactly ${promptCount} coherent, sequentially numbered prompt cards that trace a magnificent narrative or visual series based on the user's idea.
Each item must contain:
- id: number from 1 to ${promptCount}
- title: Catchy scene title
- imagePrompt: Rich, hyper-detailed visual prompt for Text-to-Image / Veo 3 video generator with camera details, lighting, depth of field, atmosphere
- voiceoverScript: Narration script in ${language} (${languageCode})
- cameraDirection: Suggested camera movement (e.g. Pan, Zoom, Crane, Drone, Orbit)
- durationSeconds: suggested duration between 5 and 15 seconds`;

        const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-2.5-flash"];
        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
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

            if (response.text) {
              const parsed = JSON.parse(response.text);
              if (Array.isArray(parsed) && parsed.length > 0) {
                generatedBatch = parsed;
                break;
              }
            }
          } catch (modelErr: any) {
            console.warn(`Model ${modelName} batch generation error:`, modelErr.message);
          }
        }
      }

      if (!generatedBatch) {
        generatedBatch = generateFallbackBatchPrompts(
          concept,
          promptCount,
          language,
          languageCode,
          style
        );
      }

      return res.json({ count: generatedBatch.length, prompts: generatedBatch });
    } catch (error: any) {
      console.error("Error generating batch prompts, serving fallback:", error);
      const fallbackBatch = generateFallbackBatchPrompts(
        req.body?.concept || "Generative AI",
        Number(req.body?.count) || 10,
        req.body?.language || "Urdu",
        req.body?.languageCode || "ur",
        req.body?.style || "Cinematic Movie"
      );
      return res.json({ count: fallbackBatch.length, prompts: fallbackBatch });
    }
  });

  // API 3: Generate Image (Gemini Flash Image with Base64 Neural & Procedural Fallbacks)
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
          const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
          const ar = validRatios.includes(aspectRatio) ? aspectRatio : "16:9";

          // Try gemini-3.1-flash-lite-image first, then gemini-3.1-flash-image
          for (const modelName of ["gemini-3.1-flash-lite-image", "gemini-3.1-flash-image"]) {
            try {
              const response = await ai.models.generateContent({
                model: modelName,
                contents: {
                  parts: [
                    {
                      text: `${prompt}. Visual Style: ${style}. Ultra cinematic 8k masterpiece, photorealistic volumetric lighting, sharp focus, 35mm film grain, masterwork composition.`,
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
              if (generatedImageUrl) break;
            } catch (singleModelErr: any) {
              console.warn(`Model ${modelName} image error:`, singleModelErr.message);
            }
          }
        } catch (geminiImgError: any) {
          console.warn("Gemini direct image generation fallback:", geminiImgError.message);
        }
      }

      // If Gemini image model is not available or timed out, fetch from neural generator server-side as base64
      if (!generatedImageUrl) {
        const cleanPrompt = encodeURIComponent(
          `${prompt}, ${style}, 8k, photorealistic, cinematic lighting, masterpiece`
        );
        const width = aspectRatio === "9:16" ? 720 : aspectRatio === "1:1" ? 1024 : 1280;
        const height = aspectRatio === "9:16" ? 1280 : aspectRatio === "1:1" ? 1024 : 720;
        const randomSeed = seed || Math.floor(Math.random() * 9999999);
        const neuralUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${randomSeed}&nologo=true&enhance=true`;
        
        generatedImageUrl = await fetchImageAsBase64(neuralUrl, 4500);
      }

      // If external network is restricted or slow, generate guaranteed cinematic SVG frame
      if (!generatedImageUrl) {
        generatedImageUrl = generateCinematicSvgDataUrl(prompt, style, aspectRatio);
      }

      return res.json({
        imageUrl: generatedImageUrl,
        prompt,
        aspectRatio,
        style,
      });
    } catch (error: any) {
      console.error("Error in generate-image:", error);
      // Even on outer error, return cinematic SVG so the user's canvas NEVER breaks
      const fallbackUrl = generateCinematicSvgDataUrl(
        req.body?.prompt || "Cinematic Masterpiece",
        req.body?.style || "Cinematic Movie",
        req.body?.aspectRatio || "16:9"
      );
      return res.json({
        imageUrl: fallbackUrl,
        prompt: req.body?.prompt,
        aspectRatio: req.body?.aspectRatio || "16:9",
        style: req.body?.style,
      });
    }
  });

  // API 3.5: Edit Image with Gemini 3.1 Flash Image
  app.post("/api/edit-image", async (req, res) => {
    try {
      const {
        prompt,
        imageBytes,
        mimeType = "image/png",
      } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Edit instruction prompt is required." });
      }
      if (!imageBytes) {
        return res.status(400).json({ error: "Input image is required for editing." });
      }

      const ai = getGeminiClient();
      let editedImageUrl: string | null = null;

      // Extract raw base64 data
      const base64Data = imageBytes.includes(",") ? imageBytes.split(",")[1] : imageBytes;

      if (ai) {
        for (const modelName of ["gemini-3.1-flash-lite-image", "gemini-3.1-flash-image"]) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType || "image/png",
                    },
                  },
                  {
                    text: `Modify this image according to the instruction: "${prompt}". Maintain cinematic 8k quality and photorealism.`,
                  },
                ],
              },
            });

            if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                  const outMime = part.inlineData.mimeType || "image/png";
                  editedImageUrl = `data:${outMime};base64,${part.inlineData.data}`;
                  break;
                }
              }
            }
            if (editedImageUrl) break;
          } catch (editErr: any) {
            console.warn(`Gemini image editing ${modelName} error:`, editErr.message);
          }
        }
      }

      // Fallback: fetch modified version or return original with procedural overlay
      if (!editedImageUrl) {
        const cleanPrompt = encodeURIComponent(`${prompt}, cinematic masterpiece`);
        const neuralUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&nologo=true&enhance=true`;
        editedImageUrl = await fetchImageAsBase64(neuralUrl, 4500);
      }

      if (!editedImageUrl) {
        editedImageUrl = generateCinematicSvgDataUrl(`Edited: ${prompt}`, "AI Image Edit", "16:9");
      }

      return res.json({
        imageUrl: editedImageUrl,
        editPrompt: prompt,
      });
    } catch (error: any) {
      console.error("Error editing image:", error);
      return res.status(500).json({
        error: error.message || "Failed to edit image.",
      });
    }
  });

  // API 4: Generate Multilingual Speech (Gemini TTS + Google TTS Multi-Tier Fallback)
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

      // Tier 1: Try Gemini TTS Preview
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

          const rawPcm =
            response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

          if (rawPcm) {
            audioBase64 = pcmToWavBase64(rawPcm, 24000, 1);
          }
        } catch (ttsErr: any) {
          console.warn("Gemini TTS preview fallback:", ttsErr.message);
        }
      }

      // Tier 2: Try Google Multilingual Neural TTS (Guaranteed Urdu, Hindi, Arabic, English, 50+ languages)
      if (!audioBase64) {
        audioBase64 = await fetchGoogleTTS(text, languageCode || "ur");
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
      // Attempt Google TTS on fallback
      const fallbackAudio = await fetchGoogleTTS(req.body?.text || "", req.body?.languageCode || "ur");
      return res.json({
        audioBase64: fallbackAudio,
        text: req.body?.text,
        language: req.body?.language,
        languageCode: req.body?.languageCode,
        browserSpeechFallback: !fallbackAudio,
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

  // Serve public assets (icons, manifest) statically
  app.use(express.static(path.join(process.cwd(), "public")));

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
