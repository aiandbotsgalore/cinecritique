/**
 * Debug Panel Component
 * Shows AI prompt inspection and cost tracking
 */
import React, { useState, useEffect } from 'react';
import { Code, DollarSign, X, Database, Zap } from 'lucide-react';
import { backendClient } from '../services/backendClient';
import { cacheService } from '../services/indexedDBCache';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DebugPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'costs' | 'cache'>('costs');
  const [costReport, setCostReport] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      // Load cost data
      if (backendClient.isAvailable()) {
        const costs = await backendClient.getCostReport();
        setCostReport(costs);
      }

      // Load cache data
      const stats = await cacheService.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load debug data:', error);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Clear all cached analyses?')) {
      await cacheService.clear();
      loadData();
    }
  };

  const handleResetCosts = async () => {
    if (confirm('Reset cost tracking?')) {
      await backendClient.resetCosts();
      loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Code className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">Debug Panel</h2>
              <p className="text-xs text-slate-400">Cost tracking & cache management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-4">
          <button
            onClick={() => setActiveTab('costs')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'costs' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <DollarSign size={16} className="inline mr-2" />
            Cost Tracking
            {activeTab === 'costs' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('cache')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'cache' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Database size={16} className="inline mr-2" />
            Cache Stats
            {activeTab === 'cache' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'costs' && (
            <div className="space-y-6">
              {costReport ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                        Total Spent
                      </p>
                      <p className="text-2xl font-bold text-indigo-400">
                        ${costReport.total_cost.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                        Cache Savings
                      </p>
                      <p className="text-2xl font-bold text-emerald-400">
                        ${costReport.costs_saved.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                        Cache Hit Rate
                      </p>
                      <p className="text-2xl font-bold text-blue-400">
                        {costReport.cache_hit_rate}%
                      </p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Cost Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(costReport.breakdown).map(([key, value]: [string, any]) => (
                        <div
                          key={key}
                          className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center"
                        >
                          <span className="text-sm text-slate-300 capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-mono text-indigo-400">
                            ${value.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={handleResetCosts}
                    className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm font-medium"
                  >
                    Reset Cost Tracking
                  </button>
                </>
              ) : (
                <div className="text-center text-slate-500 py-12">
                  <p>Backend not available</p>
                  <p className="text-sm mt-2">Start the Python backend to track costs</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cache' && (
            <div className="space-y-6">
              {cacheStats && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                        Cached Analyses
                      </p>
                      <p className="text-2xl font-bold text-indigo-400">
                        {cacheStats.entries}
                      </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                        Total Size
                      </p>
                      <p className="text-2xl font-bold text-blue-400">
                        {(cacheStats.totalSize / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-start gap-3">
                      <Zap className="text-emerald-400 mt-1" size={20} />
                      <div>
                        <h4 className="font-semibold text-slate-200 mb-1">
                          Cache Performance
                        </h4>
                        <p className="text-sm text-slate-400">
                          IndexedDB caching stores video analyses locally. Re-analyzing the same
                          video uses the cache instead of making expensive API calls.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={handleClearCache}
                    className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm font-medium"
                  >
                    Clear All Cache
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
