import React from 'react';
import { MusicSyncAnalysis } from '../types';
import { Music, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  musicSync: MusicSyncAnalysis;
}

const MusicSyncDisplay: React.FC<Props> = ({ musicSync }) => {
  if (!musicSync) return null;

  const getSyncLabel = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: 'text-green-400', bg: 'bg-green-900/30' };
    if (score >= 60) return { text: 'Good', color: 'text-blue-400', bg: 'bg-blue-900/30' };
    if (score >= 40) return { text: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
    return { text: 'Needs Work', color: 'text-red-400', bg: 'bg-red-900/30' };
  };

  const syncLabel = getSyncLabel(musicSync.syncScore);

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Music className="w-5 h-5 text-indigo-400" />
        Music Sync Analysis
      </h3>

      {/* Sync Score */}
      <div className={`${syncLabel.bg} rounded-lg p-4 mb-4 border border-slate-700`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400 mb-1">Beat Synchronization</div>
            <div className={`text-3xl font-bold ${syncLabel.color}`}>
              {musicSync.syncScore}/100
            </div>
            <div className="text-sm text-slate-400 mt-1">{syncLabel.text} sync</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400 mb-1">Detected BPM</div>
            <div className="text-2xl font-bold text-slate-200">{musicSync.bpm}</div>
            <div className="text-xs text-slate-500">
              {musicSync.bpm > 0 && `${(60 / musicSync.bpm).toFixed(2)}s/beat`}
            </div>
          </div>
        </div>
      </div>

      {/* Off-Beat Cuts */}
      {musicSync.offBeatCuts.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Off-Beat Cuts ({musicSync.offBeatCuts.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {musicSync.offBeatCuts.slice(0, 5).map((cut, index) => (
              <div
                key={index}
                className="bg-slate-900 rounded px-3 py-2 text-sm flex justify-between items-center"
              >
                <span className="text-amber-300 font-mono">{cut.timestamp}</span>
                <span className="text-slate-400">
                  {cut.offset > 0 ? '+' : ''}{cut.offset.toFixed(2)}s off
                </span>
              </div>
            ))}
            {musicSync.offBeatCuts.length > 5 && (
              <div className="text-xs text-slate-500 text-center">
                +{musicSync.offBeatCuts.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {musicSync.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Recommendations
          </h4>
          <div className="space-y-2">
            {musicSync.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="bg-slate-900 rounded px-3 py-2 text-sm text-slate-300 flex items-start gap-2"
              >
                {suggestion.startsWith('✓') ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <span className="text-indigo-400">•</span>
                )}
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicSyncDisplay;
