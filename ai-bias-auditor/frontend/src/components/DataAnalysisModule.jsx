import React, { useState } from 'react';

export default function DataAnalysisModule() {
  const [file, setFile] = useState(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [sensitiveAttrs, setSensitiveAttrs] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_column', targetColumn);
    
    // Convert comma-separated string to JSON array
    const sensitiveArray = sensitiveAttrs.split(',').map(s => s.trim()).filter(s => s);
    formData.append('sensitive_attributes', JSON.stringify(sensitiveArray));

    try {
      const response = await fetch('http://localhost:8000/api/v1/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Analysis failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">1. Data Upload & Analysis</h1>

      {/* Upload Form */}
      <form onSubmit={handleAnalyze} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Dataset (CSV/Excel)</label>
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Column</label>
            <input 
              type="text" 
              placeholder="e.g., income"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sensitive Attributes</label>
            <input 
              type="text" 
              placeholder="e.g., gender, race"
              value={sensitiveAttrs}
              onChange={(e) => setSensitiveAttrs(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={!file || loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Analyzing...' : 'Run Bias Analysis'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Results Dashboard */}
      {results && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Warnings Panel */}
          {results.warnings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Bias & Quality Warnings</h2>
              {results.warnings.map((warn, idx) => (
                <div key={idx} className={`p-4 rounded-r-md border-l-4 ${
                  warn.severity === 'high' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-yellow-50 border-yellow-500 text-yellow-800'
                }`}>
                  <strong>{warn.type}:</strong> {warn.message}
                </div>
              ))}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Dataset Overview</h3>
              <p className="text-gray-600">Rows: <span className="font-mono font-bold text-black">{results.dataset_summary.total_rows}</span></p>
              <p className="text-gray-600">Columns: <span className="font-mono font-bold text-black">{results.dataset_summary.total_columns}</span></p>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium mb-4 text-gray-800 border-b pb-2">Target Distribution</h3>
              {Object.entries(results.distributions.target_class.proportions).map(([className, prop]) => (
                <div key={className} className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{className}</span>
                  <span className="font-mono font-bold">{(prop * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}