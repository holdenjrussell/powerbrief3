"use client";
import React, { useState } from 'react';
import AdBatchCreator from '@/components/ad-upload-tool/AdBatchCreator';
import AdSheetView from '@/components/ad-upload-tool/AdSheetView';

// Define DefaultValues interface (can be moved to a types file later)
interface DefaultValues {
  brandId: string | null;
  fbPage: string;
  igAccount: string;
  urlParams: string;
  pixel: string;
  status: 'ACTIVE' | 'PAUSED';
}

const AdUploadToolPage = () => {
  const [currentDefaults, setCurrentDefaults] = useState<DefaultValues | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const handleDefaultsSet = (defaults: DefaultValues) => {
    setCurrentDefaults(defaults);
    setShowSheet(true);
  };

  const handleGoBackToConfig = () => {
    setShowSheet(false);
    setCurrentDefaults(null);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Ad Upload Tool</h1>
        <p className="text-gray-600">Streamline your ad creation and launching process.</p>
      </header>

      {!showSheet ? (
        <AdBatchCreator onDefaultsSet={handleDefaultsSet} />
      ) : (
        currentDefaults && <AdSheetView defaults={currentDefaults} onGoBack={handleGoBackToConfig} />
      )}
    </div>
  );
};

export default AdUploadToolPage; 