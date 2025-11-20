
export interface TimelineEvent {
  timestamp: string; // "MM:SS" format
  seconds: number; // absolute seconds for sorting/graphing
  title: string;
  issue: string;
  reason: string;
  fix: string;
  nanoBananaPrompt: string;
  severity: number; // 1-10 scale for visualization
}

export interface CritiqueAnalysis {
  summary: {
    storytelling: string;
    editing: string;
    cinematography: string;
    musicIntegration: string;
    verdict: string;
  };
  timeline: TimelineEvent[];
}

export enum ChatRole {
  USER = 'user',
  MODEL = 'model',
}

export interface ChatMessage {
  role: ChatRole;
  text: string;
  id: string;
}

export interface VideoData {
  file: File;
  url: string;
  mimeType: string;
}

export enum GenerationMode {
  NEW_IMAGE = 'NEW_IMAGE',
  EDIT_FRAME = 'EDIT_FRAME',
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
