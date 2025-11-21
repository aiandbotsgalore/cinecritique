"""
AI Router Service
Routes requests between Gemini API and local LLM based on availability and cost
"""
import os
from typing import Dict, Any, Optional
import asyncio
from pathlib import Path
import json

import google.generativeai as genai
from llama_cpp import Llama

from utils.logger import get_logger

logger = get_logger(__name__)

class AIRouter:
    """Routes AI requests to Gemini or local LLM"""

    def __init__(self):
        self.gemini_available = False
        self.local_llm_available = False
        self.local_llm: Optional[Llama] = None

        # Initialize Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                genai.configure(api_key=api_key)
                self.gemini_available = True
                logger.info("Gemini API configured successfully")
            except Exception as e:
                logger.warning(f"Gemini API configuration failed: {str(e)}")

        # Initialize local LLM
        self._init_local_llm()

    def _init_local_llm(self):
        """Initialize local LLM (Llama)"""
        model_path = os.getenv("LOCAL_LLM_PATH", "models/llama-2-7b-chat.Q4_K_M.gguf")

        if Path(model_path).exists():
            try:
                self.local_llm = Llama(
                    model_path=model_path,
                    n_ctx=4096,
                    n_threads=4,
                    n_gpu_layers=0,  # CPU only, set higher for GPU
                    verbose=False
                )
                self.local_llm_available = True
                logger.info(f"Local LLM loaded: {model_path}")
            except Exception as e:
                logger.warning(f"Local LLM initialization failed: {str(e)}")
        else:
            logger.info(f"Local LLM not found at {model_path}. Will use Gemini only.")

    async def health_check(self) -> Dict[str, bool]:
        """Check availability of AI providers"""
        return {
            "gemini": self.gemini_available,
            "local_llm": self.local_llm_available
        }

    async def analyze_video(
        self,
        video_path: str,
        features: Dict[str, Any],
        force_local: bool = False
    ) -> Dict[str, Any]:
        """
        Analyze video using Gemini or local LLM

        Strategy:
        1. If force_local or Gemini unavailable -> use local LLM
        2. Otherwise -> use Gemini (higher quality)
        """
        if force_local or not self.gemini_available:
            if self.local_llm_available:
                return await self._analyze_with_local_llm(features)
            else:
                raise Exception("No AI provider available")

        # Use Gemini for video analysis (best quality)
        return await self._analyze_with_gemini(video_path, features)

    async def _analyze_with_gemini(
        self,
        video_path: str,
        features: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze with Gemini API"""
        try:
            # Upload video
            video_file = genai.upload_file(path=video_path)

            # Wait for processing
            while video_file.state.name == "PROCESSING":
                await asyncio.sleep(2)
                video_file = genai.get_file(video_file.name)

            if video_file.state.name == "FAILED":
                raise Exception("Gemini video processing failed")

            # Create prompt with local features context
            prompt = self._create_analysis_prompt(features)

            # Generate analysis
            model = genai.GenerativeModel("gemini-1.5-flash")  # Using flash for cost savings
            response = model.generate_content([video_file, prompt])

            # Parse response (assuming structured output)
            analysis = self._parse_gemini_response(response.text)

            return {
                "analysis": analysis,
                "provider": "gemini",
                "model": "gemini-1.5-flash",
                "tokens": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
            }

        except Exception as e:
            logger.error(f"Gemini analysis failed: {str(e)}")
            # Fallback to local LLM
            if self.local_llm_available:
                logger.info("Falling back to local LLM")
                return await self._analyze_with_local_llm(features)
            raise

    async def _analyze_with_local_llm(
        self,
        features: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze with local LLM (feature-based only, no video input)"""
        try:
            prompt = self._create_local_analysis_prompt(features)

            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.local_llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": "You are a professional film critic and cinematographer."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=2048,
                    temperature=0.7
                )
            )

            analysis_text = response["choices"][0]["message"]["content"]
            analysis = self._parse_local_response(analysis_text)

            return {
                "analysis": analysis,
                "provider": "local_llm",
                "model": "llama-2-7b",
                "tokens": response["usage"]["total_tokens"]
            }

        except Exception as e:
            logger.error(f"Local LLM analysis failed: {str(e)}")
            raise

    async def chat(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        use_local: bool = False
    ) -> Dict[str, Any]:
        """Handle chat requests"""
        if use_local and self.local_llm_available:
            return await self._chat_local(message, context)
        elif self.gemini_available:
            return await self._chat_gemini(message, context)
        else:
            raise Exception("No AI provider available for chat")

    async def _chat_gemini(
        self,
        message: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Chat with Gemini"""
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")

            # Build context-aware prompt
            if context:
                context_str = json.dumps(context, indent=2)
                full_message = f"Context: {context_str}\n\nUser: {message}"
            else:
                full_message = message

            response = model.generate_content(full_message)

            return {
                "text": response.text,
                "provider": "gemini",
                "tokens": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
            }

        except Exception as e:
            logger.error(f"Gemini chat failed: {str(e)}")
            raise

    async def _chat_local(
        self,
        message: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Chat with local LLM"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.local_llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": "You are a helpful creative director assistant."},
                        {"role": "user", "content": message}
                    ],
                    max_tokens=512
                )
            )

            return {
                "text": response["choices"][0]["message"]["content"],
                "provider": "local_llm",
                "tokens": response["usage"]["total_tokens"]
            }

        except Exception as e:
            logger.error(f"Local LLM chat failed: {str(e)}")
            raise

    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: str,
        use_local: bool = False
    ) -> Dict[str, Any]:
        """Generate image (Gemini only for now)"""
        if not self.gemini_available:
            raise Exception("Image generation requires Gemini API")

        try:
            model = genai.GenerativeModel("imagen-3.0-generate-001")  # Using Imagen 3 instead of 4 for cost
            response = model.generate_images(
                prompt=prompt,
                number_of_images=1,
                aspect_ratio=aspect_ratio
            )

            return {
                "image": response.images[0]._pil_image,
                "provider": "gemini_imagen"
            }

        except Exception as e:
            logger.error(f"Image generation failed: {str(e)}")
            raise

    def _create_analysis_prompt(self, features: Dict[str, Any]) -> str:
        """Create analysis prompt with local features"""
        return f"""
Act as a world-class film critic, editor, and cinematographer.
Analyze this music video comprehensively.

Local analysis has detected:
- Duration: {features['metadata']['duration']:.2f}s
- FPS: {features['metadata']['fps']}
- Resolution: {features['metadata']['width']}x{features['metadata']['height']}
- Audio tempo: {features.get('audio', {}).get('tempo', 'N/A')} BPM
- Scene changes detected: {len(features.get('scenes', []))}

Provide a professional critique covering:
1. Storytelling & Concept
2. Editing Rhythm & Pacing (considering the {features.get('audio', {}).get('tempo', 'unknown')} BPM tempo)
3. Cinematography & Lighting
4. Music Integration

Then, identify specific weak moments with timestamps, issues, and fixes.
Be harsh but constructive.

Return as JSON with structure:
{{
  "summary": {{
    "storytelling": "...",
    "editing": "...",
    "cinematography": "...",
    "musicIntegration": "...",
    "verdict": "..."
  }},
  "timeline": [
    {{
      "timestamp": "MM:SS",
      "seconds": 0,
      "title": "...",
      "issue": "...",
      "reason": "...",
      "fix": "...",
      "nanoBananaPrompt": "...",
      "severity": 0-10
    }}
  ]
}}
"""

    def _create_local_analysis_prompt(self, features: Dict[str, Any]) -> str:
        """Create prompt for local LLM (no video access)"""
        return f"""
Based on the following video metadata and extracted features, provide a professional critique:

Metadata:
- Duration: {features['metadata']['duration']:.2f}s
- Resolution: {features['metadata']['width']}x{features['metadata']['height']}
- FPS: {features['metadata']['fps']}

Audio Features:
- Tempo: {features.get('audio', {}).get('tempo', 'N/A')} BPM
- Average Energy: {features.get('audio', {}).get('avg_energy', 'N/A')}

Video Features:
- Frames analyzed: {len(features.get('frames', []))}
- Scene changes: {len(features.get('scenes', []))}
- Average brightness: {sum(f['brightness'] for f in features.get('frames', [])) / len(features.get('frames', [1])) if features.get('frames') else 'N/A'}

Provide analysis in this JSON format:
{{
  "summary": {{
    "storytelling": "Based on pacing and scene changes...",
    "editing": "Rhythm analysis based on tempo and cuts...",
    "cinematography": "Technical assessment...",
    "musicIntegration": "Tempo and beat alignment...",
    "verdict": "Overall assessment..."
  }},
  "timeline": []
}}
"""

    def _parse_gemini_response(self, text: str) -> Dict[str, Any]:
        """Parse Gemini response to structured format"""
        try:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # Fallback: create basic structure
                return {
                    "summary": {
                        "storytelling": text[:200],
                        "editing": "See full analysis",
                        "cinematography": "See full analysis",
                        "musicIntegration": "See full analysis",
                        "verdict": "Analysis completed"
                    },
                    "timeline": []
                }
        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {str(e)}")
            raise

    def _parse_local_response(self, text: str) -> Dict[str, Any]:
        """Parse local LLM response"""
        try:
            import re
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {
                    "summary": {
                        "storytelling": "Local analysis based on features",
                        "editing": "Tempo-based rhythm assessment",
                        "cinematography": "Technical quality assessment",
                        "musicIntegration": "Beat synchronization analysis",
                        "verdict": text[:200] if text else "Analysis completed"
                    },
                    "timeline": []
                }
        except Exception as e:
            logger.error(f"Failed to parse local response: {str(e)}")
            raise
