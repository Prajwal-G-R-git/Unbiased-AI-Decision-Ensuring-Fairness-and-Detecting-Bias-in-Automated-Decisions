import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ExplainableAIModule() {
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState('');
  const [sensitive, setSensitive] = useState('');
  const [modelType, setModelType] = useState('decision_tree');
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExplain = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_column', target);
    formData.append('sensitive_attribute', sensitive);
    formData.append('model_type', modelType);

    try {
      const response = await fetch('http://localhost:8000/api/v1/explain', {
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

  const getChartData = () => {
    if (!results) return null;
    return {
      labels: results.top_features.labels,
      datasets: [
        {
          label: 'Feature Importance Weight',
          data: results.top_features.values,
          backgroundColor: results.top_features.labels.map(label => 
            label.includes(sensitive) ? 'rgba(239, 68, 68, 0.8)' : 'rgba(99, 102, 241, 0.8)'
          ),
          borderRadius: 4,
        }
      ]
    };
  };

  const chartOptions = {
    indexAxis: 'y', // Makes the bar chart horizontal
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Top 10 Most Influential Features' }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-slate-200 mt-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">8. Explainable AI (XAI)</h2>
      <p className="text-slate-600 mb-6">Peek inside the "black box" to see exactly which data points are driving the model's decisions.</p>
      
      <form onSubmit={handleExplain} className="mb-8 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-500 uppercase">Dataset</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="mt-1 w-full text-sm border p-2 rounded" required />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase">Model Type</label>
          <select value={modelType} onChange={(e) => setModelType(e.target.value)} className="mt-1 border p-2 w-full rounded text-sm bg-white">
            <option value="decision_tree">Decision Tree (Gini Importance)</option>
            <option value="logistic_regression">Logistic Regression (Absolute Coefficients)</option>
          </select>
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Target Column</label>
            <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 border p-2 w-full rounded text-sm" required />
        </div>

        <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">Sensitive Attribute (To check for direct bias)</label>
            <input type="text" value={sensitive} onChange={(e) => setSensitive(e.target.value)} className="mt-1 border p-2 w-full rounded text-sm" required />
        </div>

        <button type="submit" disabled={loading} className="col-span-2 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
          {loading ? "Extracting Feature Weights..." : "Analyze Feature Importance"}
        </button>
      </form>

      {error && <div className="bg-red-50 p-4 text-red-700 rounded mb-4">{error}</div>}

      {results && (
        <div className="animate-fade-in border-t border-slate-200 pt-6">
          
          <div className={`p-4 rounded mb-6 border ${results.explanation.sensitive_flagged ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className="font-bold text-lg mb-2 text-slate-800">Interpretation</h3>
            <p className="text-slate-700 mb-2"><strong>Primary Driver:</strong> {results.explanation.message}</p>
            <p className={`${results.explanation.sensitive_flagged ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                {results.explanation.bias_analysis}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <Bar data={getChartData()} options={chartOptions} />
          </div>

        </div>
      )}
    </div>
  );
}