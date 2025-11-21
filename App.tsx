/**
 * CineCritique AI - Optimized App Component
 * Features: React.lazy, useMemo, useCallback, keyboard shortcuts, debug panel
 */
import React, { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { UploadCloud, Play, Pause, AlertCircle, CheckCircle2, ChevronRight, Maximize2, Film, Keyboard } from 'lucide-react';
import { VideoData, CritiqueAnalysis, TimelineEvent } from './types';
import { analyzeVideo, initChat } from './services/geminiService';
import { useKeyboardShortcuts, SHORTCUTS } from './hooks/useKeyboardShortcuts';

// Lazy load heavy components
const TimelineChart = lazy(() => import('./components/TimelineChart'));
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const ImageStudio = lazy(() => import('./components/ImageStudio'));
const VirtualizedTimeline = lazy(() => import('./components/VirtualizedTimeline'));
const DebugPanel = lazy(() => import('./components/DebugPanel'));

// Loading fallback component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <div className="w-8 h-8 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => {
  // State
  const [video, setVideo] = useState<VideoData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [critique, setCritique] = useState<CritiqueAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
  const [analysisStatus, setAnalysisStatus] = useState<string>('');

  // Video Player State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Studio State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Debug Panel State
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Memoized values
  const videoUrl = useMemo(() => video?.url, [video?.url]);
  const hasVideo = useMemo(() => !!video, [video]);
  const hasCritique = useMemo(() => !!critique, [critique]);

  // Handlers with useCallback
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const mimeType = file.type;
      setVideo({
        file,
        url: URL.createObjectURL(file),
        mimeType,
      });
      setCritique(null);
      setAnalysisStatus('');
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!video) return;
    setIsAnalyzing(true);
    setAnalysisStatus('Uploading video to Gemini...');

    try {
      const result = await analyzeVideo(video.file);

      setCritique(result);
      setAnalysisStatus('Initializing creative assistant...');

      await initChat(result);
      setAnalysisStatus('');
    } catch (error) {
      console.error(error);
      alert('Analysis failed. Please check the console for details.');
      setAnalysisStatus('Failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [video]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg');
    }
    return null;
  }, []);

  const jumpToTimestamp = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const jumpBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  }, []);

  const jumpForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + 5
      );
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const toggleTab = useCallback(() => {
    setActiveTab((prev) => (prev === 'overview' ? 'details' : 'overview'));
  }, []);

  const openStudio = useCallback((prompt: string, time: string, seconds: number) => {
    jumpToTimestamp(seconds);
    setTimeout(() => {
      setSelectedPrompt(prompt);
      setSelectedTime(time);
      setIsStudioOpen(true);
    }, 100);
  }, [jumpToTimestamp]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onAnalyze: runAnalysis,
    onTogglePlay: togglePlayPause,
    onOpenDebug: () => setIsDebugOpen((prev) => !prev),
    onJumpBackward: jumpBackward,
    onJumpForward: jumpForward,
    onToggleTab: toggleTab,
  });

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (video?.url) {
        URL.revokeObjectURL(video.url);
      }
    };
  }, [video?.url]);

  // --- UI Sections ---

  if (!hasVideo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-slate-900/60" />

        <div className="relative z-10 max-w-2xl w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-12 rounded-3xl shadow-2xl text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-900/30">
            <Film size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">CineCritique AI</h1>
          <p className="text-lg text-slate-300 mb-10 font-light">
            Professional music video analysis powered by AI
            <br />
            Get Director-level critique, visual timelines, and AI fix generation
          </p>

          <label className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-600 rounded-2xl hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-indigo-400 mb-3 transition-colors" />
              <p className="mb-2 text-sm text-slate-300">
                <span className="font-semibold text-indigo-400">Click to upload</span> or drag and
                drop
              </p>
              <p className="text-xs text-slate-500">
                Local caching enabled - re-analyzing saves costs
              </p>
            </div>
            <input type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
          </label>

          {/* Shortcuts hint */}
          <button
            onClick={() => setShowShortcuts((prev) => !prev)}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2 mx-auto"
          >
            <Keyboard size={14} />
            Keyboard Shortcuts
          </button>

          {showShortcuts && (
            <div className="mt-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-left">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-xs">
                {Object.entries(SHORTCUTS).map(([action, keys]) => (
                  <div key={action} className="flex justify-between text-slate-400">
                    <span className="capitalize">{action.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <code className="bg-slate-800 px-2 py-0.5 rounded">{keys}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Film size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-slate-100 tracking-tight">CineCritique AI</span>
        </div>
        <div className="flex gap-4">
          {!hasCritique && !isAnalyzing && (
            <button
              onClick={runAnalysis}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-full text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
            >
              <Play size={16} fill="currentColor" /> Start Analysis
            </button>
          )}
          {isAnalyzing && (
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-sm text-indigo-300">{analysisStatus || 'AI is analyzing...'}</span>
            </div>
          )}
          <button
            onClick={() => setIsDebugOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm transition-colors"
            title="Open Debug Panel (D)"
          >
            Debug
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Video & Timeline */}
        <div className="w-[60%] flex flex-col border-r border-slate-800 bg-slate-950 relative">
          {/* Video Player Container */}
          <div className="flex-1 relative flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              className="max-w-full max-h-full"
              controls
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>

          {/* Visual Timeline Graph */}
          {hasCritique && (
            <div className="h-1/3 bg-slate-900 border-t border-slate-800 p-6 overflow-hidden">
              <Suspense fallback={<LoadingSpinner />}>
                <TimelineChart data={critique.timeline} onSelect={jumpToTimestamp} />
              </Suspense>
            </div>
          )}
        </div>

        {/* Right Column: Data & Chat */}
        <div className="w-[40%] flex flex-col bg-slate-900">
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'overview' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Critique & Overview
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'details' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Details & Fixes
              {activeTab === 'details' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto relative">
            {!hasCritique ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                {isAnalyzing ? (
                  <>
                    <div className="w-16 h-16 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin mb-6" />
                    <p className="text-lg font-medium text-slate-300">Analyzing Frame by Frame</p>
                    <p className="text-sm mt-2">{analysisStatus}</p>
                  </>
                ) : (
                  <>
                    <AlertCircle size={48} className="mb-4 opacity-50" />
                    <p>Upload a video and start analysis to see the critique.</p>
                  </>
                )}
              </div>
            ) : (
              <Suspense fallback={<LoadingSpinner />}>
                {activeTab === 'overview' && (
                  <div className="p-6 space-y-8">
                    <div className="space-y-6">
                      <Section title="Verdict" content={critique.summary.verdict} highlight />
                      <Section title="Storytelling" content={critique.summary.storytelling} />
                      <Section title="Editing & Rhythm" content={critique.summary.editing} />
                      <Section
                        title="Cinematography"
                        content={critique.summary.cinematography}
                      />
                      <Section
                        title="Music Integration"
                        content={critique.summary.musicIntegration}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="p-4">
                    <VirtualizedTimeline events={critique.timeline} onOpenStudio={openStudio} />
                  </div>
                )}
              </Suspense>
            )}
          </div>

          {/* Chatbot Widget (Fixed at bottom of right column) */}
          <div className="h-[40%] border-t border-slate-800 p-4 bg-slate-950">
            <Suspense fallback={<LoadingSpinner />}>
              <ChatInterface initialMessages={[]} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Image Studio Modal */}
      <Suspense fallback={null}>
        <ImageStudio
          isOpen={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          initialPrompt={selectedPrompt}
          referenceTime={selectedTime}
          getVideoFrame={captureFrame}
        />
      </Suspense>

      {/* Debug Panel */}
      <Suspense fallback={null}>
        <DebugPanel isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
      </Suspense>
    </div>
  );
};

const Section: React.FC<{ title: string; content: string; highlight?: boolean }> = ({
  title,
  content,
  highlight,
}) => (
  <div
    className={
      highlight
        ? 'bg-gradient-to-br from-indigo-900/30 to-purple-900/30 p-5 rounded-xl border border-indigo-500/30'
        : ''
    }
  >
    <h3
      className={`text-sm font-bold uppercase tracking-wider mb-2 ${
        highlight ? 'text-indigo-400' : 'text-slate-500'
      }`}
    >
      {title}
    </h3>
    <p className="text-slate-200 leading-relaxed text-sm">{content}</p>
  </div>
);

export default App;
