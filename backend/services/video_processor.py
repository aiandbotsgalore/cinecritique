"""
Video Processing Service
Local video analysis using opencv-python and librosa
"""
import cv2
import librosa
import numpy as np
import ffmpeg
from pathlib import Path
from typing import Dict, List, Any, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import base64

from utils.logger import get_logger

logger = get_logger(__name__)

class VideoProcessor:
    """Handles local video processing tasks"""

    def __init__(self, max_workers: int = 4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.healthy = True

    def is_healthy(self) -> bool:
        """Check if processor is healthy"""
        return self.healthy

    async def extract_features(
        self,
        video_path: str,
        extract_audio: bool = True,
        sample_frames: bool = True,
        frame_interval: int = 30
    ) -> Dict[str, Any]:
        """
        Extract local features from video

        Returns:
        {
            "metadata": {...},
            "audio": {...},
            "frames": [...],
            "scenes": [...]
        }
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            self._extract_features_sync,
            video_path,
            extract_audio,
            sample_frames,
            frame_interval
        )

    def _extract_features_sync(
        self,
        video_path: str,
        extract_audio: bool,
        sample_frames: bool,
        frame_interval: int
    ) -> Dict[str, Any]:
        """Synchronous feature extraction"""
        try:
            features = {}

            # Video metadata
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video: {video_path}")

            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0

            features["metadata"] = {
                "fps": fps,
                "frame_count": frame_count,
                "width": width,
                "height": height,
                "duration": duration,
                "aspect_ratio": f"{width}:{height}"
            }

            # Sample frames for analysis
            if sample_frames:
                frames = []
                frame_indices = range(0, frame_count, frame_interval)

                for idx in frame_indices:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                    ret, frame = cap.read()
                    if ret:
                        # Calculate basic metrics
                        brightness = np.mean(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
                        motion_blur = self._estimate_motion_blur(frame)

                        frames.append({
                            "frame_index": idx,
                            "timestamp": idx / fps,
                            "brightness": float(brightness),
                            "motion_blur": float(motion_blur),
                            "resolution": f"{width}x{height}"
                        })

                features["frames"] = frames

            cap.release()

            # Scene detection (simple threshold-based)
            scenes = self._detect_scenes(video_path, fps)
            features["scenes"] = scenes

            # Audio analysis
            if extract_audio:
                audio_features = self._extract_audio_features(video_path)
                features["audio"] = audio_features

            logger.info(f"Extracted features: {len(features.get('frames', []))} frames, "
                       f"{len(features.get('scenes', []))} scenes")

            return features

        except Exception as e:
            logger.error(f"Feature extraction failed: {str(e)}", exc_info=True)
            raise

    def _estimate_motion_blur(self, frame: np.ndarray) -> float:
        """Estimate motion blur using Laplacian variance"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        return cv2.Laplacian(gray, cv2.CV_64F).var()

    def _detect_scenes(self, video_path: str, fps: float) -> List[Dict[str, Any]]:
        """Simple scene detection based on frame differences"""
        cap = cv2.VideoCapture(video_path)
        scenes = []
        prev_frame = None
        frame_idx = 0
        scene_threshold = 30.0  # Adjust based on sensitivity

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            if prev_frame is not None:
                diff = cv2.absdiff(prev_frame, gray)
                mean_diff = np.mean(diff)

                # Scene change detected
                if mean_diff > scene_threshold:
                    scenes.append({
                        "frame_index": frame_idx,
                        "timestamp": frame_idx / fps,
                        "intensity": float(mean_diff)
                    })

            prev_frame = gray
            frame_idx += 1

        cap.release()
        return scenes

    def _extract_audio_features(self, video_path: str) -> Dict[str, Any]:
        """Extract audio features using librosa"""
        try:
            # Extract audio from video
            audio_path = f"{video_path}.wav"

            # Use ffmpeg to extract audio
            stream = ffmpeg.input(video_path)
            stream = ffmpeg.output(stream, audio_path, acodec='pcm_s16le', ac=1, ar='22050')
            ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)

            # Load audio
            y, sr = librosa.load(audio_path, sr=22050)

            # Extract features
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            zero_crossings = librosa.zero_crossings(y, pad=False)

            # RMS energy for volume analysis
            rms = librosa.feature.rms(y=y)[0]

            features = {
                "tempo": float(tempo),
                "beat_count": len(beats),
                "avg_spectral_centroid": float(np.mean(spectral_centroids)),
                "zero_crossing_rate": float(np.sum(zero_crossings) / len(y)),
                "avg_energy": float(np.mean(rms)),
                "duration": len(y) / sr
            }

            # Clean up temp audio file
            Path(audio_path).unlink(missing_ok=True)

            return features

        except Exception as e:
            logger.warning(f"Audio extraction failed: {str(e)}")
            return {"error": str(e)}

    async def preprocess(
        self,
        video_path: str,
        compress: bool = True,
        max_size_mb: int = 50
    ) -> Dict[str, Any]:
        """
        Preprocess video before sending to Gemini API
        - Compress if too large
        - Generate thumbnail
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            self._preprocess_sync,
            video_path,
            compress,
            max_size_mb
        )

    def _preprocess_sync(
        self,
        video_path: str,
        compress: bool,
        max_size_mb: int
    ) -> Dict[str, Any]:
        """Synchronous preprocessing"""
        try:
            input_path = Path(video_path)
            size_mb = input_path.stat().st_size / (1024 * 1024)

            result = {
                "original_size_mb": size_mb,
                "compressed": False,
                "thumbnail": None
            }

            # Compress if needed
            if compress and size_mb > max_size_mb:
                output_path = input_path.with_stem(f"{input_path.stem}_compressed")

                # Calculate target bitrate
                probe = ffmpeg.probe(str(input_path))
                duration = float(probe['format']['duration'])
                target_bitrate = int((max_size_mb * 8 * 1024) / duration)

                # Compress video
                stream = ffmpeg.input(str(input_path))
                stream = ffmpeg.output(
                    stream,
                    str(output_path),
                    video_bitrate=f"{target_bitrate}k",
                    vcodec='libx264',
                    preset='medium'
                )
                ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)

                compressed_size = output_path.stat().st_size / (1024 * 1024)
                result["compressed"] = True
                result["compressed_size_mb"] = compressed_size
                result["compressed_path"] = str(output_path)

            # Generate thumbnail
            cap = cv2.VideoCapture(video_path)
            ret, frame = cap.read()
            if ret:
                # Resize to thumbnail
                thumbnail = cv2.resize(frame, (320, 180))
                _, buffer = cv2.imencode('.jpg', thumbnail)
                result["thumbnail"] = base64.b64encode(buffer).decode('utf-8')
            cap.release()

            return result

        except Exception as e:
            logger.error(f"Preprocessing failed: {str(e)}", exc_info=True)
            raise
