import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GoogleGenAI } from '@google/genai';
import { CritiqueAnalysis } from '../types';

interface GeminiContextType {
  analysis: CritiqueAnalysis | null;
  chatSession: any; // Type from @google/genai Chat class - using any to avoid complex type inference
  initChat: (analysis: CritiqueAnalysis) => Promise<void>;
  sendMessage: (message: string) => Promise<string>;
  reset: () => void;
}

const GeminiContext = createContext<GeminiContextType | undefined>(undefined);

export const GeminiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [analysis, setAnalysis] = useState<CritiqueAnalysis | null>(null);
  const [chatSession, setChatSession] = useState<any>(null);

  const initChat = async (newAnalysis: CritiqueAnalysis) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `
      You are an expert Creative Director and Cinematographer assistant.
      You have just analyzed a music video.
      Here is the analysis data you generated:
      ${JSON.stringify(newAnalysis)}

      Your goal is to help the user improve their video.
      - Answer questions about specific timestamps.
      - Explain technical cinematography terms.
      - Help brainstorm specific shots or editing tricks.
      - Be encouraging but honest.
      - If the user asks for a prompt, refine the one from the analysis.
    `;

    const session = ai.chats.create({
      model: "gemini-3-pro-preview",
      config: {
        systemInstruction,
      },
    });

    setAnalysis(newAnalysis);
    setChatSession(session);
  };

  const sendMessage = async (message: string): Promise<string> => {
    if (!chatSession) {
      throw new Error("Chat not initialized. Please analyze a video first.");
    }

    const result = await chatSession.sendMessage({ message });
    return result.text || "I couldn't generate a response.";
  };

  const reset = () => {
    setAnalysis(null);
    setChatSession(null);
  };

  return (
    <GeminiContext.Provider value={{ analysis, chatSession, initChat, sendMessage, reset }}>
      {children}
    </GeminiContext.Provider>
  );
};

export const useGemini = () => {
  const context = useContext(GeminiContext);
  if (!context) {
    throw new Error('useGemini must be used within GeminiProvider');
  }
  return context;
};
