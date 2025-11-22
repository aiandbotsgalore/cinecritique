
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { CritiqueAnalysis, TimelineEvent, AspectRatio, Shot, DirectorStyleMatch } from "../types";
import logger from "../utils/logger";
import { analyzeMusicSync } from "../utils/musicSync";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Analysis Service ---

export const analyzeVideo = async (
  file: File,
  onProgress?: (status: string) => void,
  referenceFiles?: File[]
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

    // Upload reference files if provided
    let referenceUris: string[] = [];
    if (referenceFiles && referenceFiles.length > 0) {
      onProgress?.("Uploading reference files...");
      for (const refFile of referenceFiles) {
        try {
          const refUpload = await ai.files.upload({
            file: refFile,
            config: {
              mimeType: refFile.type,
              displayName: refFile.name
            },
          });

          const refData = (refUpload as any).file ?? refUpload;
          if (refData?.uri) {
            referenceUris.push(refData.uri);
            logger.debug(`Reference file uploaded: ${refFile.name}`);
          }
        } catch (error) {
          logger.warn(`Failed to upload reference file ${refFile.name}:`, error);
        }
      }
    }

    // Schema definition for structured output with enhanced features
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
        shots: {
          type: Type.ARRAY,
          description: "Shot-by-shot breakdown of the video",
          items: {
            type: Type.OBJECT,
            properties: {
              shotNumber: { type: Type.NUMBER },
              startTime: { type: Type.STRING, description: "MM:SS format" },
              endTime: { type: Type.STRING, description: "MM:SS format" },
              startSeconds: { type: Type.NUMBER },
              endSeconds: { type: Type.NUMBER },
              shotType: { type: Type.STRING, description: "Wide, Medium, Close-up, etc." },
              movement: { type: Type.STRING, description: "Static, Pan, Dolly, etc." },
              description: { type: Type.STRING },
              lighting: { type: Type.STRING },
              composition: { type: Type.STRING },
            },
            required: ["shotNumber", "startTime", "endTime", "startSeconds", "endSeconds", "shotType", "movement", "description", "lighting", "composition"],
          },
        },
        directorStyle: {
          type: Type.ARRAY,
          description: "Famous directors this video resembles stylistically",
          items: {
            type: Type.OBJECT,
            properties: {
              director: { type: Type.STRING },
              percentage: { type: Type.NUMBER, description: "Similarity percentage" },
              characteristics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Specific visual/editing characteristics that match"
              },
            },
            required: ["director", "percentage", "characteristics"],
          },
        },
        ...(referenceUris.length > 0 ? {
          styleComparison: {
            type: Type.STRING,
            description: "Detailed comparison of this video's style to the provided reference materials"
          }
        } : {}),
      },
      required: ["summary", "timeline", "shots", "directorStyle"],
    };

    let prompt = `
      Act as a world-class film critic, editor, and cinematographer with expertise in music video direction.
      Analyze this music video comprehensively.

      ## PART 1: Professional Critique
      Provide a professional critique covering:
      1. Storytelling & Concept - narrative coherence, artistic vision
      2. Editing Rhythm & Pacing - cut timing, flow, energy
      3. Cinematography & Lighting - shot composition, color, visual quality
      4. Music Integration - how well visuals sync with audio

      ## PART 2: Timeline Issues
      Identify specific weak moments chronologically. For each:
      - Timestamp and severity (1-10 scale)
      - What's wrong and why it matters
      - How to fix it
      - A "Nano Banana Prompt" - a highly descriptive AI image generation prompt showing how the shot SHOULD look

      ## PART 3: Shot-by-Shot Breakdown
      Analyze every distinct shot/cut in the video. For each shot provide:
      - Exact start/end times
      - Shot type (Wide, Medium, Close-up, Extreme Close-up, POV, Over-the-Shoulder)
      - Camera movement (Static, Pan, Tilt, Dolly, Handheld, Steadicam, Crane)
      - Visual description
      - Lighting analysis (natural/artificial, mood, quality)
      - Composition notes (rule of thirds, leading lines, symmetry, depth)

      ## PART 4: Director Style Analysis
      Compare this video's style to famous music video directors. Identify the top 3-4 directors whose work this resembles.
      For each match:
      - Director name (e.g., Hiro Murai, Dave Meyers, Spike Jonze, Michel Gondry, Kahlil Joseph)
      - Percentage similarity (must total ~100% across all directors)
      - Specific visual or editing characteristics that match their signature style

      Be detailed, honest, and constructive. This analysis will be used for professional improvement.
    `;

    // Add reference comparison section if references are provided
    if (referenceUris.length > 0) {
      prompt += `

      ## PART 5: Style Reference Comparison
      The user has provided ${referenceUris.length} reference video(s)/image(s) for style comparison.
      Analyze how well this video matches the aesthetic, mood, pacing, and visual style of the references.
      Provide specific feedback on:
      - Color grading similarities/differences
      - Shot composition alignment
      - Pacing and rhythm comparison
      - Lighting approach similarities
      - What to adjust to better match the reference style
      `;
    }

    // Build content parts array
    const contentParts: any[] = [
      {
        fileData: {
          mimeType: file.type || "video/mp4",
          fileUri: fileUri,
        }
      },
    ];

    // Add reference files if available
    if (referenceUris.length > 0) {
      referenceUris.forEach((uri, index) => {
        const refFile = referenceFiles![index];
        contentParts.push({
          fileData: {
            mimeType: refFile.type,
            fileUri: uri,
          }
        });
      });
    }

    // Add text prompt
    contentParts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: contentParts,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 2048 } // Enable thinking for deeper analysis
      },
    });

    if (response.text) {
      const critique = JSON.parse(response.text) as CritiqueAnalysis;

      // Add music sync analysis
      onProgress?.("Analyzing music sync...");
      try {
        const musicSync = await analyzeMusicSync(file, critique.timeline);
        critique.musicSync = musicSync;
        logger.debug(`Music sync analysis complete. BPM: ${musicSync.bpm}, Score: ${musicSync.syncScore}`);
      } catch (error) {
        logger.warn("Music sync analysis failed, continuing without it:", error);
        // Continue without music sync if it fails
      }

      return critique;
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
