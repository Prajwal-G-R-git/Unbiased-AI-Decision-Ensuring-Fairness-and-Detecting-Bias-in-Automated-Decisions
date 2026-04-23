import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ProxyBiasDetection() {
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState('');
  const [sensitive, setSensitive] = useState('');
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDetect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_column', target);
    formData.append('sensitive_attribute', sensitive);

    try {
      const response = await fetch('http://localhost:8000/api/v1/proxies', {
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

  // Dynamic color coding for the "heatmap" effect
  const getColor = (score) => {
    if (score > 0.7) return 'rgba(220, 38, 38, 0.9)'; // Dark Red (High Danger)
    if (score > 0.4) return 'rgba(245, 158, 11, 0.8)'; // Orange (Warning)
    return 'rgba(148, 163, 184, 0.6)'; // Gray (Safe)
  };

  const getChartData = () => {
    if (!results) return null;
    return {
      labels: results.features,
      datasets: [
        {
          label: `Correlation with ${sensitive}`,
          data: results.correlation_scores,
          backgroundColor: results.correlation_scores.map(score => getColor(score)),
          borderRadius: 4,
        }
      ]
    };
  };

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    scales: {
        x: { min: 0, max: 1, title: { display: true, text: 'Absolute Correlation Score (0 to 1)' } }
    },
    plugins: {
      legend: { display: false },
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-slate-200 mt-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">9. Proxy Variable Detection</h2>
      <p className="text-slate-600 mb-6">Identify features that are secretly leaking sensitive demographic information into your model.</p>
      
      <form onSubmit={handleDetect} className="mb-8 grid grid-cols-3 gap-4 border-b border-slate-200 pb-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase">Dataset</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="mt-1 w-full text-sm border p-2 rounded" required />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Target Column</label>
            <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 border p-2 w-full rounded text-sm" required />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Sensitive Attribute</label>
            <input type="text" value={sensitive} onChange={(e) => setSensitive(e.target.value)} className="mt-1 border p-2 w-full rounded text-sm" required />
        </div>
        <button type="submit" disabled={loading} className="col-span-3 bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition-colors">
          {loading ? "Scanning for Proxies..." : "Run Correlation Scan"}
        </button>
      </form>

      {error && <div className="bg-red-50 p-4 text-red-700 rounded mb-4">{error}</div>}

      {results && (
        <div className="animate-fade-in space-y-6">
          
          {/* Danger Alerts */}
          {results.flagged_proxies.length > 0 ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                <h3 className="font-bold text-red-800 mb-2">⚠️ High-Risk Proxies Detected</h3>
                <p className="text-sm text-red-700 mb-3">These features are highly correlated (&gt;0.4) with '{sensitive}'. Consider removing them using the What-If Simulator.</p>
                <ul className="list-disc pl-5 text-sm text-red-800 font-mono">
                    {results.flagged_proxies.map(p => (
                        <li key={p.feature}>{p.feature} <span className="text-red-500 ml-2">(Score: {p.correlation_score})</span></li>
                    ))}
                </ul>
            </div>
          ) : (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
                <h3 className="font-bold text-green-800">✅ No Obvious Proxies Detected</h3>
                <p className="text-sm text-green-700">No remaining features have a correlation higher than {results.threshold_used} with '{sensitive}'.</p>
            </div>
          )}

          {/* Heatmap Bar Chart */}
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 text-center">Correlation Heatmap: {sensitive}</h3>
            <Bar data={getChartData()} options={chartOptions} />
          </div>

        </div>
      )}
    </div>
  );
}