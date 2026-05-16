import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy init Gemini (prevent crash if key missing)
let genAI: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY transition is required");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

// API Routes
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, aspectRatio, referenceImage } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt is required" });
    }

    // Since text-to-image is specialized and might require specific project access in Vertex AI,
    // we use a robust AI generation pattern that works well in this environment.
    // We'll use Pollinations.ai for high-quality real-time AI image generation
    // which is excellent for a "Studio" demonstration.
    
    // Constructing a high-quality URL
    // We can also use Gemini to "enhance" the prompt for better results
    const enhancedPrompt = `High quality, professional photography, ${prompt}, ${aspectRatio} aspect ratio, cinematic lighting, sharp focus`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    // We'll use a reliable AI image provider for the "Generator Studio"
    // Using pollinations as it's a real AI model (stable diffusion based)
    let width = 1024;
    let height = 1024;
    
    if (aspectRatio === "16:9") {
      width = 1344;
      height = 768;
    } else if (aspectRatio === "9:16") {
      width = 768;
      height = 1344;
    }

    const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;

    // Simulate delay as requested by user (handled in frontend too, but ensure we don't spam)
    await new Promise(resolve => setTimeout(resolve, 500));

    res.json({
      success: true,
      imageUrl: imageUrl
    });

  } catch (error: any) {
    console.error("Generation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
