import { SavedProject, CritiqueAnalysis, ChatMessage } from '../types';
import logger from './logger';

const STORAGE_KEY = 'cinecritique_projects';
const MAX_PROJECTS = 10; // Limit to prevent localStorage quota issues

export const saveProject = (
  videoName: string,
  videoSize: number,
  critique: CritiqueAnalysis,
  chatHistory: ChatMessage[]
): string => {
  try {
    const projects = loadAllProjects();
    const projectId = `project_${Date.now()}`;

    const newProject: SavedProject = {
      id: projectId,
      name: videoName,
      videoName,
      videoSize,
      savedAt: new Date(),
      critique,
      chatHistory,
    };

    // Add new project to beginning of array
    projects.unshift(newProject);

    // Keep only the most recent MAX_PROJECTS
    const limitedProjects = projects.slice(0, MAX_PROJECTS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedProjects));
    logger.debug(`Project saved: ${projectId}`);

    return projectId;
  } catch (error) {
    logger.error('Failed to save project:', error);
    // Check if quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Try to save without chat history
      try {
        const projects = loadAllProjects();
        const projectId = `project_${Date.now()}`;

        const newProject: SavedProject = {
          id: projectId,
          name: videoName,
          videoName,
          videoSize,
          savedAt: new Date(),
          critique,
          chatHistory: [], // Skip chat history to save space
        };

        projects.unshift(newProject);
        const limitedProjects = projects.slice(0, MAX_PROJECTS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedProjects));

        logger.warn('Project saved without chat history due to storage limits');
        return projectId;
      } catch (retryError) {
        logger.error('Failed to save even without chat history:', retryError);
        throw new Error('Storage quota exceeded. Please delete old projects.');
      }
    }
    throw error;
  }
};

export const loadAllProjects = (): SavedProject[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const projects = JSON.parse(stored);

    // Convert savedAt strings back to Date objects
    return projects.map((p: any) => ({
      ...p,
      savedAt: new Date(p.savedAt),
    }));
  } catch (error) {
    logger.error('Failed to load projects:', error);
    return [];
  }
};

export const loadProject = (projectId: string): SavedProject | null => {
  const projects = loadAllProjects();
  return projects.find(p => p.id === projectId) || null;
};

export const deleteProject = (projectId: string): void => {
  try {
    const projects = loadAllProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    logger.debug(`Project deleted: ${projectId}`);
  } catch (error) {
    logger.error('Failed to delete project:', error);
  }
};

export const clearAllProjects = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.debug('All projects cleared');
  } catch (error) {
    logger.error('Failed to clear projects:', error);
  }
};

export const getStorageUsage = (): { used: number; total: number; percentage: number } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const usedBytes = new Blob([stored || '']).size;
    const totalBytes = 5 * 1024 * 1024; // ~5MB typical limit

    return {
      used: usedBytes,
      total: totalBytes,
      percentage: Math.round((usedBytes / totalBytes) * 100),
    };
  } catch (error) {
    logger.error('Failed to calculate storage usage:', error);
    return { used: 0, total: 0, percentage: 0 };
  }
};
