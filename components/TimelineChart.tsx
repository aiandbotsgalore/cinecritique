/**
 * Visual timeline chart displaying issue severity across the video.
 * Uses a bar chart with color-coded severity levels (red, amber, blue).
 * Clickable bars for navigating to specific timeline issues.
 * @module components/TimelineChart
 */

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { TimelineEvent } from '../types';

/**
 * Props for the TimelineChart component.
 */
interface Props {
  /** Array of timeline events to visualize */
  data: TimelineEvent[];
  /** Callback when a timeline event is clicked */
  onSelect: (event: TimelineEvent) => void;
}

/**
 * Interactive bar chart showing video issue severity over time.
 * Color codes: Red (severity > 7), Amber (severity > 4), Blue (severity ≤ 4).
 *
 * @param {Props} props - Component props
 * @returns {JSX.Element} Rendered timeline chart
 *
 * @example
 * <TimelineChart
 *   data={critiqueAnalysis.timeline}
 *   onSelect={(event) => seekToTimestamp(event.seconds)}
 * />
 */
const TimelineChart: React.FC<Props> = ({ data, onSelect }) => {
  return (
    <div className="h-64 w-full bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Visual Intensity Timeline</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} onClick={(state: any) => {
            if (state && state.activePayload && state.activePayload.length > 0) {
                onSelect(state.activePayload[0].payload);
            }
        }}>
          <XAxis 
            dataKey="timestamp" 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
          />
          <YAxis hide domain={[0, 10]} />
          <Tooltip 
            cursor={{fill: 'rgba(255,255,255,0.1)'}}
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
            itemStyle={{ color: '#38bdf8' }}
          />
          <Bar dataKey="severity" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.severity > 7 ? '#ef4444' : entry.severity > 4 ? '#f59e0b' : '#38bdf8'} 
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimelineChart;
