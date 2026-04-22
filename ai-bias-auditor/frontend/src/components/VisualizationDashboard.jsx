import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function VisualizationDashboard() {
  // ----------------------------------------------------------------------
  // MOCK DATA: Simulating a model evaluating "Loan Approval" by "Gender"
  // ----------------------------------------------------------------------
  const data = {
    fairnessScore: 68,
    groups: ['Male', 'Female'],
    approvalRates: [42.5, 21.0], // % approved
    errorRates: {
      falsePositiveRate: [15.2, 8.4], // FPR
      falseNegativeRate: [10.5, 28.6] // FNR
    },
    confusionMatrices: {
      Male: { TP: 450, FP: 80, TN: 400, FN: 70 },
      Female: { TP: 120, FP: 30, TN: 350, FN: 100 }
    }
  };

  // ----------------------------------------------------------------------
  // CHART 1: Fairness Score Meter (Gauge Style using Half-Doughnut)
  // ----------------------------------------------------------------------
  const gaugeData = {
    labels: ['Score', 'Remaining'],
    datasets: [{
      data: [data.fairnessScore, 100 - data.fairnessScore],
      backgroundColor: [
        data.fairnessScore > 80 ? '#10b981' : data.fairnessScore > 60 ? '#f59e0b' : '#ef4444', 
        '#e2e8f0'
      ],
      borderWidth: 0,
      circumference: 180,
      rotation: 270,
    }]
  };
  const gaugeOptions = {
    responsive: true,
    cutout: '75%',
    plugins: { tooltip: { enabled: false }, legend: { display: false } }
  };

  // ----------------------------------------------------------------------
  // CHART 2: Approval Rate by Group
  // ----------------------------------------------------------------------
  const approvalData = {
    labels: data.groups,
    datasets: [
      {
        label: 'Positive Prediction Rate (%)',
        data: data.approvalRates,
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderRadius: 4,
      }
    ]
  };
  const approvalOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true, max: 100 } }
  };

  // ----------------------------------------------------------------------
  // CHART 3: Error Rate Comparison
  // ----------------------------------------------------------------------
  const errorData = {
    labels: data.groups,
    datasets: [
      {
        label: 'False Positive Rate (%)',
        data: data.errorRates.falsePositiveRate,
        backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
        borderRadius: 4,
      },
      {
        label: 'False Negative Rate (%)',
        data: data.errorRates.falseNegativeRate,
        backgroundColor: 'rgba(245, 158, 11, 0.8)', // Orange
        borderRadius: 4,
      }
    ]
  };
  const errorOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true, max: 50 } }
  };

  // ----------------------------------------------------------------------
  // RENDER UI
  // ----------------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto p-6 mt-8 bg-slate-50 rounded-lg shadow-inner border border-slate-200">
      <h2 className="text-3xl font-extrabold text-slate-800 mb-2">5. Visual Bias Dashboard</h2>
      <p className="text-slate-600 mb-8">Interactive visual breakdown of disparate impact and error distribution across sensitive groups.</p>

      {/* TOP ROW: Gauge & Approval Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Fairness Gauge */}
        <div className="col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative">
          <h3 className="font-bold text-slate-700 mb-4 w-full text-center border-b pb-2">Overall Fairness Score</h3>
          <div className="relative w-full max-w-[200px] mt-4">
            <Doughnut data={gaugeData} options={gaugeOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
              <span className="text-4xl font-black text-slate-800">{data.fairnessScore}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Out of 100</span>
            </div>
          </div>
        </div>

        {/* Approval Rates */}
        <div className="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Approval Rates (Demographic Parity)</h3>
          <div className="h-64 w-full flex justify-center">
            <Bar data={approvalData} options={approvalOptions} />
          </div>
          <p className="text-sm text-slate-500 mt-2 text-center">Comparing how often each group receives the positive outcome.</p>
        </div>

      </div>

      {/* BOTTOM ROW: Error Rates & Confusion Matrices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Error Rates */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Error Rates (Equalized Odds)</h3>
          <div className="h-64 w-full">
            <Bar data={errorData} options={errorOptions} />
          </div>
          <p className="text-sm text-slate-500 mt-4 leading-relaxed">
            <strong>FPR:</strong> Group incorrectly got the positive outcome.<br/>
            <strong>FNR:</strong> Group incorrectly denied the positive outcome (often the most harmful bias).
          </p>
        </div>

        {/* Grouped Confusion Matrix */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Confusion Matrix Split</h3>
          
          <div className="grid grid-cols-2 gap-4 flex-grow">
            {data.groups.map(group => (
              <div key={group} className="bg-slate-50 p-3 rounded border border-slate-200">
                <h4 className="font-bold text-center text-indigo-800 mb-3 bg-indigo-100 py-1 rounded">{group}</h4>
                <table className="w-full text-center text-sm">
                  <tbody>
                    <tr>
                      <td className="p-2 border bg-green-50 text-green-800 font-mono"><span className="block text-xs text-green-600/70">TP</span>{data.confusionMatrices[group].TP}</td>
                      <td className="p-2 border bg-red-50 text-red-800 font-mono"><span className="block text-xs text-red-600/70">FP</span>{data.confusionMatrices[group].FP}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border bg-red-50 text-red-800 font-mono"><span className="block text-xs text-red-600/70">FN</span>{data.confusionMatrices[group].FN}</td>
                      <td className="p-2 border bg-blue-50 text-blue-800 font-mono"><span className="block text-xs text-blue-600/70">TN</span>{data.confusionMatrices[group].TN}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}