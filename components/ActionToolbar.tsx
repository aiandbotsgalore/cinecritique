/**
 * Action toolbar for project management and export functionality.
 * Provides buttons for PDF export, project save/load, and project management.
 * Includes modal for viewing and managing saved projects.
 * @module components/ActionToolbar
 */

import React, { useState } from 'react';
import { CritiqueAnalysis, ChatMessage, SavedProject } from '../types';
import { generatePDFReport } from '../utils/pdfExport';
import { saveProject, loadAllProjects, loadProject, deleteProject } from '../utils/storage';
import { FileDown, Save, FolderOpen, Trash2, Download } from 'lucide-react';
import logger from '../utils/logger';

/**
 * Props for the ActionToolbar component.
 */
interface Props {
  /** Current critique analysis (null if no analysis) */
  critique: CritiqueAnalysis | null;
  /** Name of the analyzed video file */
  videoName: string;
  /** Size of the video file in bytes */
  videoSize: number;
  /** Current chat message history */
  chatHistory: ChatMessage[];
  /** Callback when a saved project is loaded */
  onLoadProject: (project: SavedProject) => void;
}

/**
 * Toolbar providing actions for exporting PDF reports and managing saved projects.
 * Includes save, load, and delete functionality with localStorage persistence.
 *
 * @param {Props} props - Component props
 * @returns {JSX.Element} Rendered action toolbar
 *
 * @example
 * <ActionToolbar
 *   critique={analysis}
 *   videoName="video.mp4"
 *   videoSize={5242880}
 *   chatHistory={messages}
 *   onLoadProject={(project) => restoreProject(project)}
 * />
 */
const ActionToolbar: React.FC<Props> = ({ critique, videoName, videoSize, chatHistory, onLoadProject }) => {
  const [showSavedProjects, setShowSavedProjects] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  const handleExportPDF = async () => {
    if (!critique) return;

    try {
      await generatePDFReport(critique, videoName);
      logger.debug('PDF report generated successfully');
    } catch (error) {
      logger.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF report. Check console for details.');
    }
  };

  const handleSaveProject = () => {
    if (!critique) return;

    try {
      const projectId = saveProject(videoName, videoSize, critique, chatHistory);
      logger.debug(`Project saved with ID: ${projectId}`);
      alert('✓ Project saved successfully! You can reload it later.');
    } catch (error: any) {
      logger.error('Failed to save project:', error);
      alert(error.message || 'Failed to save project');
    }
  };

  const handleShowSavedProjects = () => {
    const projects = loadAllProjects();
    setSavedProjects(projects);
    setShowSavedProjects(true);
  };

  const handleLoadProjectClick = (projectId: string) => {
    const project = loadProject(projectId);
    if (project) {
      onLoadProject(project);
      setShowSavedProjects(false);
    }
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this saved project?')) {
      deleteProject(projectId);
      setSavedProjects(loadAllProjects());
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex gap-2">
      {critique && (
        <>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <FileDown size={16} />
            Export PDF
          </button>

          <button
            onClick={handleSaveProject}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            Save Project
          </button>
        </>
      )}

      <button
        onClick={handleShowSavedProjects}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
      >
        <FolderOpen size={16} />
        Load Project
      </button>

      {/* Saved Projects Modal */}
      {showSavedProjects && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Saved Projects</h2>
              <button
                onClick={() => setShowSavedProjects(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {savedProjects.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No saved projects yet</p>
                  <p className="text-sm mt-2">Analyze a video and save it to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleLoadProjectClick(project.id)}
                      className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">{project.videoName}</h3>
                          <div className="text-sm text-slate-400 space-y-1">
                            <div>Saved: {new Date(project.savedAt).toLocaleString()}</div>
                            <div>Size: {formatFileSize(project.videoSize)}</div>
                            <div>
                              {project.critique.timeline.length} issues • {project.chatHistory.length} chat messages
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionToolbar;
