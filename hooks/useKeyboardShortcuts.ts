/**
 * Keyboard Shortcuts Hook
 * Adds global keyboard shortcuts for navigation and actions
 */
import { useEffect } from 'react';

interface ShortcutHandlers {
  onAnalyze?: () => void;
  onTogglePlay?: () => void;
  onOpenDebug?: () => void;
  onJumpBackward?: () => void;
  onJumpForward?: () => void;
  onToggleTab?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd + Enter: Start Analysis
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handlers.onAnalyze?.();
      }

      // Space: Toggle Play/Pause
      if (e.key === ' ') {
        e.preventDefault();
        handlers.onTogglePlay?.();
      }

      // D: Toggle Debug Panel
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handlers.onOpenDebug?.();
      }

      // Left Arrow: Jump backward 5 seconds
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlers.onJumpBackward?.();
      }

      // Right Arrow: Jump forward 5 seconds
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlers.onJumpForward?.();
      }

      // Tab: Toggle between Overview and Details
      if (e.key === 'Tab') {
        e.preventDefault();
        handlers.onToggleTab?.();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers]);
};

// Keyboard shortcuts reference
export const SHORTCUTS = {
  analyze: 'Ctrl+Enter / Cmd+Enter',
  playPause: 'Space',
  debug: 'D',
  jumpBackward: '← Left Arrow',
  jumpForward: '→ Right Arrow',
  toggleTab: 'Tab',
};
