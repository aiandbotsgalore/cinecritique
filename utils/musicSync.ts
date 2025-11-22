import { MusicSyncAnalysis, BeatMarker, TimelineEvent } from '../types';
import logger from './logger';

/**
 * Analyzes music sync using Web Audio API beat detection
 */
export const analyzeMusicSync = async (
  videoFile: File,
  timelineEvents: TimelineEvent[]
): Promise<MusicSyncAnalysis> => {
  try {
    const audioContext = new AudioContext();
    const arrayBuffer = await videoFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Detect beats using energy-based detection
    const beatMarkers = detectBeats(audioBuffer);

    // Estimate BPM
    const bpm = estimateBPM(beatMarkers);

    // Check which timeline events align with beats
    const { onBeatCount, offBeatCuts } = analyzeAlignment(beatMarkers, timelineEvents);

    // Calculate sync score
    const totalCuts = timelineEvents.length;
    const syncScore = totalCuts > 0 ? Math.round((onBeatCount / totalCuts) * 100) : 0;

    // Generate suggestions
    const suggestions = generateSuggestions(syncScore, offBeatCuts, bpm);

    // Mark beats that have cuts nearby
    const markedBeats = beatMarkers.map(beat => ({
      ...beat,
      onBeat: timelineEvents.some(event =>
        Math.abs(event.seconds - beat.time) < 0.2
      ),
    }));

    await audioContext.close();

    return {
      bpm,
      beatMarkers: markedBeats,
      syncScore,
      suggestions,
      offBeatCuts,
    };
  } catch (error) {
    logger.error('Music sync analysis failed:', error);
    // Return empty analysis on failure
    return {
      bpm: 0,
      beatMarkers: [],
      syncScore: 0,
      suggestions: ['Unable to analyze music sync. The video may not have audio or the format is unsupported.'],
      offBeatCuts: [],
    };
  }
};

/**
 * Detect beats using energy-based algorithm
 */
const detectBeats = (audioBuffer: AudioBuffer): BeatMarker[] => {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const beatMarkers: BeatMarker[] = [];

  // Parameters for beat detection
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms window
  const hopSize = Math.floor(windowSize / 2);
  const energyHistory: number[] = [];
  const historySize = 43; // ~1 second of history

  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    // Calculate energy in current window
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += channelData[i + j] ** 2;
    }
    energy = Math.sqrt(energy / windowSize);

    // Keep history of recent energies
    energyHistory.push(energy);
    if (energyHistory.length > historySize) {
      energyHistory.shift();
    }

    // Detect beat if energy exceeds threshold
    if (energyHistory.length === historySize) {
      const avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / historySize;
      const variance = energyHistory.reduce((sum, e) => sum + (e - avgEnergy) ** 2, 0) / historySize;
      const threshold = avgEnergy + 1.5 * Math.sqrt(variance);

      if (energy > threshold) {
        const time = i / sampleRate;

        // Avoid duplicate beats too close together (< 200ms)
        const lastBeat = beatMarkers[beatMarkers.length - 1];
        if (!lastBeat || time - lastBeat.time > 0.2) {
          beatMarkers.push({
            time,
            strength: Math.min((energy - avgEnergy) / threshold, 1),
            onBeat: false, // Will be set later
          });
        }
      }
    }
  }

  logger.debug(`Detected ${beatMarkers.length} beats`);
  return beatMarkers;
};

/**
 * Estimate BPM from beat markers
 */
const estimateBPM = (beatMarkers: BeatMarker[]): number => {
  if (beatMarkers.length < 2) return 0;

  // Calculate intervals between beats
  const intervals: number[] = [];
  for (let i = 1; i < beatMarkers.length; i++) {
    intervals.push(beatMarkers[i].time - beatMarkers[i - 1].time);
  }

  // Find median interval (more robust than average)
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];

  // Convert to BPM
  const bpm = Math.round(60 / medianInterval);

  // Sanity check: typical music is 60-180 BPM
  if (bpm < 60 || bpm > 180) {
    // Might have detected half or double beats
    if (bpm < 60) return bpm * 2;
    if (bpm > 180) return Math.round(bpm / 2);
  }

  return bpm;
};

/**
 * Analyze how well timeline events align with beats
 */
const analyzeAlignment = (
  beatMarkers: BeatMarker[],
  timelineEvents: TimelineEvent[]
): { onBeatCount: number; offBeatCuts: { timestamp: string; offset: number }[] } => {
  let onBeatCount = 0;
  const offBeatCuts: { timestamp: string; offset: number }[] = [];

  const beatTolerance = 0.2; // 200ms tolerance

  timelineEvents.forEach(event => {
    // Find nearest beat
    let minDistance = Infinity;
    let nearestBeat: BeatMarker | null = null;

    beatMarkers.forEach(beat => {
      const distance = Math.abs(beat.time - event.seconds);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBeat = beat;
      }
    });

    if (nearestBeat) {
      if (minDistance < beatTolerance) {
        onBeatCount++;
      } else {
        // Cut is off-beat
        const offset = event.seconds - nearestBeat.time;
        offBeatCuts.push({
          timestamp: event.timestamp,
          offset: parseFloat(offset.toFixed(2)),
        });
      }
    }
  });

  return { onBeatCount, offBeatCuts };
};

/**
 * Generate suggestions based on sync analysis
 */
const generateSuggestions = (
  syncScore: number,
  offBeatCuts: { timestamp: string; offset: number }[],
  bpm: number
): string[] => {
  const suggestions: string[] = [];

  if (syncScore >= 80) {
    suggestions.push('✓ Excellent beat synchronization! Your cuts are well-timed to the music.');
  } else if (syncScore >= 60) {
    suggestions.push('Good sync overall, but some cuts could be tighter to the beat.');
  } else if (syncScore >= 40) {
    suggestions.push('Moderate sync. Consider aligning more cuts with the beat markers.');
  } else {
    suggestions.push('Low sync score. Music videos typically benefit from cuts on the beat.');
  }

  if (offBeatCuts.length > 0) {
    suggestions.push(`${offBeatCuts.length} cuts are noticeably off-beat. See details above for timing adjustments.`);
  }

  if (bpm > 0) {
    const beatInterval = 60 / bpm;
    suggestions.push(`The music tempo is ${bpm} BPM (one beat every ${beatInterval.toFixed(2)}s). Use this for timing your cuts.`);
  }

  return suggestions;
};
