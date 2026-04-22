import React, { useState } from 'react';

export default function FairnessMetricsEngine() {
  const [file, setFile] = useState(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [sensitiveAttr, setSensitiveAttr] = useState('');
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEvaluate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_column', targetColumn);
    formData.append('sensitive_attribute', sensitiveAttr);

    try {
      const response = await fetch('http://localhost:8000/api/v1/fairness-engine', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Evaluation failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to colorize the severity badge
  const getRiskColor = (level) => {
    if (level === 'Low') return 'bg-green-100 text-green-800 border-green-300';
    if (level === 'Medium') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">4. Deep Fairness Metrics Engine</h2>
      <p className="text-gray-600 mb-6">Translate complex bias math into clear, legally compliant risk assessments.</p>
      
      <form onSubmit={handleEvaluate} className="space-y-4 mb-8">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Dataset</label>
            <input type="file" accept=".csv, .xlsx" onChange={(e) => setFile(e.target.files[0])} className="mt-1 border p-2 w-full rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Column</label>
            <input type="text" placeholder="e.g., income" value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)} className="mt-1 border p-2 w-full rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sensitive Attribute</label>
            <input type="text" placeholder="e.g., gender" value={sensitiveAttr} onChange={(e) => setSensitiveAttr(e.target.value)} className="mt-1 border p-2 w-full rounded" required />
          </div>
        </div>
        
        <button type="submit" disabled={loading || !file} className="w-full bg-slate-800 text-white py-2 rounded hover:bg-slate-900 disabled:opacity-50 font-medium">
          {loading ? 'Crunching Metrics...' : 'Generate Fairness Scorecard'}
        </button>
      </form>

      {error && <div className="bg-red-50 p-4 text-red-700 rounded mb-4">{error}</div>}

      {results && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top Level Score Dashboard */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 bg-slate-50 p-6 rounded-lg border border-slate-200 flex flex-col items-center justify-center">
                <h3 className="text-sm font-bold text-slate-500 tracking-wider uppercase mb-2">Overall Fairness Score</h3>
                <div className="text-6xl font-black text-slate-800 mb-2">{results.score}</div>
                <div className="text-xs text-slate-400">Out of 100 (Higher is fairer)</div>
            </div>

            <div className="col-span-2 bg-white p-6 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Bias Risk Assessment</h3>
                    <span className={`px-4 py-1 rounded-full text-sm font-bold border ${getRiskColor(results.risk_level)}`}>
                        {results.risk_level} Risk
                    </span>
                </div>
                <p className="text-gray-700 leading-relaxed text-lg">
                    {results.human_readable_explanation}
                </p>
            </div>
          </div>

          {/* Detailed Metrics Grid */}
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mt-8">Raw Metric Breakdown</h3>
          <div className="grid grid-cols-3 gap-4">
            
            {/* DPD Card */}
            <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                <div className="font-mono text-2xl font-bold text-indigo-600 mb-1">
                    {results.metrics.demographic_parity_difference.value}
                </div>
                <h4 className="font-bold text-gray-800 mb-2">Demographic Parity Diff</h4>
                <p className="text-sm text-gray-600">{results.metrics.demographic_parity_difference.interpretation}</p>
            </div>

            {/* EOD Card */}
            <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                <div className="font-mono text-2xl font-bold text-indigo-600 mb-1">
                    {results.metrics.equal_opportunity_difference.value}
                </div>
                <h4 className="font-bold text-gray-800 mb-2">Equal Opportunity Diff</h4>
                <p className="text-sm text-gray-600">{results.metrics.equal_opportunity_difference.interpretation}</p>
            </div>

            {/* DIR Card */}
            <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                <div className="font-mono text-2xl font-bold text-indigo-600 mb-1">
                    {results.metrics.disparate_impact_ratio.value}
                </div>
                <h4 className="font-bold text-gray-800 mb-2">Disparate Impact Ratio</h4>
                <p className="text-sm text-gray-600">{results.metrics.disparate_impact_ratio.interpretation}</p>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}