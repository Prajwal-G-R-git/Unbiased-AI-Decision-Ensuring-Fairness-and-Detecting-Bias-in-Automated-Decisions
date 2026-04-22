import React from 'react';
import DataAnalysisModule from './components/DataAnalysisModule';
import ModelTrainingModule from './components/ModelTrainingModule';
import BiasMitigationModule from './components/BiasMitigationModule';
import FairnessMetricsEngine from './components/FairnessMetricsEngine';
import VisualizationDashboard from './components/VisualizationDashboard';

function App() {
  return (
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-6xl mx-auto px-4">
        
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">AI Bias Auditor</h1>
          <p className="mt-2 text-lg text-slate-600">Detect, visualize, and mitigate bias in your datasets</p>
        </header>

        <div className="space-y-12 pb-20">
            <DataAnalysisModule />
            <ModelTrainingModule />
            <BiasMitigationModule />
            <FairnessMetricsEngine />
            <VisualizationDashboard />
        </div>

      </div>
    </div>
  );
}

export default App;