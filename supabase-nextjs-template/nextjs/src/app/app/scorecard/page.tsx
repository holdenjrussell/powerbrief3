// ... existing code ...
                          {dateRanges.map((range, index) => {
                            const metricPeriodData = liveData[metric.id]?.[range.label];
                            let displayValue: string | number = 'N/A';
                            let titleForError: string | undefined = undefined;

                            if (loadingStates[metric.id]) {
                              displayValue = 'Loading...';
                            } else if (errorStates[metric.id] && (!metricPeriodData || ('error' in metricPeriodData && Object.keys(metricPeriodData).length <= 2)) ) {
                                displayValue = 'Error';
                                titleForError = errorStates[metric.id] || 'General fetch error';
                                if (metricPeriodData && 'error' in metricPeriodData) {
                                    const errorObj = metricPeriodData as { error: string; details?: string };
                                    titleForError = errorObj.details || errorObj.error;
                                }
                            } else if (metricPeriodData && !('error' in metricPeriodData)) {
                              const dataForPeriod = metricPeriodData as FetchedPeriodData; // Cast to actual data type
                              if (metric.formula && metric.formula.length > 0) {
                                let calculatedValue: number | null = null;
                                const firstMetaMetricId = metric.formula.find(item => item.type === 'metric')?.value;

                                if (firstMetaMetricId && typeof dataForPeriod[firstMetaMetricId] === 'number') {
                                  calculatedValue = dataForPeriod[firstMetaMetricId];
                                }
                                
                                if (calculatedValue !== null) {
                                   displayValue = calculatedValue;
                                   if (metric.goalUnit === 'currency') displayValue = `$${displayValue.toFixed(2)}`;
                                   else if (metric.goalUnit === 'percentage') {
                                     if (firstMetaMetricId === 'ctr') {
                                        displayValue = `${displayValue.toFixed(2)}%`;
                                     } else {
                                        displayValue = `${(calculatedValue * 100).toFixed(1)}%`;
                                     }
                                   } 
                                   else if (metric.goalUnit === 'number') displayValue = calculatedValue.toFixed(metric.trailingCalculation === 'average' ? 2 : 0);
                                } else {
                                    displayValue = 'N/A'; 
                                }
                              } else {
                                displayValue = 'N/A';
                              }
                            } else if (metric.dataSource === 'manual_input' && metric.manualData?.find(d => d.period === range.label)?.value !== undefined) {
                                const manualEntry = metric.manualData.find(d => d.period === range.label)!;
                                displayValue = manualEntry.value;
                            } else if (metric.dataSource === 'live_meta' && !errorStates[metric.id]) {
                              displayValue = 'N/A';
                            }

                            return (
// ... rest of the component ...

            onClick={() => {
                console.log('[ScorecardPage] Clicked main Create New Metric button');
                const defaultMetric: NewMetric = {
                    id: '', // Will be set when saving
                    title: '',
// ... existing code ...
                    setCurrentFormula([]); // Ensure formula state is reset for new metric
                    setCurrentDataSource('live_meta');
                    setIsAddMetricSheetOpen(true);
            }}
// ... existing code ...
                        onClick={() => {
                            console.log('[ScorecardPage] Clicked empty state Create New Metric button');
                            const defaultMetric: NewMetric = {
                                id: '',
                                title: '',
// ... existing code ...
                            setCurrentFormula([]); // Ensure formula state is reset for new metric
                            setCurrentDataSource('live_meta');
                            setIsAddMetricSheetOpen(true);
                        }}
// ... existing code ...
  const handleSaveMetric = (metricToSave: NewMetric) => {
    console.log('[ScorecardPage] handleSaveMetric called with:', JSON.parse(JSON.stringify(metricToSave)));
    const newMetricWithId = editingMetric?.id 
                            ? metricToSave 
                            : { ...metricToSave, id: Date.now().toString(), formula: currentFormula };
    console.log('[ScorecardPage] Metric object to be saved/updated:', JSON.parse(JSON.stringify(newMetricWithId)));

    if (editingMetric?.id) {
      console.log(`[ScorecardPage] Updating existing metric, ID: ${newMetricWithId.id}`);
      setMetrics(prevMetrics => 
        prevMetrics.map(m => (m.id === newMetricWithId.id ? newMetricWithId : m))
      );
    } else {
      console.log(`[ScorecardPage] Adding new metric, generating ID: ${newMetricWithId.id}`);
      setMetrics(prevMetrics => [...prevMetrics, newMetricWithId]);
    }

    // Clear out any existing live data for this metric to trigger a fresh fetch if needed
// ... existing code ...
  const handleAddToFormula = (item: FormulaItem) => {
    console.log('[ScorecardPage] handleAddToFormula, item:', item, 'Current editingMetric:', editingMetric ? JSON.parse(JSON.stringify(editingMetric)) : null);
    setCurrentFormula(prevFormula => [...prevFormula, item]);
  };

// ... existing code ...
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsAddMetricSheetOpen(false)}>Cancel</Button>
            <Button 
                onClick={() => {
                    console.log('[ScorecardPage] Save/Create button in SheetFooter clicked. Current editingMetric:', editingMetric ? JSON.parse(JSON.stringify(editingMetric)) : null, 'Current formula in state:', currentFormula);
                    if (editingMetric) {
                        const metricToSave: NewMetric = {
                            ...editingMetric,
                            formula: currentFormula,
                        };
                        if (!metricToSave.title || metricToSave.title.trim() === '') {
                            alert('Metric title is required.');
                            console.log('[ScorecardPage] Metric title is missing.');
                            return;
                        }
                        if (!metricToSave.dataSource) {
                             console.warn('[ScorecardPage] dataSource was null/undefined, defaulting to live_meta');
                             metricToSave.dataSource = 'live_meta';
                        }
                        handleSaveMetric(metricToSave);
                    } else {
                        console.error('[ScorecardPage] Save button clicked but editingMetric is null.');
                    }
                }}
                disabled={!editingMetric?.title}
            >
                {editingMetric?.id ? 'Save Changes' : 'Create Metric'}
            </Button>
          </SheetFooter>
// ... existing code ...

useEffect(() => {
    if (metrics.length > 0) {
        console.log('[ScorecardPage] Metrics state updated. Current metrics:', JSON.parse(JSON.stringify(metrics)));
    }
}, [metrics]);

// ... existing code ...
