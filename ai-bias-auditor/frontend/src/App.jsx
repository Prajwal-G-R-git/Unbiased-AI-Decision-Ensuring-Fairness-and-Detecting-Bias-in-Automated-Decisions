import React from 'react';
import DataAnalysisModule from './components/DataAnalysisModule';
import ModelTrainingModule from './components/ModelTrainingModule';
import BiasMitigationModule from './components/BiasMitigationModule';
import FairnessMetricsEngine from './components/FairnessMetricsEngine';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">AI Bias Auditor</h1>
          <p className="mt-2 text-lg text-gray-600">Detect, visualize, and mitigate bias in your datasets</p>
        </header>

        <div className="space-y-8 pb-20">
            <DataAnalysisModule />
            <ModelTrainingModule />
            <BiasMitigationModule />
            <FairnessMetricsEngine />
        </div>

      </div>
    </div>
  );
}

export default App;