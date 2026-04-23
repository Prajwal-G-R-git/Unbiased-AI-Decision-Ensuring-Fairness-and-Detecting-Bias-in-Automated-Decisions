import React, { useState } from 'react';

export default function ReportGenerationModule() {
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState('');
  const [sensitive, setSensitive] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownloadReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_column', target);
    formData.append('sensitive_attribute', sensitive);

    try {
      const response = await fetch('http://localhost:8000/api/v1/report', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Report generation failed');
      }

      // Convert the response to a Blob for downloading
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger the click to force download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `AI_Bias_Report_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-slate-900 text-white rounded-xl shadow-xl mt-8 mb-20 border border-slate-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex-1">
            <h2 className="text-3xl font-extrabold mb-2">10. Official Audit Report</h2>
            <p className="text-slate-400">Generate a comprehensive, compliance-ready PDF summarizing dataset findings, fairness metrics, and algorithmic risk.</p>
          </div>

          <form onSubmit={handleDownloadReport} className="bg-slate-800 p-5 rounded-lg border border-slate-600 w-full md:w-[400px]">
            <div className="space-y-4 mb-5">
                <div>
                <label className="block text-xs font-bold text-slate-400 uppercase">Dataset</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} className="mt-1 w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-slate-700 file:text-white" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">Target Column</label>
                    <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 bg-slate-700 border border-slate-600 p-2 w-full rounded text-sm text-white" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">Sensitive Attribute</label>
                    <input type="text" value={sensitive} onChange={(e) => setSensitive(e.target.value)} className="mt-1 bg-slate-700 border border-slate-600 p-2 w-full rounded text-sm text-white" required />
                </div>
            </div>
            
            <button type="submit" disabled={loading || !file} className="w-full bg-indigo-500 text-white py-3 rounded font-bold hover:bg-indigo-600 transition-colors shadow-lg flex items-center justify-center gap-2">
              {loading ? (
                <span>Generating PDF...</span>
              ) : (
                <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    <span>Download Report</span>
                </>
              )}
            </button>

            {error && <div className="mt-4 bg-red-900/50 border border-red-500 p-3 text-red-200 text-sm rounded">{error}</div>}
          </form>

      </div>
    </div>
  );
}