/**
 * Shot-by-shot breakdown display component.
 * Shows detailed cinematographic analysis for each shot including type, movement,
 * lighting, and composition notes. Clickable shots for video navigation.
 * @module components/ShotBreakdown
 */

import React from 'react';
import { Shot } from '../types';
import { Camera, Film, Lightbulb, Layout } from 'lucide-react';

/**
 * Props for the ShotBreakdown component.
 */
interface Props {
  /** Array of shots to display */
  shots: Shot[];
  /** Callback when a shot is clicked for navigation */
  onShotClick: (shot: Shot) => void;
}

/**
 * Displays a detailed list of all shots in the video with cinematographic analysis.
 * Each shot shows type, movement, timing, lighting, and composition details.
 *
 * @param {Props} props - Component props
 * @returns {JSX.Element} Rendered shot breakdown list
 *
 * @example
 * <ShotBreakdown
 *   shots={analysis.shots}
 *   onShotClick={(shot) => videoRef.current.currentTime = shot.startSeconds}
 * />
 */
const ShotBreakdown: React.FC<Props> = ({ shots, onShotClick}) => {
  if (!shots || shots.length === 0) {
    return (
      <div className="text-center text-slate-500 py-8">
        <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No shot breakdown available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Film className="w-5 h-5 text-indigo-400" />
        Shot-by-Shot Breakdown ({shots.length} shots)
      </h3>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {shots.map((shot) => (
          <div
            key={shot.shotNumber}
            onClick={() => onShotClick(shot)}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-indigo-400 font-bold">Shot {shot.shotNumber}</span>
                <span className="text-slate-400 text-sm ml-3">
                  {shot.startTime} - {shot.endTime}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-slate-900 text-xs rounded border border-slate-700 text-slate-300">
                  {shot.shotType}
                </span>
                <span className="px-2 py-1 bg-slate-900 text-xs rounded border border-slate-700 text-slate-300">
                  {shot.movement}
                </span>
              </div>
            </div>

            <p className="text-slate-300 text-sm mb-3">{shot.description}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-500 font-semibold mb-1">Lighting</div>
                  <div className="text-slate-300">{shot.lighting}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Layout className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-500 font-semibold mb-1">Composition</div>
                  <div className="text-slate-300">{shot.composition}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to jump to this shot
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShotBreakdown;
