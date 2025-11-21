"""
Cost Tracker Service
Tracks AI API costs and provides analytics
"""
from typing import Dict, Any
from datetime import datetime
import json
from pathlib import Path

from utils.logger import get_logger

logger = get_logger(__name__)

class CostTracker:
    """Tracks costs for all AI operations"""

    # Cost per 1K tokens (approximate, update with current pricing)
    COST_PER_1K_TOKENS = {
        "gemini-3-pro-preview": 0.125,  # $0.125 per 1K tokens input
        "gemini-1.5-flash": 0.00001875,  # Much cheaper!
        "gemini-2.5-flash-image": 0.0003,
        "imagen-4.0-generate-001": 0.04,  # Per image
        "imagen-3.0-generate-001": 0.02,  # Cheaper alternative
        "local_llm": 0.0  # Free!
    }

    def __init__(self, persist_path: str = ".cache/costs.json"):
        self.persist_path = Path(persist_path)
        self.persist_path.parent.mkdir(exist_ok=True)

        # Load existing data
        if self.persist_path.exists():
            with open(self.persist_path, 'r') as f:
                data = json.load(f)
                self.total_cost = data.get("total_cost", 0.0)
                self.breakdown = data.get("breakdown", {})
                self.api_calls = data.get("api_calls", 0)
                self.cache_hits = data.get("cache_hits", 0)
        else:
            self.total_cost = 0.0
            self.breakdown = {}
            self.api_calls = 0
            self.cache_hits = 0

    def _save(self):
        """Persist cost data"""
        data = {
            "total_cost": self.total_cost,
            "breakdown": self.breakdown,
            "api_calls": self.api_calls,
            "cache_hits": self.cache_hits,
            "last_updated": datetime.now().isoformat()
        }
        with open(self.persist_path, 'w') as f:
            json.dump(data, f, indent=2)

    def record_analysis(
        self,
        provider: str,
        model: str,
        tokens: int = 0
    ) -> float:
        """Record video analysis cost"""
        if provider == "local_llm":
            cost = 0.0
        else:
            cost_per_1k = self.COST_PER_1K_TOKENS.get(model, 0.05)
            cost = (tokens / 1000) * cost_per_1k

        self.total_cost += cost
        self.api_calls += 1

        key = f"analysis_{provider}"
        self.breakdown[key] = self.breakdown.get(key, 0.0) + cost

        self._save()
        logger.info(f"Recorded analysis cost: ${cost:.4f} ({provider})")
        return cost

    def record_chat(
        self,
        provider: str,
        tokens: int = 0
    ) -> float:
        """Record chat cost"""
        if provider == "local_llm":
            cost = 0.0
        else:
            model = "gemini-1.5-flash"  # Default chat model
            cost_per_1k = self.COST_PER_1K_TOKENS.get(model, 0.00001875)
            cost = (tokens / 1000) * cost_per_1k

        self.total_cost += cost
        self.api_calls += 1

        key = f"chat_{provider}"
        self.breakdown[key] = self.breakdown.get(key, 0.0) + cost

        self._save()
        return cost

    def record_image_generation(
        self,
        provider: str,
        model: str = "imagen-3.0-generate-001"
    ) -> float:
        """Record image generation cost"""
        cost = self.COST_PER_1K_TOKENS.get(model, 0.02)

        self.total_cost += cost
        self.api_calls += 1

        key = "image_generation"
        self.breakdown[key] = self.breakdown.get(key, 0.0) + cost

        self._save()
        logger.info(f"Recorded image generation cost: ${cost:.4f}")
        return cost

    def record_cache_hit(self, operation: str):
        """Record cache hit (cost saved)"""
        self.cache_hits += 1
        self._save()

    def get_report(self) -> Dict[str, Any]:
        """Get cost report"""
        total_operations = self.api_calls + self.cache_hits
        cache_hit_rate = (self.cache_hits / total_operations * 100) if total_operations > 0 else 0

        # Estimate costs saved by caching
        avg_analysis_cost = 2.0  # Approximate cost of Gemini 3 Pro analysis
        costs_saved = self.cache_hits * avg_analysis_cost

        return {
            "total_cost": round(self.total_cost, 2),
            "breakdown": {k: round(v, 2) for k, v in self.breakdown.items()},
            "api_calls": self.api_calls,
            "cache_hits": self.cache_hits,
            "cache_hit_rate": round(cache_hit_rate, 2),
            "costs_saved": round(costs_saved, 2),
            "net_cost": round(self.total_cost - costs_saved, 2)
        }

    def reset(self):
        """Reset all tracking"""
        self.total_cost = 0.0
        self.breakdown = {}
        self.api_calls = 0
        self.cache_hits = 0
        self._save()
        logger.info("Cost tracking reset")

    def is_budget_exceeded(self, monthly_budget: float = 5.0) -> bool:
        """Check if monthly budget is exceeded"""
        return self.total_cost > monthly_budget

    def get_budget_status(self, monthly_budget: float = 5.0) -> Dict[str, Any]:
        """Get budget status"""
        remaining = monthly_budget - self.total_cost
        percent_used = (self.total_cost / monthly_budget * 100) if monthly_budget > 0 else 0

        return {
            "budget": monthly_budget,
            "spent": round(self.total_cost, 2),
            "remaining": round(remaining, 2),
            "percent_used": round(percent_used, 2),
            "exceeded": remaining < 0
        }
