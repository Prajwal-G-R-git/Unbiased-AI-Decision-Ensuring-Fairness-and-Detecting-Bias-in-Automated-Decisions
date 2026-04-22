import React, { useState } from 'react';

export default function ModelTrainingModule() {
  const [file, setFile] = useState(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [sensitiveAttrs, setSensitiveAttrs] = useState('');
  const [modelType, setModelType] = useState('logistic_regression');
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrain = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_column', targetColumn);
    formData.append('model_type', modelType);
    
    const sensitiveArray = sensitiveAttrs.split(',').map(s => s.trim()).filter(s => s);
    formData.append('sensitive_attributes', JSON.stringify(sensitiveArray));

    try {
      const response = await fetch('http://localhost:8000/api/v1/train', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Training failed');
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
    <div className="max-w-4xl mx-auto p-6 mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">2. Model Training & Predictions</h2>
      
      <form onSubmit={handleTrain} className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Dataset</label>
            <input type="file" accept=".csv, .xlsx" onChange={(e) => setFile(e.target.files[0])} className="mt-1 border p-2 w-full rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Model Type</label>
            <select value={modelType} onChange={(e) => setModelType(e.target.value)} className="mt-1 border p-2 w-full rounded bg-white">
              <option value="logistic_regression">Logistic Regression</option>
              <option value="decision_tree">Decision Tree</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Column</label>
            <input type="text" placeholder="e.g., income" value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)} className="mt-1 border p-2 w-full rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sensitive Attributes</label>
            <input type="text" placeholder="e.g., gender, race" value={sensitiveAttrs} onChange={(e) => setSensitiveAttrs(e.target.value)} className="mt-1 border p-2 w-full rounded" required />
          </div>
        </div>
        
        <button type="submit" disabled={loading || !file} className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50">
          {loading ? 'Training Model...' : 'Train Model'}
        </button>
      </form>

      {error && <div className="bg-red-50 p-4 text-red-700 rounded mb-4">{error}</div>}

      {results && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 gap-6">
            
            {/* Accuracy Metric */}
            <div className="p-5 bg-gray-50 rounded border border-gray-200 flex flex-col justify-center items-center">
              <h3 className="font-medium text-gray-600 mb-1">Overall Accuracy</h3>
              <p className="text-4xl font-extrabold text-gray-900">
                {(results.metrics.accuracy * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-2">Using {results.model_type.replace('_', ' ')}</p>
            </div>

            {/* Confusion Matrix */}
            <div className="p-5 bg-white rounded border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-4 border-b pb-2">Confusion Matrix</h3>
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    <th className="p-2 text-sm text-gray-500 border-b">Pred: {results.target_classes[0]}</th>
                    <th className="p-2 text-sm text-gray-500 border-b">Pred: {results.target_classes[1]}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="p-2 text-sm text-gray-500 text-right border-r">Actual: {results.target_classes[0]}</th>
                    <td className="p-2 bg-blue-50 font-mono font-bold">{results.metrics.confusion_matrix[0][0]}</td>
                    <td className="p-2 bg-red-50 font-mono">{results.metrics.confusion_matrix[0][1]}</td>
                  </tr>
                  <tr>
                    <th className="p-2 text-sm text-gray-500 text-right border-r">Actual: {results.target_classes[1]}</th>
                    <td className="p-2 bg-red-50 font-mono">{results.metrics.confusion_matrix[1][0]}</td>
                    <td className="p-2 bg-blue-50 font-mono font-bold">{results.metrics.confusion_matrix[1][1]}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Predictions Preview Table */}
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">Prediction Log (Ready for Fairness Analysis)</h3>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-3 font-medium text-gray-600">Actual</th>
                    <th className="p-3 font-medium text-gray-600">Predicted</th>
                    <th className="p-3 font-medium text-gray-600">Match?</th>
                    <th className="p-3 font-medium text-gray-600">Sensitive Attributes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.predictions_preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 font-mono">{results.target_classes[row.actual]}</td>
                      <td className="p-3 font-mono">{results.target_classes[row.predicted]}</td>
                      <td className="p-3">
                        {row.actual === row.predicted ? '✅' : '❌'}
                      </td>
                      <td className="p-3 text-gray-600 font-mono text-xs">
                        {JSON.stringify(row.sensitive_attributes).replace(/[{""}]/g, '').replace(/:/g, ': ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}