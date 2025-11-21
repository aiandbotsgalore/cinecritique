/**
 * Virtualized Timeline Component
 * Efficiently renders large lists of timeline events
 */
import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import { TimelineEvent } from '../types';

interface Props {
  events: TimelineEvent[];
  onOpenStudio: (prompt: string, time: string, seconds: number) => void;
}

const ITEM_HEIGHT = 240; // Approximate height of each timeline item
const BUFFER = 3; // Number of items to render outside viewport

const VirtualizedTimeline: React.FC<Props> = memo(({ events, onOpenStudio }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
  const endIndex = Math.min(
    events.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER
  );

  const visibleEvents = events.slice(startIndex, endIndex);
  const offsetTop = startIndex * ITEM_HEIGHT;
  const totalHeight = events.length * ITEM_HEIGHT;

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto h-full"
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetTop}px)` }}>
          {visibleEvents.map((event, idx) => (
            <TimelineEventCard
              key={startIndex + idx}
              event={event}
              onOpenStudio={onOpenStudio}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedTimeline.displayName = 'VirtualizedTimeline';

// Memoized event card
const TimelineEventCard: React.FC<{
  event: TimelineEvent;
  onOpenStudio: (prompt: string, time: string, seconds: number) => void;
}> = memo(({ event, onOpenStudio }) => {
  const handleClick = useCallback(() => {
    onOpenStudio(event.nanoBananaPrompt, event.timestamp, event.seconds);
  }, [event, onOpenStudio]);

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors group mb-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-slate-900 text-indigo-400 text-xs font-mono rounded border border-slate-700">
            {event.timestamp}
          </span>
          <h4 className="font-semibold text-slate-200">{event.title}</h4>
        </div>
        <div
          className={`w-2 h-2 rounded-full ${
            event.severity > 7
              ? 'bg-red-500'
              : event.severity > 4
              ? 'bg-amber-500'
              : 'bg-blue-500'
          }`}
        />
      </div>

      <p className="text-sm text-red-300 mb-2">
        <span className="text-slate-500">Issue:</span> {event.issue}
      </p>
      <p className="text-sm text-slate-400 mb-3">{event.reason}</p>

      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 mb-4">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">
          The Fix
        </p>
        <p className="text-sm text-slate-300">{event.fix}</p>
      </div>

      <button
        onClick={handleClick}
        className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white"
      >
        <Maximize2 size={14} />
        Visualize Fix in Studio
      </button>
    </div>
  );
});

TimelineEventCard.displayName = 'TimelineEventCard';

export default VirtualizedTimeline;
