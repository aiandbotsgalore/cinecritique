/**
 * Backend API Client
 * Communicates with Python FastAPI backend
 */

import { CritiqueAnalysis, AspectRatio } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface AnalyzeVideoOptions {
  useCache?: boolean;
  forceLocal?: boolean;
  extractAudio?: boolean;
  frameInterval?: number;
}

interface AnalyzeResponse {
  analysis: CritiqueAnalysis;
  cached: boolean;
  provider?: string;
  cost?: number;
  features?: {
    audio_analyzed: boolean;
    frames_sampled: number;
    scenes_detected: number;
  };
  cost_saved?: number;
}

interface ChatResponse {
  message: string;
  provider: string;
  cost: number;
}

interface ImageGenerationResponse {
  image: string;
  provider: string;
  cost: number;
}

interface CostReport {
  total_cost: number;
  breakdown: Record<string, number>;
  api_calls: number;
  cache_hits: number;
  cache_hit_rate: number;
  costs_saved: number;
  net_cost: number;
}

class BackendClient {
  private baseUrl: string;
  private isBackendAvailable: boolean = false;

  constructor() {
    this.baseUrl = BACKEND_URL;
    this.checkHealth();
  }

  /**
   * Check if backend is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        this.isBackendAvailable = data.status === 'healthy';
        console.log('[Backend] Health check:', data);
        return this.isBackendAvailable;
      }
      return false;
    } catch (error) {
      console.warn('[Backend] Not available:', error);
      this.isBackendAvailable = false;
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isBackendAvailable;
  }

  /**
   * Analyze video via backend
   */
  async analyzeVideo(
    file: File,
    options: AnalyzeVideoOptions = {}
  ): Promise<AnalyzeResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams({
      use_cache: String(options.useCache ?? true),
      force_local: String(options.forceLocal ?? false),
    });

    const response = await fetch(`${this.baseUrl}/api/analyze?${params}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Backend analysis failed');
    }

    return await response.json();
  }

  /**
   * Send chat message via backend
   */
  async chat(
    message: string,
    analysisId?: string,
    useLocal: boolean = false
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        analysis_id: analysisId,
        use_local: useLocal
      })
    });

    if (!response.ok) {
      throw new Error('Chat request failed');
    }

    return await response.json();
  }

  /**
   * Generate image via backend
   */
  async generateImage(
    prompt: string,
    aspectRatio: AspectRatio,
    useLocal: boolean = false
  ): Promise<ImageGenerationResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspect_ratio: aspectRatio,
        use_local: useLocal
      })
    });

    if (!response.ok) {
      throw new Error('Image generation failed');
    }

    return await response.json();
  }

  /**
   * Get cost report
   */
  async getCostReport(): Promise<CostReport> {
    const response = await fetch(`${this.baseUrl}/api/costs`);
    if (!response.ok) {
      throw new Error('Failed to fetch cost report');
    }
    return await response.json();
  }

  /**
   * Reset costs
   */
  async resetCosts(): Promise<void> {
    await fetch(`${this.baseUrl}/api/costs/reset`, { method: 'POST' });
  }

  /**
   * Get cache stats
   */
  async getCacheStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/cache/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch cache stats');
    }
    return await response.json();
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await fetch(`${this.baseUrl}/api/cache/clear`, { method: 'POST' });
  }
}

export const backendClient = new BackendClient();
