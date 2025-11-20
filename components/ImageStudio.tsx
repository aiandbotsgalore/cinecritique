import React, { useState } from 'react';
import { X, Wand2, Image as ImageIcon, Loader2, Layers, Sparkles } from 'lucide-react';
import { AspectRatio, GenerationMode } from '../types';
import { generateImage, editImage } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
  referenceTime?: string;
  getVideoFrame?: () => string | null; // Function to get current video frame base64
}

const ImageStudio: React.FC<Props> = ({ isOpen, onClose, initialPrompt, referenceTime, getVideoFrame }) => {
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.NEW_IMAGE);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update prompt when initialPrompt changes
  React.useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      if (mode === GenerationMode.NEW_IMAGE) {
        const imgUrl = await generateImage(prompt, aspectRatio);
        setResultImage(imgUrl);
      } else if (mode === GenerationMode.EDIT_FRAME) {
        const frame = getVideoFrame ? getVideoFrame() : null;
        if (!frame) {
          throw new Error("Could not capture video frame. Ensure video is loaded.");
        }
        const imgUrl = await editImage(frame, prompt);
        setResultImage(imgUrl);
      }
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-5xl h-[90vh] rounded-3xl border border-slate-700 shadow-2xl flex overflow-hidden">
        
        {/* Left Panel: Controls */}
        <div className="w-1/3 border-r border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Wand2 className="text-indigo-400" /> Studio
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setMode(GenerationMode.NEW_IMAGE)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    mode === GenerationMode.NEW_IMAGE 
                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  Reimagine Scene
                </button>
                <button 
                  onClick={() => setMode(GenerationMode.EDIT_FRAME)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    mode === GenerationMode.EDIT_FRAME 
                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  Edit Frame
                </button>
              </div>
            </div>

            {mode === GenerationMode.NEW_IMAGE && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Aspect Ratio</label>
                <div className="flex gap-2 flex-wrap">
                  {['16:9', '4:3', '1:1', '3:4', '9:16'].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio as AspectRatio)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        aspectRatio === ratio 
                        ? 'bg-slate-700 border-indigo-400 text-indigo-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                Nano Banana Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">
                {mode === GenerationMode.NEW_IMAGE 
                  ? "Generating with Imagen 4.0" 
                  : `Editing frame at ${referenceTime || 'current time'} with Gemini 2.5 Flash Image`}
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
              {mode === GenerationMode.NEW_IMAGE ? "Generate Concept" : "Apply Edits"}
            </button>
            
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800 text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="w-2/3 bg-slate-950 flex items-center justify-center relative p-8">
          {resultImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
               <img 
                src={resultImage} 
                alt="Generated Result" 
                className="max-w-full max-h-full rounded-lg shadow-2xl border border-slate-800 object-contain"
              />
              <a 
                href={resultImage} 
                download={`cinecritique-${Date.now()}.jpg`}
                className="absolute bottom-4 right-4 px-4 py-2 bg-slate-900/80 hover:bg-black text-white text-sm rounded-lg backdrop-blur-md border border-slate-700 transition-colors"
              >
                Download
              </a>
            </div>
          ) : (
            <div className="text-center text-slate-600">
              <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                {mode === GenerationMode.NEW_IMAGE ? <ImageIcon size={40} /> : <Layers size={40} />}
              </div>
              <p className="text-lg font-medium">Ready to Create</p>
              <p className="text-sm max-w-xs mx-auto mt-2 opacity-70">
                {mode === GenerationMode.NEW_IMAGE 
                  ? "Visualize your scene improvements using high-fidelity generation." 
                  : "Fix specific details in your actual video frame using AI editing."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;