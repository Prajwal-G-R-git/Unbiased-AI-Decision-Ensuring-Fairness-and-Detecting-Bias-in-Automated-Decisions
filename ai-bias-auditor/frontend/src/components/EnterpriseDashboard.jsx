import React, { useState, useEffect } from 'react';

export default function EnterpriseDashboard() {
  const [logs, setLogs] = useState([]);
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchResults, setBatchResults] = useState(null);
  
  const fetchLogs = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/logs');
      const data = await res.json();
      setLogs(data.logs);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Auto-refresh logs
    return () => clearInterval(interval);
  }, []);

  const handleBatch = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    for (let i = 0; i < batchFiles.length; i++) {
        formData.append('files', batchFiles[i]);
    }
    const res = await fetch('http://localhost:8000/api/v1/batch-analyze', { method: 'POST', body: formData });
    const data = await res.json();
    setBatchResults(data.batch_results);
    fetchLogs();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 mt-8 space-y-6">
      <h2 className="text-3xl font-extrabold dark:text-white">11. Enterprise Control Center</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* System Audit Logs */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg mb-4 flex justify-between dark:text-white">
                <span>System Audit Logs</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Live</span>
            </h3>
            <div className="h-64 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 rounded font-mono text-sm border dark:border-slate-700">
                {logs.length === 0 ? <p className="text-slate-500">No actions logged yet...</p> : 
                    logs.map((log, idx) => (
                        <div key={idx} className="mb-2 pb-2 border-b dark:border-slate-700 last:border-0">
                            <span className="text-slate-400">[{log.timestamp}]</span> 
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-2">{log.action}:</span> 
                            <span className="text-slate-700 dark:text-slate-300 ml-2">{log.details}</span>
                        </div>
                    ))
                }
            </div>
        </div>

        {/* Batch Processing */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg mb-4 dark:text-white">Batch Processing Engine</h3>
            <form onSubmit={handleBatch} className="space-y-4">
                <input type="file" multiple onChange={(e) => setBatchFiles(e.target.files)} className="block w-full text-sm border p-2 rounded dark:text-white dark:bg-slate-700" required />
                <button type="submit" className="w-full bg-slate-800 dark:bg-slate-600 text-white py-2 rounded font-bold hover:bg-slate-900">Run Batch Analysis</button>
            </form>
            
            {batchResults && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800">
                    <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-2">Batch Complete:</h4>
                    <ul className="text-sm dark:text-blue-100 list-disc pl-5">
                        {batchResults.map((r, i) => <li key={i}>{r.filename}: {r.rows} rows</li>)}
                    </ul>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}