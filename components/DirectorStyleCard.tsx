import React from 'react';
import { DirectorStyleMatch } from '../types';
import { Award, TrendingUp } from 'lucide-react';

interface Props {
  directorStyles: DirectorStyleMatch[];
}

const DirectorStyleCard: React.FC<Props> = ({ directorStyles }) => {
  if (!directorStyles || directorStyles.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-purple-400" />
        Director Style Analysis
      </h3>

      <p className="text-slate-300 text-sm mb-4">
        Your video's style resembles these legendary music video directors:
      </p>

      <div className="space-y-4">
        {directorStyles.map((match, index) => (
          <div key={index} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-white font-bold flex items-center gap-2">
                <span className="text-2xl">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎬'}
                </span>
                {match.director}
              </h4>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-400">{match.percentage}%</div>
                  <div className="text-xs text-slate-500">similarity</div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${match.percentage}%` }}
              ></div>
            </div>

            {/* Characteristics */}
            <div className="flex flex-wrap gap-2">
              {match.characteristics.map((char, charIndex) => (
                <span
                  key={charIndex}
                  className="px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded border border-purple-700/50"
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Shareable card hint */}
      <div className="mt-4 text-center text-xs text-slate-500">
        <TrendingUp className="w-4 h-4 inline mr-1" />
        This makes for a great shareable result!
      </div>
    </div>
  );
};

export default DirectorStyleCard;
