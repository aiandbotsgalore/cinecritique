"""
CineCritique AI - Python Backend
FastAPI server for local video processing and AI routing
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import asyncio
import hashlib
import json
from pathlib import Path
from datetime import datetime, timedelta

from services.video_processor import VideoProcessor
from services.cache_manager import CacheManager
from services.ai_router import AIRouter
from services.cost_tracker import CostTracker
from utils.logger import get_logger

logger = get_logger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="CineCritique AI Backend",
    description="Local-first video processing and AI routing",
    version="1.0.0"
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
video_processor = VideoProcessor()
cache_manager = CacheManager()
ai_router = AIRouter()
cost_tracker = CostTracker()

# ==================== Models ====================

class VideoAnalysisRequest(BaseModel):
    use_cache: bool = Field(default=True, description="Use cached results if available")
    force_local: bool = Field(default=False, description="Force local LLM processing")
    extract_audio: bool = Field(default=True, description="Extract audio features")
    frame_interval: int = Field(default=30, description="Frame sampling interval")

class CritiqueAnalysis(BaseModel):
    summary: Dict[str, str]
    timeline: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    message: str
    analysis_id: Optional[str] = None
    use_local: bool = False

class ImageGenerationRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "1:1"
    use_local: bool = False

class CostReport(BaseModel):
    total_cost: float
    breakdown: Dict[str, float]
    api_calls: int
    cache_hits: int
    cache_hit_rate: float

# ==================== Health Check ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "video_processor": video_processor.is_healthy(),
            "cache": cache_manager.is_healthy(),
            "ai_router": await ai_router.health_check(),
        }
    }

# ==================== Video Analysis ====================

@app.post("/api/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    use_cache: bool = True,
    force_local: bool = False,
    background_tasks: BackgroundTasks = None
):
    """
    Analyze video with intelligent caching and AI routing

    Flow:
    1. Generate cache key from video hash
    2. Check cache (IndexedDB hash shared from frontend)
    3. If miss: Process locally (features extraction)
    4. Route to Gemini or local LLM based on cost/availability
    5. Cache result
    6. Return analysis
    """
    try:
        logger.info(f"Starting analysis for {file.filename}")

        # Save uploaded file temporarily
        temp_path = Path(f"/tmp/cinecritique_{datetime.now().timestamp()}_{file.filename}")
        content = await file.read()
        temp_path.write_bytes(content)

        # Generate cache key
        video_hash = hashlib.sha256(content).hexdigest()
        cache_key = f"analysis:{video_hash}"

        # Check cache
        if use_cache:
            cached = await cache_manager.get(cache_key)
            if cached:
                logger.info(f"Cache hit for {video_hash[:8]}")
                cost_tracker.record_cache_hit("analysis")

                # Clean up temp file in background
                background_tasks.add_task(temp_path.unlink, missing_ok=True)

                return JSONResponse({
                    "analysis": cached,
                    "cached": True,
                    "cost_saved": 2.50  # Estimated Gemini cost
                })

        # Extract local features (audio, motion, scene detection)
        logger.info("Extracting local video features")
        local_features = await video_processor.extract_features(
            str(temp_path),
            extract_audio=True,
            sample_frames=True
        )

        # Route to AI (Gemini or local LLM)
        analysis_result = await ai_router.analyze_video(
            video_path=str(temp_path),
            features=local_features,
            force_local=force_local
        )

        # Track cost
        cost = cost_tracker.record_analysis(
            provider=analysis_result["provider"],
            model=analysis_result["model"],
            tokens=analysis_result.get("tokens", 0)
        )

        # Cache result
        await cache_manager.set(cache_key, analysis_result["analysis"], ttl=86400 * 7)  # 7 days

        # Clean up temp file in background
        background_tasks.add_task(temp_path.unlink, missing_ok=True)

        return JSONResponse({
            "analysis": analysis_result["analysis"],
            "cached": False,
            "provider": analysis_result["provider"],
            "cost": cost,
            "features": {
                "audio_analyzed": local_features.get("audio") is not None,
                "frames_sampled": len(local_features.get("frames", [])),
                "scenes_detected": len(local_features.get("scenes", []))
            }
        })

    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Chat ====================

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint with smart context management
    Routes to local LLM if available and requested
    """
    try:
        # Use cached analysis context if available
        context = None
        if request.analysis_id:
            cache_key = f"analysis:{request.analysis_id}"
            context = await cache_manager.get(cache_key)

        # Route chat request
        response = await ai_router.chat(
            message=request.message,
            context=context,
            use_local=request.use_local
        )

        # Track cost
        cost = cost_tracker.record_chat(
            provider=response["provider"],
            tokens=response.get("tokens", 0)
        )

        return {
            "message": response["text"],
            "provider": response["provider"],
            "cost": cost
        }

    except Exception as e:
        logger.error(f"Chat failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Image Generation ====================

@app.post("/api/generate-image")
async def generate_image(request: ImageGenerationRequest):
    """
    Image generation with local fallback
    """
    try:
        result = await ai_router.generate_image(
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            use_local=request.use_local
        )

        cost = cost_tracker.record_image_generation(
            provider=result["provider"]
        )

        return {
            "image": result["image"],
            "provider": result["provider"],
            "cost": cost
        }

    except Exception as e:
        logger.error(f"Image generation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Cost Tracking ====================

@app.get("/api/costs", response_model=CostReport)
async def get_costs():
    """Get cost report"""
    return cost_tracker.get_report()

@app.post("/api/costs/reset")
async def reset_costs():
    """Reset cost tracking"""
    cost_tracker.reset()
    return {"status": "reset"}

# ==================== Cache Management ====================

@app.get("/api/cache/stats")
async def cache_stats():
    """Get cache statistics"""
    return await cache_manager.get_stats()

@app.post("/api/cache/clear")
async def clear_cache():
    """Clear all caches"""
    await cache_manager.clear_all()
    return {"status": "cleared"}

# ==================== Preprocessing ====================

@app.post("/api/preprocess")
async def preprocess_video(
    file: UploadFile = File(...),
    compress: bool = True,
    max_size_mb: int = 50
):
    """
    Preprocess video before sending to Gemini
    - Compress if needed
    - Extract keyframes
    - Generate preview
    """
    try:
        temp_path = Path(f"/tmp/cinecritique_preprocess_{datetime.now().timestamp()}_{file.filename}")
        content = await file.read()
        temp_path.write_bytes(content)

        result = await video_processor.preprocess(
            str(temp_path),
            compress=compress,
            max_size_mb=max_size_mb
        )

        temp_path.unlink(missing_ok=True)

        return result

    except Exception as e:
        logger.error(f"Preprocessing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
