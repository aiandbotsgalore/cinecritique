/**
 * Project persistence utilities using browser localStorage.
 * Manages saving, loading, and deleting video critique projects for continuity across sessions.
 * Implements storage quota management and automatic cleanup.
 * @module utils/storage
 */

import { SavedProject, CritiqueAnalysis, ChatMessage } from '../types';
import logger from './logger';

/** Storage key used for localStorage persistence */
const STORAGE_KEY = 'cinecritique_projects';

/** Maximum number of projects to keep (prevents localStorage quota issues) */
const MAX_PROJECTS = 10;

/**
 * Saves a video critique project to localStorage.
 * Automatically manages storage quota by limiting to MAX_PROJECTS and handling quota exceeded errors.
 * If storage quota is exceeded, attempts to save without chat history as fallback.
 *
 * @param {string} videoName - Name of the analyzed video file
 * @param {number} videoSize - Size of the video file in bytes
 * @param {CritiqueAnalysis} critique - The complete critique analysis
 * @param {ChatMessage[]} chatHistory - Array of chat messages from the conversation
 * @returns {string} The unique project ID of the saved project
 * @throws {Error} If storage fails even after fallback attempts
 *
 * @example
 * const projectId = saveProject(
 *   'my-video.mp4',
 *   5242880,
 *   critiqueData,
 *   chatMessages
 * );
 * console.log(`Project saved with ID: ${projectId}`);
 */
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

/**
 * Loads all saved projects from localStorage.
 * Automatically deserializes Date objects and handles parsing errors gracefully.
 *
 * @returns {SavedProject[]} Array of all saved projects, ordered by most recent first
 *
 * @example
 * const projects = loadAllProjects();
 * console.log(`Found ${projects.length} saved projects`);
 */
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

/**
 * Loads a specific project by its ID.
 *
 * @param {string} projectId - The unique identifier of the project to load
 * @returns {SavedProject | null} The saved project, or null if not found
 *
 * @example
 * const project = loadProject('project_1234567890');
 * if (project) {
 *   console.log(`Loaded project: ${project.name}`);
 * }
 */
export const loadProject = (projectId: string): SavedProject | null => {
  const projects = loadAllProjects();
  return projects.find(p => p.id === projectId) || null;
};

/**
 * Deletes a specific project from localStorage.
 *
 * @param {string} projectId - The unique identifier of the project to delete
 *
 * @example
 * deleteProject('project_1234567890');
 */
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

/**
 * Clears all saved projects from localStorage.
 * This operation cannot be undone.
 *
 * @example
 * clearAllProjects();
 */
export const clearAllProjects = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.debug('All projects cleared');
  } catch (error) {
    logger.error('Failed to clear projects:', error);
  }
};

/**
 * Calculates current localStorage usage for saved projects.
 * Useful for displaying storage warnings to users.
 *
 * @returns {{ used: number; total: number; percentage: number }} Storage usage statistics
 * @returns {number} used - Bytes used by saved projects
 * @returns {number} total - Estimated total localStorage capacity (~5MB typical)
 * @returns {number} percentage - Percentage of storage used (0-100)
 *
 * @example
 * const { used, total, percentage } = getStorageUsage();
 * console.log(`Using ${percentage}% of storage (${used}/${total} bytes)`);
 */
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
