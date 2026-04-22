import React, { useState } from 'react';

export default function BiasMitigationModule() {
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState('');
  const [sensitive, setSensitive] = useState('');
  const [technique, setTechnique] = useState('reweighing');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const onRun = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_column', target);
    formData.append('sensitive_attribute', sensitive);
    formData.append('model_type', 'logistic_regression');
    formData.append('technique', technique);

    try {
      const response = await fetch('http://localhost:8000/api/v1/mitigate', { method: 'POST', body: formData });
      setResults(await response.json());
    } catch (err) { alert("Error connecting to server"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-slate-200 mt-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Bias Mitigation Module</h2>
      
      <form onSubmit={onRun} className="grid grid-cols-2 gap-4 mb-8">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700">Upload Dataset</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="mt-1 block w-full text-sm border p-2 rounded" required />
        </div>
        <input type="text" placeholder="Target (e.g. loan_status)" value={target} onChange={(e) => setTarget(e.target.value)} className="border p-2 rounded" required />
        <input type="text" placeholder="Sensitive (e.g. gender)" value={sensitive} onChange={(e) => setSensitive(e.target.value)} className="border p-2 rounded" required />
        
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700">Mitigation Strategy</label>
          <select value={technique} onChange={(e) => setTechnique(e.target.value)} className="mt-1 block w-full border p-2 rounded bg-white">
            <option value="reweighing">Reweighing (Pre-processing)</option>
            <option value="remove_features">Feature Removal (Pre-processing)</option>
            <option value="threshold_adjustment">Threshold Optimizer (Post-processing)</option>
          </select>
        </div>

        <button type="submit" className="col-span-2 bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700">
          {loading ? "Mitigating..." : "Apply & Retrain Model"}
        </button>
      </form>

      {results && (
        <div className="grid grid-cols-2 gap-6 animate-fade-in border-t pt-6">
          <div className="p-4 bg-slate-50 rounded border text-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Original Bias</h4>
            <div className="text-3xl font-black text-red-500">{results.before.bias}</div>
            <p className="text-xs text-slate-500 mt-1">Accuracy: {(results.before.accuracy * 100).toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded border border-indigo-200 text-center">
            <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2">Mitigated Bias</h4>
            <div className="text-3xl font-black text-indigo-600">{results.after.bias}</div>
            <p className="text-xs text-indigo-500 mt-1">Accuracy: {(results.after.accuracy * 100).toFixed(1)}%</p>
          </div>
          <div className="col-span-2 bg-emerald-50 p-3 rounded text-center text-emerald-800 text-sm font-bold">
            Bias reduced by {Math.round(results.improvement.bias_reduced * 100)}% through {technique.replace('_', ' ')}
          </div>
        </div>
      )}
    </div>
  );
}