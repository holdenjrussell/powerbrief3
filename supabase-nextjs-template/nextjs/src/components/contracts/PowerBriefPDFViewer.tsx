'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Rnd, type DraggableData, type ResizableDelta, type Position } from 'react-rnd';
import { useDroppable } from '@dnd-kit/core';
import { createPortal } from 'react-dom';

// Robust PDF.js worker setup
if (typeof window !== 'undefined') {
  // Use CDN with matching version to API (4.8.69)
  const workerSrcToUse = 'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';
  console.log(`[PDFViewer] Setting PDF.js worker to CDN: ${workerSrcToUse}`);

  if (pdfjs.GlobalWorkerOptions.workerSrc !== workerSrcToUse) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrcToUse;
    console.log(`[PDFViewer] PDF.js worker set successfully`);
  }
}

interface PDFViewerProps {
  documentData: {
    id: string;
    data: Uint8Array | string;
  };
  onDocumentLoad?: () => void;
  className?: string;
  showToolbar?: boolean;
  enableFieldPlacement?: boolean;
  onFieldPlace?: (field: FieldPlacement) => void;
  fields?: ContractField[];
  selectedFieldType?: string | null;
  selectedRecipient?: { id: string; email: string; name: string } | null;
  onFieldUpdate?: (updatedField: Partial<ContractField> & { id: string }) => void;
  onFieldSelect?: (fieldId: string | null) => void;
  selectedFieldId?: string | null;
  
  // New props for signing mode
  isSigningMode?: boolean;
  renderInteractiveElement?: (field: ContractField) => React.ReactNode;
}

interface FieldPlacement {
  id: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  recipientId: string;
  recipientEmail: string;
}

interface ContractField {
  id: string;
  type: string;
  page: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  recipientId: string;
  recipientEmail: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
}

// For storing original page dimensions
interface PageDimensions {
  width: number;
  height: number;
}

// Define ResizeDirection type as react-rnd doesn't export it directly
type ResizeDirection = 
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

export default function PowerBriefPDFViewer({
  documentData,
  onDocumentLoad,
  className = '',
  showToolbar = true,
  enableFieldPlacement = false,
  onFieldPlace,
  fields = [],
  selectedFieldType = null,
  selectedRecipient = null,
  onFieldUpdate,
  onFieldSelect,
  selectedFieldId,
  isSigningMode = false,
  renderInteractiveElement,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlacingField, setIsPlacingField] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<Record<number, PageDimensions>>({});
  const [isPdfReady, setIsPdfReady] = useState(false);

  console.log('[PDFViewer] Props:', { documentDataId: documentData?.id, enableFieldPlacement, fieldsLength: fields.length, selectedFieldType, selectedRecipientId: selectedRecipient?.id, selectedFieldId, isSigningMode });

  // Convert documentData to usable format with proper memoization
  const documentSource = React.useMemo(() => {
    if (typeof documentData.data === 'string') {
      return documentData.data;
    }
    // Create a stable reference for the data object
    return { data: documentData.data };
  }, [documentData.id, documentData.data]); // Include id to ensure proper updates when document changes

  const onDocumentLoadSuccess = useCallback(({ numPages }: any) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
    setPageDimensions({});
    setIsPdfReady(true);
    onDocumentLoad?.();
  }, [onDocumentLoad]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF Load Error:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (errorMessage.includes('worker')) {
      errorMessage = 'PDF worker failed to load. This might be due to network restrictions or security settings.';
    } else if (errorMessage.includes('fetch')) {
      errorMessage = 'Failed to fetch PDF content. Please check your network connection.';
    } else if (errorMessage.includes('Invalid PDF')) {
      errorMessage = 'The uploaded file is not a valid PDF document.';
    }
    
    setError(`Failed to load PDF: ${errorMessage}`);
    setIsLoading(false);
  }, []);

  // Handle field placement
  const handlePageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!enableFieldPlacement || !selectedFieldType || !selectedRecipient || !onFieldPlace) {
      return;
    }
    // Prevent placing field if click is on an existing field (handled by DraggableField's stopPropagation)
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).classList.contains('react-pdf__Page')) {
        // If the click target is not the page itself but a child (like a field), and not the direct Page canvas/svg
        // This check might need refinement based on exact event target from Rnd.
        // The primary defense is stopPropagation in DraggableField.
    }

    const pageElement = event.currentTarget;
    const rect = pageElement.getBoundingClientRect();
    const pageNumber = parseInt(pageElement.getAttribute('data-page-number') || '1');

    // Calculate relative position
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Default field dimensions (as percentage of page)
    const defaultWidth = 15; // 15% of page width
    const defaultHeight = 3; // 3% of page height

    const fieldPlacement: FieldPlacement = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: selectedFieldType,
      page: pageNumber,
      x: Math.max(0, x - defaultWidth / 2), // Center horizontally
      y: Math.max(0, y - defaultHeight / 2), // Center vertically
      width: defaultWidth,
      height: defaultHeight,
      recipientId: selectedRecipient.id,
      recipientEmail: selectedRecipient.email,
    };

    onFieldPlace(fieldPlacement);
  }, [enableFieldPlacement, selectedFieldType, selectedRecipient, onFieldPlace]);

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3));
  const resetZoom = () => setScale(1.0);

  // Page navigation
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));

  // Callback for when a page's dimensions are loaded
  const onPageLoadSuccessInternal = useCallback((page: any) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageDimensions(prev => ({
      ...prev,
      [page.pageNumber]: { width: viewport.width, height: viewport.height },
    }));
    // Call the original onDocumentLoad if it was meant for the first page or similar logic (if needed)
    // For individual page load success, this is it.
  }, []);

  // Render field overlays (now using portals like Documenso)
  const renderFieldOverlays = () => {
    if (!fields || fields.length === 0) {
      return null;
    }
    
    return fields.map(field => (
      <PowerBriefFieldOverlay
        key={field.id}
        field={field}
        isSigningMode={isSigningMode}
        renderInteractiveElement={renderInteractiveElement}
        enableFieldPlacement={enableFieldPlacement}
        onFieldUpdate={onFieldUpdate}
        onFieldSelect={onFieldSelect}
        isSelected={field.id === selectedFieldId}
        scrollContainerRef={containerRef}
      />
    ));
  };

  useEffect(() => {
    setIsPlacingField(!!selectedFieldType && !!selectedRecipient);
  }, [selectedFieldType, selectedRecipient]);

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-red-600 font-medium mb-2">Error Loading Document</div>
        <div className="text-red-500 text-sm mb-4">{error}</div>
        <div className="text-xs text-gray-600 bg-gray-100 p-3 rounded">
          <div className="font-medium mb-1">Troubleshooting:</div>
          <div>• Try refreshing the page</div>
          <div>• Check if the PDF file is valid</div>
          <div>• Ensure your browser allows loading external scripts</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-col bg-gray-50 rounded-lg ${className}`}>
        {/* Toolbar */}
        {showToolbar && (
          <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage <= 1}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                ←
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {numPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                →
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={zoomOut}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                −
              </button>
              <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                +
              </button>
              <button
                onClick={resetZoom}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Reset
              </button>
            </div>

            {isPlacingField && (
              <div className="text-sm text-blue-600 font-medium">
                Click to place {selectedFieldType} field
              </div>
            )}
          </div>
        )}

        {/* PDF Container */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-100 p-4"
          style={{ 
            cursor: isPlacingField ? 'crosshair' : 'default',
            minHeight: '400px'
          }}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading document...</div>
            </div>
          )}

          <Document
            file={documentSource}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            className="flex flex-col items-center space-y-4"
          >
            {Array.from(new Array(numPages), (_, index) => {
              const pageNumber = index + 1;
              return (
                <DroppablePDFPage
                  key={`droppable_page_${pageNumber}`}
                  pageNumber={pageNumber}
                  scale={scale}
                  onPageLoadSuccess={onPageLoadSuccessInternal}
                  handlePageClick={handlePageClick}
                  pageDimensions={pageDimensions[pageNumber]}
                />
              );
            })}
          </Document>
        </div>
      </div>
      
      {/* Render field overlays as portals to document.body */}
      {isPdfReady && renderFieldOverlays()}
    </>
  );
}

// New DroppablePDFPage component
interface DroppablePDFPageProps {
  pageNumber: number;
  scale: number;
  onPageLoadSuccess: (page: PDFPageProxy) => void;
  handlePageClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  pageDimensions: PageDimensions | undefined;
}

function DroppablePDFPage({
  pageNumber,
  scale,
  onPageLoadSuccess,
  handlePageClick,
  pageDimensions,
}: DroppablePDFPageProps) {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `pdf-page-${pageNumber}`,
    data: {
      pageNumber: pageNumber,
      isPdfPage: true,
      // Pass original dimensions if available, for drop calculation later
      originalWidth: pageDimensions?.width,
      originalHeight: pageDimensions?.height,
    }
  });

  // Create a ref for the page wrapper
  const pageWrapperRef = useRef<HTMLDivElement>(null);

  // Combine refs
  useEffect(() => {
    if (pageWrapperRef.current) {
      setDroppableNodeRef(pageWrapperRef.current);
    }
  }, [setDroppableNodeRef]);

  return (
    <div
      ref={pageWrapperRef}
      key={`page_wrapper_${pageNumber}`}
      className={`relative shadow-lg react-pdf__Page ${isOver ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''}`}
      data-page-number={pageNumber}
      onClick={handlePageClick}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        className="border border-gray-300"
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={onPageLoadSuccess}
      />
    </div>
  );
}

// New PowerBriefFieldOverlay component that uses Documenso's approach
interface PowerBriefFieldOverlayProps {
  field: ContractField;
  isSigningMode?: boolean;
  renderInteractiveElement?: (field: ContractField) => React.ReactNode;
  enableFieldPlacement?: boolean;
  onFieldUpdate?: (updatedField: Partial<ContractField> & { id: string }) => void;
  onFieldSelect?: (fieldId: string | null) => void;
  isSelected?: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

function PowerBriefFieldOverlay({
  field,
  isSigningMode = false,
  renderInteractiveElement,
  enableFieldPlacement = true,
  onFieldUpdate,
  onFieldSelect,
  isSelected,
  scrollContainerRef,
}: PowerBriefFieldOverlayProps) {
  const [coords, setCoords] = useState({
    x: 0,
    y: 0,
    height: 0,
    width: 0,
  });

  console.log(`[FieldOverlay ${field.id}] Initializing. Field:`, JSON.parse(JSON.stringify(field)), "Selected:", isSelected, "scrollContainerRef current:", scrollContainerRef.current);

  const calculateCoords = useCallback((trigger?: string) => {
    console.log(`[FieldOverlay ${field.id}] calculateCoords called. Trigger: ${trigger || 'unknown'}. Field:`, JSON.parse(JSON.stringify(field)));
    const $page = document.querySelector<HTMLElement>(
      `.react-pdf__Page[data-page-number="${field.page}"]`
    );

    if (!$page) {
      console.warn(`[FieldOverlay ${field.id}] Page element not found for page ${field.page}. Hiding field.`);
      setCoords({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }

    const pageRect = $page.getBoundingClientRect();
    console.log(`[FieldOverlay ${field.id}] Page ${field.page} rect (viewport-relative):`, {top: pageRect.top, left: pageRect.left, width: pageRect.width, height: pageRect.height});
    console.log(`[FieldOverlay ${field.id}] window scroll (X,Y):`, window.scrollX, window.scrollY);
    if (scrollContainerRef.current) {
      console.log(`[FieldOverlay ${field.id}] scrollContainer scroll (Top,Left):`, scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
    }

    const absoluteX = pageRect.left + window.scrollX + (field.positionX / 100) * pageRect.width;
    const absoluteY = pageRect.top + window.scrollY + (field.positionY / 100) * pageRect.height;
    const absoluteWidth = (field.width / 100) * pageRect.width;
    const absoluteHeight = (field.height / 100) * pageRect.height;
    
    const newCoords = {
      x: absoluteX,
      y: absoluteY,
      height: absoluteHeight,
      width: absoluteWidth,
    };
    console.log(`[FieldOverlay ${field.id}] Calculated new coords (document-absolute):`, newCoords);
    setCoords(newCoords);
  }, [field.page, field.positionX, field.positionY, field.width, field.height, scrollContainerRef]);

  useEffect(() => {
    console.log(`[FieldOverlay ${field.id}] Initial calculation timeout set.`);
    const timer = setTimeout(() => calculateCoords('initialTimeout'), 50);
    return () => {
      console.log(`[FieldOverlay ${field.id}] Clearing initial calculation timeout.`);
      clearTimeout(timer);
    };
  }, [calculateCoords, field.id]);

  useEffect(() => {
    const scrollElement = scrollContainerRef.current; 
    console.log(`[FieldOverlay ${field.id}] Attempting to set up scroll/resize listeners. Scroll Element:`, scrollElement);

    const handleRecalculateOnEvent = (eventSource: string) => {
      console.log(`[FieldOverlay ${field.id}] ${eventSource} event triggered. Recalculating coordinates.`);
      calculateCoords(eventSource);
    };

    const handleResize = () => handleRecalculateOnEvent('windowResize');
    const handleScroll = () => handleRecalculateOnEvent('scrollContainerScroll');

    window.addEventListener('resize', handleResize);
    console.log(`[FieldOverlay ${field.id}] Added window resize listener.`);

    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      console.log(`[FieldOverlay ${field.id}] Successfully ADDED scroll listener to:`, scrollElement);
    } else {
      console.warn(`[FieldOverlay ${field.id}] Scroll container ref NOT available at time of setting listeners.`);
    }

    return () => {
      console.log(`[FieldOverlay ${field.id}] Cleaning up scroll/resize listeners. Scroll Element was:`, scrollElement);
      window.removeEventListener('resize', handleResize);
      console.log(`[FieldOverlay ${field.id}] Removed window resize listener.`);
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', handleScroll);
        console.log(`[FieldOverlay ${field.id}] Successfully REMOVED scroll listener from:`, scrollElement);
      }
    };
  }, [calculateCoords, scrollContainerRef, field.id]);

  useEffect(() => {
    console.log(`[FieldOverlay ${field.id}] Attempting to set up ResizeObserver for page ${field.page}.`);
    const $page = document.querySelector<HTMLElement>(
      `.react-pdf__Page[data-page-number="${field.page}"]`
    );

    if (!$page) {
      console.warn(`[FieldOverlay ${field.id}] Page element for ResizeObserver not found (page ${field.page}).`);
      return;
    }

    const observer = new ResizeObserver(() => {
      console.log(`[FieldOverlay ${field.id}] ResizeObserver triggered recalculateCoords for page ${field.page}.`);
      calculateCoords('ResizeObserver');
    });
    observer.observe($page);
    console.log(`[FieldOverlay ${field.id}] ResizeObserver observing page ${field.page}.`);

    return () => {
      console.log(`[FieldOverlay ${field.id}] ResizeObserver unobserving page ${field.page}.`);
      observer.unobserve($page);
    };
  }, [calculateCoords, field.page, field.id]);

  const getFieldColor = (type: string, isSelected?: boolean) => {
    if (isSelected && enableFieldPlacement) return 'border-red-600 bg-red-100 ring-2 ring-red-500';
    switch (type) {
      case 'signature': return 'border-blue-500 bg-blue-50';
      case 'text': return 'border-green-500 bg-green-50';
      case 'date': return 'border-purple-500 bg-purple-50';
      case 'checkbox': return 'border-orange-500 bg-orange-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'signature': return '✍️';
      case 'text': return 'T';
      case 'date': return '📅';
      case 'checkbox': return '☑️';
      default: return '?';
    }
  };

  const isEditable = !isSigningMode && !!onFieldUpdate;

  const handleDragStop = (e: MouseEvent | TouchEvent, d: DraggableData) => {
    console.log(`[FieldOverlay ${field.id}] handleDragStop. Event:`, e, 'DraggableData:', d);
    if (!isEditable) {
      console.log(`[FieldOverlay ${field.id}] handleDragStop: Aborted because field is not editable (isSigningMode: ${isSigningMode}, onFieldUpdate: ${!!onFieldUpdate}).`);
      return;
    }
    
    const $page = document.querySelector<HTMLElement>(
      `.react-pdf__Page[data-page-number="${field.page}"]`
    );
    if (!$page) {
      console.warn(`[FieldOverlay ${field.id}] handleDragStop: Page element not found (page ${field.page}).`);
      return;
    }
    
    const pageRect = $page.getBoundingClientRect();
    const pageDocLeft = pageRect.left + window.scrollX;
    const pageDocTop = pageRect.top + window.scrollY;
    console.log(`[FieldOverlay ${field.id}] handleDragStop - Page rect:`, JSON.parse(JSON.stringify(pageRect)), `PageDocLeft: ${pageDocLeft}, PageDocTop: ${pageDocTop}`);
    
    let newPositionX = ((d.x - pageDocLeft) / pageRect.width) * 100;
    let newPositionY = ((d.y - pageDocTop) / pageRect.height) * 100;

    console.log(`[FieldOverlay ${field.id}] handleDragStop - Original newPositionX: ${newPositionX}%, newPositionY: ${newPositionY}%`);

    newPositionX = Math.max(0, Math.min(newPositionX, 100 - field.width));
    newPositionY = Math.max(0, Math.min(newPositionY, 100 - field.height));
    
    const updatePayload = {
      id: field.id,
      positionX: newPositionX,
      positionY: newPositionY,
    };
    console.log(`[FieldOverlay ${field.id}] handleDragStop - Calling onFieldUpdate with:`, updatePayload);
    onFieldUpdate(updatePayload);
  };

  const handleResizeStop = (
    e: MouseEvent | TouchEvent, 
    direction: ResizeDirection,
    ref: HTMLElement,
    delta: ResizableDelta, 
    position: Position
  ) => {
    console.log(`[FieldOverlay ${field.id}] handleResizeStop. Event:`, e, 'Direction:', direction, 'Ref:', ref, 'Delta:', delta, 'Position:', position);
    if (!isEditable) {
      console.log(`[FieldOverlay ${field.id}] handleResizeStop: Aborted because field is not editable (isSigningMode: ${isSigningMode}, onFieldUpdate: ${!!onFieldUpdate}).`);
      return;
    }
    
    const $page = document.querySelector<HTMLElement>(
      `.react-pdf__Page[data-page-number="${field.page}"]`
    );
    if (!$page) {
      console.warn(`[FieldOverlay ${field.id}] handleResizeStop: Page element not found (page ${field.page}).`);
      return;
    }
    
    const pageRect = $page.getBoundingClientRect();
    const pageDocLeft = pageRect.left + window.scrollX;
    const pageDocTop = pageRect.top + window.scrollY;
    console.log(`[FieldOverlay ${field.id}] handleResizeStop - Page rect:`, JSON.parse(JSON.stringify(pageRect)), `PageDocLeft: ${pageDocLeft}, PageDocTop: ${pageDocTop}`);

    const newPixelWidth = parseFloat(ref.style.width);
    const newPixelHeight = parseFloat(ref.style.height);
    console.log(`[FieldOverlay ${field.id}] handleResizeStop - New pixel dimensions: width=${newPixelWidth}, height=${newPixelHeight}`);

    let newWidth = (newPixelWidth / pageRect.width) * 100;
    let newHeight = (newPixelHeight / pageRect.height) * 100;
    let newPositionX = ((position.x - pageDocLeft) / pageRect.width) * 100;
    let newPositionY = ((position.y - pageDocTop) / pageRect.height) * 100;

    console.log(`[FieldOverlay ${field.id}] handleResizeStop - Original new positions/dimensions: X=${newPositionX}%, Y=${newPositionY}%, W=${newWidth}%, H=${newHeight}%`);

    newPositionX = Math.max(0, newPositionX);
    newPositionY = Math.max(0, newPositionY);
    newWidth = Math.min(newWidth, 100 - newPositionX);
    newHeight = Math.min(newHeight, 100 - newPositionY);
    newWidth = Math.max(1, newWidth); 
    newHeight = Math.max(1, newHeight);
    
    const updatePayload = {
      id: field.id,
      positionX: newPositionX,
      positionY: newPositionY,
      width: newWidth,
      height: newHeight,
    };
    console.log(`[FieldOverlay ${field.id}] handleResizeStop - Calling onFieldUpdate with:`, updatePayload);
    onFieldUpdate(updatePayload);
  };

  // This is OUR mousedown handler passed to Rnd. 
  // Rnd also has its own internal mousedown handlers to initiate dragging/resizing.
  const handleRndMouseDown = (e: MouseEvent) => { 
    console.log(`[FieldOverlay ${field.id}] Rnd onMouseDown prop triggered. Event Target:`, e.target);
    // Do NOT call e.stopPropagation() here if RND needs to process the mousedown to start a drag.
    // Let RND's internal handlers for drag initiation process the event.
    
    // Field selection should work in editing mode (when onFieldSelect is provided)
    if (onFieldSelect && !isSigningMode) {
      console.log(`[FieldOverlay ${field.id}] Calling onFieldSelect with field.id: ${field.id}`);
      onFieldSelect(field.id);
    }
    // If clicking on the delete button, this specific handler might not even fire if the button stops propagation.
    // The delete button has its own onClick with stopPropagation.
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && isSelected && onFieldUpdate) {
      e.preventDefault();
      // Signal deletion by calling onFieldUpdate with a special flag
      onFieldUpdate({ id: field.id, _delete: true } as Partial<ContractField> & { id: string });
    }
  };

  useEffect(() => {
    if (isSelected) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSelected, onFieldUpdate, field.id]);

  if (coords.width === 0 || coords.height === 0) {
     console.warn(`[FieldOverlay ${field.id}] Skipping render because coords width/height is zero. Coords:`, coords);
     return null;
  }

  console.log(`[FieldOverlay ${field.id}] Rendering Rnd with props: size=`, { width: coords.width, height: coords.height }, `position=`, { x: coords.x, y: coords.y });

  return createPortal(
    <Rnd
      size={{ width: coords.width, height: coords.height }}
      position={{ x: coords.x, y: coords.y }}
      onDragStart={(e, d) => {
        console.log(`[FieldOverlay ${field.id}] Rnd onDragStart. Event:`, e, 'DraggableData:', d);
      }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onMouseDown={handleRndMouseDown}
      bounds="parent"
      disableDragging={!isEditable}
      enableResizing={isEditable ? {
        top: false, right: true, bottom: true, left: false,
        topRight: false, bottomRight: true, bottomLeft: false, topLeft: false
      } : {}}
      minWidth={20}
      minHeight={10}
      className={isSigningMode || !isEditable ? '' : 'group'} 
      style={{ zIndex: isSigningMode ? 100 : (isSelected ? 50 : 20) }}
    >
      {isSigningMode && renderInteractiveElement ? (
        <div className="w-full h-full">
          {renderInteractiveElement(field)}
        </div>
      ) : (
        <div
          className={`w-full h-full border-2 border-dashed rounded flex items-center justify-center text-xs font-medium ${getFieldColor(field.type, isSelected)} ${!isEditable ? 'cursor-default' : 'cursor-move'} opacity-75 group-hover:opacity-100 transition-opacity`}
          title={`${field.type} field for ${field.recipientEmail} (ID: ${field.id})`}
        >
          <span className="opacity-100 select-none pointer-events-none">
            {getFieldIcon(field.type)} {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
          </span>
          {isSelected && isEditable && (
            <button
              className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onFieldUpdate?.({ id: field.id, _delete: true } as Partial<ContractField> & { id: string });
              }}
              title="Delete field"
            >
              ×
            </button>
          )}
        </div>
      )}
    </Rnd>,
    document.body
  );
} 