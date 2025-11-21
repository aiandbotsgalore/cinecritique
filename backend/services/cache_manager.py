"""
Cache Manager Service
Handles caching with diskcache (simple, persistent, no Redis dependency)
"""
from diskcache import Cache
from pathlib import Path
import json
from typing import Any, Optional, Dict
import asyncio
from datetime import datetime

from utils.logger import get_logger

logger = get_logger(__name__)

class CacheManager:
    """Manages persistent disk-based caching"""

    def __init__(self, cache_dir: str = ".cache"):
        self.cache_path = Path(cache_dir)
        self.cache_path.mkdir(exist_ok=True)

        self.cache = Cache(str(self.cache_path))
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0
        }

    def is_healthy(self) -> bool:
        """Check cache health"""
        try:
            self.cache.check()
            return True
        except Exception:
            return False

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = self.cache.get(key)
            if value is not None:
                self.stats["hits"] += 1
                logger.debug(f"Cache hit: {key}")
            else:
                self.stats["misses"] += 1
                logger.debug(f"Cache miss: {key}")
            return value
        except Exception as e:
            logger.error(f"Cache get failed: {str(e)}")
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL (seconds)"""
        try:
            if ttl:
                self.cache.set(key, value, expire=ttl)
            else:
                self.cache.set(key, value)
            self.stats["sets"] += 1
            logger.debug(f"Cache set: {key} (TTL: {ttl})")
            return True
        except Exception as e:
            logger.error(f"Cache set failed: {str(e)}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            return self.cache.delete(key)
        except Exception as e:
            logger.error(f"Cache delete failed: {str(e)}")
            return False

    async def clear_all(self) -> bool:
        """Clear all cache entries"""
        try:
            self.cache.clear()
            logger.info("Cache cleared")
            return True
        except Exception as e:
            logger.error(f"Cache clear failed: {str(e)}")
            return False

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total * 100) if total > 0 else 0

        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "sets": self.stats["sets"],
            "hit_rate": f"{hit_rate:.2f}%",
            "size_mb": self.cache.volume() / (1024 * 1024),
            "entries": len(self.cache)
        }

    def __del__(self):
        """Cleanup on deletion"""
        try:
            self.cache.close()
        except Exception:
            pass
