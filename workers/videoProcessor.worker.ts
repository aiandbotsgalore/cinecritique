/**
 * Web Worker for Video Processing
 * Handles frame extraction and analysis off the main thread
 */

interface ProcessFrameMessage {
  type: 'PROCESS_FRAME';
  videoUrl: string;
  timestamp: number;
}

interface ExtractFramesMessage {
  type: 'EXTRACT_FRAMES';
  videoUrl: string;
  interval: number;
  maxFrames: number;
}

type WorkerMessage = ProcessFrameMessage | ExtractFramesMessage;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;

  try {
    switch (type) {
      case 'PROCESS_FRAME':
        await processFrame(e.data);
        break;

      case 'EXTRACT_FRAMES':
        await extractFrames(e.data);
        break;

      default:
        console.warn('[Worker] Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Process a single frame at a specific timestamp
 */
async function processFrame(data: ProcessFrameMessage) {
  const { videoUrl, timestamp } = data;

  // Create video element in worker context
  const video = document.createElement('video');
  video.src = videoUrl;

  await new Promise((resolve) => {
    video.onloadeddata = resolve;
  });

  video.currentTime = timestamp;

  await new Promise((resolve) => {
    video.onseeked = resolve;
  });

  // Create offscreen canvas
  const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert to blob
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });

  self.postMessage({
    type: 'FRAME_PROCESSED',
    timestamp,
    blob
  });
}

/**
 * Extract multiple frames at intervals
 */
async function extractFrames(data: ExtractFramesMessage) {
  const { videoUrl, interval, maxFrames } = data;

  const video = document.createElement('video');
  video.src = videoUrl;

  await new Promise((resolve) => {
    video.onloadeddata = resolve;
  });

  const duration = video.duration;
  const frameCount = Math.min(Math.floor(duration / interval), maxFrames);

  for (let i = 0; i < frameCount; i++) {
    const timestamp = i * interval;

    if (timestamp >= duration) break;

    video.currentTime = timestamp;

    await new Promise((resolve) => {
      video.onseeked = resolve;
    });

    const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });

      self.postMessage({
        type: 'FRAME_EXTRACTED',
        index: i,
        timestamp,
        blob,
        progress: ((i + 1) / frameCount) * 100
      });
    }
  }

  self.postMessage({
    type: 'EXTRACTION_COMPLETE',
    totalFrames: frameCount
  });
}

// Export empty object to make this a module
export {};
