import React, { useState } from 'react';

export default function WhatIfSimulation() {
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState('');
  const [sensitive, setSensitive] = useState('');
  const [modelType, setModelType] = useState('logistic_regression');
  
  // Simulation Controls
  const [removedFeatures, setRemovedFeatures] = useState('');
  const [rebalance, setRebalance] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_column', target);
    formData.append('sensitive_attribute', sensitive);
    formData.append('model_type', modelType);
    
    // Parse comma separated features to JSON array
    const dropArray = removedFeatures.split(',').map(s => s.trim()).filter(s => s);
    formData.append('removed_features', JSON.stringify(dropArray));
    formData.append('rebalance', rebalance);
    formData.append('threshold', threshold);

    try {
      const response = await fetch('http://localhost:8000/api/v1/simulate', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResults(data);
    } catch (err) {
      alert("Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-slate-200 mt-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">7. What-If Scenario Sandbox</h2>
      <p className="text-slate-600 mb-6">Manually tweak parameters to see how structural changes impact model fairness.</p>
      
      <form onSubmit={handleSimulate} className="mb-8">
        {/* Core Config */}
        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Dataset</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="mt-1 w-full text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Target</label>
            <input type="text" placeholder="income" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 border p-1.5 w-full rounded text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Sensitive Attr</label>
            <input type="text" placeholder="gender" value={sensitive} onChange={(e) => setSensitive(e.target.value)} className="mt-1 border p-1.5 w-full rounded text-sm" required />
          </div>
        </div>

        {/* Interactive Toggles */}
        <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6 space-y-5">
            <div>
                <label className="block font-bold text-slate-700 mb-1">Remove Proxy Features</label>
                <input type="text" placeholder="e.g., zip_code, past_arrests (comma separated)" value={removedFeatures} onChange={(e) => setRemovedFeatures(e.target.value)} className="border p-2 w-full rounded text-sm" />
                <p className="text-xs text-slate-500 mt-1">Strip variables that might leak demographic info to the model.</p>
            </div>

            <div className="flex items-center space-x-3">
                <input type="checkbox" id="rebalance" checked={rebalance} onChange={(e) => setRebalance(e.target.checked)} className="w-5 h-5 text-blue-600" />
                <label htmlFor="rebalance" className="font-bold text-slate-700 cursor-pointer">Force Dataset Rebalancing</label>
            </div>

            <div>
                <div className="flex justify-between items-end mb-1">
                    <label className="font-bold text-slate-700">Decision Threshold: <span className="text-blue-600 font-mono text-lg">{threshold}</span></label>
                </div>
                <input type="range" min="0.1" max="0.9" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Predicts Class 0 more easily</span>
                    <span>Default: 0.50</span>
                    <span>Predicts Class 1 more easily</span>
                </div>
            </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition-colors">
          {loading ? "Re-calculating..." : "Run Simulation"}
        </button>
      </form>

      {/* Results Dashboard */}
      {results && (
        <div className="grid grid-cols-3 gap-6 animate-fade-in border-t border-slate-200 pt-6">
          
          <div className="p-5 bg-white rounded border border-slate-200 text-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Baseline Score</h4>
            <div className="text-3xl font-mono text-slate-400">{results.baseline.score}</div>
          </div>

          <div className="p-5 bg-blue-50 rounded border border-blue-200 text-center transform scale-105 shadow-md">
            <h4 className="text-xs font-bold text-blue-500 uppercase mb-2">Simulated Score</h4>
            <div className="text-4xl font-black font-mono text-blue-700">{results.simulation.score}</div>
            <p className="text-xs text-blue-600 mt-2 font-bold">Accuracy: {(results.simulation.accuracy * 100).toFixed(1)}%</p>
          </div>

          <div className="p-5 bg-white rounded border border-slate-200 text-center flex flex-col justify-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Bias Change</h4>
            <div className={`text-2xl font-black ${results.impact.bias_change_pct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {results.impact.bias_change_pct > 0 ? '↓' : '↑'} {Math.abs(results.impact.bias_change_pct).toFixed(1)}%
            </div>
          </div>

        </div>
      )}
    </div>
  );
}