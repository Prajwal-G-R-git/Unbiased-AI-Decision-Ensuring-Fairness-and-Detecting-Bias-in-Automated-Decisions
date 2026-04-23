import React, { useState } from 'react';
import DataAnalysisModule from './components/DataAnalysisModule';
import ModelTrainingModule from './components/ModelTrainingModule';
import BiasMitigationModule from './components/BiasMitigationModule';
import WhatIfSimulation from './components/WhatIfSimulation';
import FairnessMetricsEngine from './components/FairnessMetricsEngine';
import ProxyBiasDetection from './components/ProxyBiasDetection';
import ExplainableAIModule from './components/ExplainableAIModule';
import VisualizationDashboard from './components/VisualizationDashboard';
import ReportGenerationModule from './components/ReportGenerationModule';
import EnterpriseDashboard from './components/EnterpriseDashboard';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  // Preloaded demo dataset handler (passed down to components if needed)
  const handleLoadDemo = () => {
    alert("Enterprise Feature: Connect this to your AWS S3 or public GitHub CSV links to auto-fill the file inputs.");
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 py-10">
            
            {/* Top Navigation / Controls */}
            <div className="max-w-6xl mx-auto px-4 mb-8 flex justify-end items-center space-x-4">
                <button onClick={handleLoadDemo} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Load Demo Dataset
                </button>
                <button 
                    onClick={() => setDarkMode(!darkMode)} 
                    className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2 rounded-full font-bold text-sm shadow transition-colors">
                    {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
            </div>

            <div className="max-w-6xl mx-auto px-4">
                <header className="mb-10 text-center">
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">AI Bias Auditor <span className="text-indigo-600 dark:text-indigo-400">Enterprise</span></h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Detect, visualize, explain, and mitigate bias in your datasets.</p>
                </header>

                <div className="space-y-12 pb-20">
                    <EnterpriseDashboard />
                    <DataAnalysisModule />
                    <ModelTrainingModule />
                    <BiasMitigationModule />
                    <WhatIfSimulation />
                    <FairnessMetricsEngine />
                    <ProxyBiasDetection />
                    <ExplainableAIModule />
                    <VisualizationDashboard />
                    <ReportGenerationModule />
                </div>
            </div>
        </div>
    </div>
  );
}

export default App;