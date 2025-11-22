
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

export interface Shot {
  shotNumber: number;
  startTime: string; // "MM:SS"
  endTime: string; // "MM:SS"
  startSeconds: number;
  endSeconds: number;
  shotType: 'Wide' | 'Medium' | 'Close-up' | 'Extreme Close-up' | 'POV' | 'Over-the-Shoulder';
  movement: 'Static' | 'Pan' | 'Tilt' | 'Dolly' | 'Handheld' | 'Steadicam' | 'Crane';
  description: string;
  lighting: string;
  composition: string;
}

export interface BeatMarker {
  time: number; // seconds
  strength: number; // 0-1
  onBeat: boolean; // is there a cut near this beat?
}

export interface MusicSyncAnalysis {
  bpm: number;
  beatMarkers: BeatMarker[];
  syncScore: number; // 0-100
  suggestions: string[];
  offBeatCuts: { timestamp: string; offset: number }[];
}

export interface DirectorStyleMatch {
  director: string;
  percentage: number;
  characteristics: string[];
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
  shots?: Shot[]; // Shot-by-shot breakdown
  musicSync?: MusicSyncAnalysis; // Music sync analysis
  directorStyle?: DirectorStyleMatch[]; // Director style matches
  styleComparison?: string; // Comparison with reference if provided
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

export interface SavedProject {
  id: string;
  name: string;
  videoName: string;
  videoSize: number;
  savedAt: Date;
  critique: CritiqueAnalysis;
  chatHistory: ChatMessage[];
}

export interface VideoEffects {
  brightness: number; // -1 to 1
  contrast: number; // -1 to 1
  saturation: number; // -1 to 1
  temperature: number; // -1 to 1 (warm/cool)
  tint: number; // -1 to 1 (green/magenta)
  exposure: number; // -1 to 1
}
