import React, { useState, useEffect, useRef } from 'react';
import { VideoEffects } from '../types';
import { VideoEffectsProcessor, defaultEffects } from '../utils/videoEffects';
import { Sliders, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
}

const VideoEffectsPanel: React.FC<Props> = ({ videoRef }) => {
  const [effects, setEffects] = useState<VideoEffects>(defaultEffects);
  const [isEnabled, setIsEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processorRef = useRef<VideoEffectsProcessor | null>(null);

  useEffect(() => {
    if (videoRef.current && canvasRef.current && isEnabled) {
      processorRef.current = new VideoEffectsProcessor(videoRef.current, canvasRef.current);
      processorRef.current.startRenderLoop(effects);

      return () => {
        if (processorRef.current) {
          processorRef.current.destroy();
        }
      };
    }
  }, [isEnabled, videoRef]);

  useEffect(() => {
    if (processorRef.current && isEnabled) {
      processorRef.current.applyEffects(effects);
    }
  }, [effects, isEnabled]);

  const handleReset = () => {
    setEffects(defaultEffects);
  };

  const SliderControl = ({ label, value, onChange, min = -1, max = 1, step = 0.01 }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%, #334155 100%)`,
        }}
      />
    </div>
  );

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          Color Correction Preview
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              isEnabled
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isEnabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {isEnabled ? (
        <>
          <div className="mb-4 text-sm text-slate-400">
            <p>Adjust color grading in real-time using WebGL shaders. These changes are for preview only.</p>
          </div>

          <div className="space-y-4">
            <SliderControl
              label="Exposure"
              value={effects.exposure}
              onChange={(val) => setEffects({ ...effects, exposure: val })}
            />

            <SliderControl
              label="Brightness"
              value={effects.brightness}
              onChange={(val) => setEffects({ ...effects, brightness: val })}
            />

            <SliderControl
              label="Contrast"
              value={effects.contrast}
              onChange={(val) => setEffects({ ...effects, contrast: val })}
            />

            <SliderControl
              label="Saturation"
              value={effects.saturation}
              onChange={(val) => setEffects({ ...effects, saturation: val })}
            />

            <SliderControl
              label="Temperature (Warm/Cool)"
              value={effects.temperature}
              onChange={(val) => setEffects({ ...effects, temperature: val })}
            />

            <SliderControl
              label="Tint (Green/Magenta)"
              value={effects.tint}
              onChange={(val) => setEffects({ ...effects, tint: val })}
            />
          </div>

          {/* Hidden canvas for WebGL rendering */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </>
      ) : (
        <div className="text-center text-slate-500 py-8">
          <EyeOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Enable to preview color corrections on your video</p>
          <p className="text-xs mt-2">Uses WebGL for real-time processing</p>
        </div>
      )}
    </div>
  );
};

export default VideoEffectsPanel;
