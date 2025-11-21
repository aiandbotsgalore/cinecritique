
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { CritiqueAnalysis, TimelineEvent, AspectRatio } from "../types";
import logger from "../utils/logger";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Analysis Service ---

export const analyzeVideo = async (
  file: File,
  onProgress?: (status: string) => void
): Promise<CritiqueAnalysis> => {
  const ai = getAI();
  
  // 1. Upload the file using the File API
  logger.debug("Uploading file...", file.name);
  
  try {
    const uploadResult = await ai.files.upload({
      file: file,
      config: { 
        mimeType: file.type || "video/mp4",
        displayName: file.name
      },
    });

    // Handle cases where SDK returns the file object directly or wrapped in { file: ... }
    const fileData = (uploadResult as any).file ?? uploadResult;

    if (!fileData || !fileData.name || !fileData.uri) {
      logger.error("Upload Result:", JSON.stringify(uploadResult, null, 2));
      throw new Error("File upload failed: No valid file metadata returned.");
    }

    const fileName = fileData.name;
    const fileUri = fileData.uri;
    logger.debug(`File uploaded: ${fileName} (${fileUri})`);

    // 2. Poll for processing completion with exponential backoff
    let fileState = fileData.state;
    let pollInterval = 2000; // Start with 2 seconds
    const maxInterval = 10000; // Max 10 seconds
    let attempts = 0;
    const maxAttempts = 40; // ~5 minutes max (with exponential backoff)

    while (fileState === "PROCESSING") {
      const statusMessage = `Processing video... (attempt ${attempts + 1})`;
      logger.debug(statusMessage);
      onProgress?.(statusMessage);

      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const fileStatus = await ai.files.get({ name: fileName });

      // Handle potential wrapper
      const currentFile = (fileStatus as any).file ?? fileStatus;

      if (!currentFile || !currentFile.state) {
         logger.error("File Status Response:", JSON.stringify(fileStatus, null, 2));
         throw new Error("Failed to check file status: Response missing file state.");
      }

      fileState = currentFile.state;
      if (fileState === "FAILED") {
        throw new Error("Video processing failed on the server.");
      }

      // Exponential backoff: increase poll interval up to max
      pollInterval = Math.min(pollInterval * 1.5, maxInterval);
      attempts++;

      if (attempts >= maxAttempts) {
        throw new Error("Processing timeout - video may be too large or processing failed.");
      }
    }

    logger.debug("File processing complete. Generating critique...");
    onProgress?.("Generating critique...");

    // Schema definition for structured output
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.OBJECT,
          properties: {
            storytelling: { type: Type.STRING },
            editing: { type: Type.STRING },
            cinematography: { type: Type.STRING },
            musicIntegration: { type: Type.STRING },
            verdict: { type: Type.STRING },
          },
          required: ["storytelling", "editing", "cinematography", "musicIntegration", "verdict"],
        },
        timeline: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timestamp: { type: Type.STRING, description: "MM:SS format" },
              seconds: { type: Type.NUMBER, description: "Absolute seconds" },
              title: { type: Type.STRING },
              issue: { type: Type.STRING },
              reason: { type: Type.STRING },
              fix: { type: Type.STRING },
              nanoBananaPrompt: { type: Type.STRING, description: "A specific prompt for an AI image generator to visualize the fix" },
              severity: { type: Type.NUMBER, description: "Severity of issue 1-10" },
            },
            required: ["timestamp", "seconds", "title", "issue", "reason", "fix", "nanoBananaPrompt", "severity"],
          },
        },
      },
      required: ["summary", "timeline"],
    };

    const prompt = `
      Act as a world-class film critic, editor, and cinematographer.
      Analyze this music video frame by frame.
      
      Provide a professional critique covering:
      1. Storytelling & Concept
      2. Editing Rhythm & Pacing
      3. Cinematography & Lighting
      4. Music Integration
      
      Then, identify specific weak moments. For each moment, provide a "Nano Banana Prompt" - a highly descriptive prompt that could be used to generate a concept image of how that shot SHOULD look.
      
      Be harsh but constructive.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { 
            fileData: {
              mimeType: file.type || "video/mp4",
              fileUri: fileUri,
            }
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 2048 } // Enable thinking for deeper analysis
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as CritiqueAnalysis;
    }
    throw new Error("No analysis generated.");
  } catch (error) {
    logger.error("Analysis failed:", error);
    throw error;
  }
};

// --- Chat Service ---

let chatSession: ReturnType<ReturnType<typeof getAI>['chats']['create']> | null = null;

export const initChat = async (analysis: CritiqueAnalysis) => {
  const ai = getAI();
  const systemInstruction = `
    You are an expert Creative Director and Cinematographer assistant.
    You have just analyzed a music video.
    Here is the analysis data you generated:
    ${JSON.stringify(analysis)}
    
    Your goal is to help the user improve their video.
    - Answer questions about specific timestamps.
    - Explain technical cinematography terms.
    - Help brainstorm specific shots or editing tricks.
    - Be encouraging but honest.
    - If the user asks for a prompt, refine the one from the analysis.
  `;

  chatSession = ai.chats.create({
    model: "gemini-3-pro-preview",
    config: {
      systemInstruction,
    },
  });
};

export const sendMessage = async (message: string): Promise<string> => {
  if (!chatSession) throw new Error("Chat not initialized");
  
  const result = await chatSession.sendMessage({ message });
  return result.text || "I couldn't generate a response.";
};

// --- Image Generation Service (Imagen 4) ---

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) throw new Error("No image generated");

    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    logger.error("Image gen failed:", error);
    throw error;
  }
};

// --- Image Editing Service (Gemini 2.5 Flash Image) ---

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getAI();
  
  // Strip prefix if present for API
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    // Using generateContent with responseModalities for image output
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseModalities: ["IMAGE"],
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No edited image returned");
  } catch (error) {
    logger.error("Image edit failed:", error);
    throw error;
  }
};
