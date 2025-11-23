/**
 * Type definitions for CineCritique AI - A video critique analysis tool
 * @module types
 */

/**
 * Represents a specific issue or observation at a point in the video timeline.
 * Used to track editing, cinematography, and narrative issues throughout the video.
 */
export interface TimelineEvent {
  /** Timestamp in MM:SS format for display purposes */
  timestamp: string;
  /** Absolute timestamp in seconds for sorting and graphing */
  seconds: number;
  /** Brief title summarizing the issue or observation */
  title: string;
  /** Detailed description of the identified issue */
  issue: string;
  /** Explanation of why this is problematic */
  reason: string;
  /** Suggested correction or improvement */
  fix: string;
  /** AI prompt to regenerate/improve this specific moment */
  nanoBananaPrompt: string;
  /** Severity rating on a scale of 1-10 for visualization and prioritization */
  severity: number;
}

/**
 * Represents a single shot in the video's shot-by-shot breakdown.
 * Contains detailed cinematographic analysis including framing, movement, and composition.
 */
export interface Shot {
  /** Sequential shot number starting from 1 */
  shotNumber: number;
  /** Shot start time in MM:SS format */
  startTime: string;
  /** Shot end time in MM:SS format */
  endTime: string;
  /** Shot start time in absolute seconds */
  startSeconds: number;
  /** Shot end time in absolute seconds */
  endSeconds: number;
  /** Camera framing type (e.g., Wide, Medium, Close-up) */
  shotType: 'Wide' | 'Medium' | 'Close-up' | 'Extreme Close-up' | 'POV' | 'Over-the-Shoulder';
  /** Type of camera movement used in the shot */
  movement: 'Static' | 'Pan' | 'Tilt' | 'Dolly' | 'Handheld' | 'Steadicam' | 'Crane';
  /** Narrative description of what happens in this shot */
  description: string;
  /** Analysis of the lighting setup and mood */
  lighting: string;
  /** Analysis of the shot's visual composition and framing */
  composition: string;
}

/**
 * Represents a detected beat marker in the audio track.
 * Used for music synchronization analysis.
 */
export interface BeatMarker {
  /** Time position of the beat in seconds */
  time: number;
  /** Strength/intensity of the beat from 0 to 1 */
  strength: number;
  /** Whether there is a video cut aligned with this beat */
  onBeat: boolean;
}

/**
 * Analysis of how well the video editing synchronizes with the music beats.
 * Includes BPM detection, beat markers, and synchronization scoring.
 */
export interface MusicSyncAnalysis {
  /** Detected beats per minute of the audio track */
  bpm: number;
  /** Array of all detected beat markers in the audio */
  beatMarkers: BeatMarker[];
  /** Overall synchronization quality score from 0 to 100 */
  syncScore: number;
  /** Array of suggestions for improving music synchronization */
  suggestions: string[];
  /** List of cuts that are not aligned with beats */
  offBeatCuts: { timestamp: string; offset: number }[];
}

/**
 * Represents a match between the video's style and a famous director's signature style.
 * Used for director style analysis feature.
 */
export interface DirectorStyleMatch {
  /** Name of the matched director */
  director: string;
  /** Percentage match score (0-100) */
  percentage: number;
  /** List of specific stylistic characteristics that match this director */
  characteristics: string[];
}

/**
 * Complete critique analysis result from Gemini AI.
 * Contains all analysis data including summary, timeline, and advanced features.
 */
export interface CritiqueAnalysis {
  /** High-level summary of different aspects of the video */
  summary: {
    /** Analysis of narrative and story structure */
    storytelling: string;
    /** Analysis of editing techniques and pacing */
    editing: string;
    /** Analysis of camera work and visual composition */
    cinematography: string;
    /** Analysis of how music enhances the video */
    musicIntegration: string;
    /** Overall verdict and rating */
    verdict: string;
  };
  /** Array of specific issues and observations on the timeline */
  timeline: TimelineEvent[];
  /** Optional shot-by-shot cinematographic breakdown */
  shots?: Shot[];
  /** Optional music synchronization analysis */
  musicSync?: MusicSyncAnalysis;
  /** Optional director style matching results */
  directorStyle?: DirectorStyleMatch[];
  /** Optional comparison with provided reference videos/images */
  styleComparison?: string;
}

/**
 * Enum representing the role of a message sender in the chat interface.
 */
export enum ChatRole {
  /** Message from the user */
  USER = 'user',
  /** Message from the AI model */
  MODEL = 'model',
}

/**
 * Represents a single message in the chat conversation.
 * Used for the interactive Q&A feature after analysis.
 */
export interface ChatMessage {
  /** Role of the message sender (user or model) */
  role: ChatRole;
  /** Text content of the message */
  text: string;
  /** Unique identifier for the message */
  id: string;
}

/**
 * Contains video file data and metadata.
 * Wraps the File object with additional video-specific information.
 */
export interface VideoData {
  /** The actual video File object */
  file: File;
  /** Object URL for previewing the video in the browser */
  url: string;
  /** MIME type of the video file */
  mimeType: string;
}

/**
 * Enum representing different image generation modes.
 * Used for AI-powered image generation features.
 */
export enum GenerationMode {
  /** Generate a completely new image */
  NEW_IMAGE = 'NEW_IMAGE',
  /** Edit a specific frame from the video */
  EDIT_FRAME = 'EDIT_FRAME',
}

/**
 * Union type of supported aspect ratios for image generation.
 */
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

/**
 * Represents a saved project that can be persisted and loaded later.
 * Stored in localStorage for project continuity across sessions.
 */
export interface SavedProject {
  /** Unique identifier for the saved project */
  id: string;
  /** User-defined name for the project */
  name: string;
  /** Original filename of the analyzed video */
  videoName: string;
  /** File size of the video in bytes */
  videoSize: number;
  /** Timestamp when the project was saved */
  savedAt: Date;
  /** Complete critique analysis results */
  critique: CritiqueAnalysis;
  /** Full chat conversation history */
  chatHistory: ChatMessage[];
}

/**
 * Video color correction and effects parameters.
 * Used for WebGL-based real-time video effects preview.
 */
export interface VideoEffects {
  /** Brightness adjustment from -1 (darker) to 1 (brighter) */
  brightness: number;
  /** Contrast adjustment from -1 (less) to 1 (more) */
  contrast: number;
  /** Color saturation from -1 (desaturated) to 1 (oversaturated) */
  saturation: number;
  /** Color temperature from -1 (cool/blue) to 1 (warm/orange) */
  temperature: number;
  /** Color tint from -1 (green) to 1 (magenta) */
  tint: number;
  /** Exposure adjustment from -1 (underexposed) to 1 (overexposed) */
  exposure: number;
}
