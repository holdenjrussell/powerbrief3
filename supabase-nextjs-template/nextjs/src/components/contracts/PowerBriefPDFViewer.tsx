'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Rnd, type DraggableData, type ResizableDelta, type Position } from 'react-rnd';
import { useDroppable } from '@dnd-kit/core';

// Robust PDF.js worker setup
if (typeof window !== 'undefined') {
  let workerSrcToUse = null;
  try {
    // Attempt 1: import.meta.url (good for modern module environments if bundler supports it for workers)
    workerSrcToUse = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    console.log(`[PDFViewer] Attempting PDF.js worker via import.meta.url: ${workerSrcToUse}`);
  } catch (e) {
    console.warn('[PDFViewer] Failed to set PDF.js worker using import.meta.url, trying /public path fallback:', e);
    // Attempt 2: Path relative to the 'public' directory (standard for Next.js)
    // Ensure pdf.worker.min.mjs is copied to nextjs/public/pdf-worker/
    workerSrcToUse = '/pdf-worker/pdf.worker.min.mjs';
    console.log(`[PDFViewer] Setting PDF.js worker via /public path: ${workerSrcToUse}`);
  }

  if (pdfjs.GlobalWorkerOptions.workerSrc !== workerSrcToUse) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrcToUse;
    console.log(`[PDFViewer] PDF.js worker finally set to: ${pdfjs.GlobalWorkerOptions.workerSrc}`);
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
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlacingField, setIsPlacingField] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<Record<number, PageDimensions>>({});

  // Convert documentData to usable format with proper memoization
  const documentSource = React.useMemo(() => {
    if (typeof documentData.data === 'string') {
      return documentData.data;
    }
    // Create a stable reference for the data object
    return { data: documentData.data };
  }, [documentData.id, documentData.data]); // Include id to ensure proper updates when document changes

  const onDocumentLoadSuccess = useCallback(({ numPages }: PDFDocumentProxy) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
    setPageDimensions({});
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
  const onPageLoadSuccessInternal = useCallback((page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageDimensions(prev => ({
      ...prev,
      [page.pageNumber]: { width: viewport.width, height: viewport.height },
    }));
    // Call the original onDocumentLoad if it was meant for the first page or similar logic (if needed)
    // For individual page load success, this is it.
  }, []);

  // Render field overlays (now passed to DroppablePDFPage as children)
  const renderFieldOverlaysForPage = (pageNumber: number) => {
    const pageFields = fields.filter(field => field.page === pageNumber);
    const originalPageDims = pageDimensions[pageNumber];

    if (!originalPageDims) {
      return null;
    }
    
    return pageFields.map(field => (
      <DraggableField
        key={field.id}
        field={field}
        viewerScale={scale}
        pageOriginalWidth={originalPageDims.width}
        pageOriginalHeight={originalPageDims.height}
        onFieldUpdate={onFieldUpdate}
        onFieldSelect={onFieldSelect}
        isSelected={field.id === selectedFieldId}
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
              >
                {/* Render field overlays for this specific page */}
                {pageDimensions[pageNumber] ? renderFieldOverlaysForPage(pageNumber) : null}
              </DroppablePDFPage>
            );
          })}
        </Document>
      </div>
    </div>
  );
}

// DraggableField component (formerly FieldOverlay)
interface DraggableFieldProps {
  field: ContractField;
  viewerScale: number;
  pageOriginalWidth: number;
  pageOriginalHeight: number;
  onFieldUpdate?: (updatedField: Partial<ContractField> & { id: string }) => void;
  onFieldSelect?: (fieldId: string | null) => void;
  isSelected?: boolean;
}

function DraggableField({
  field,
  viewerScale,
  pageOriginalWidth,
  pageOriginalHeight,
  onFieldUpdate,
  onFieldSelect,
  isSelected,
}: DraggableFieldProps) {
  const getFieldColor = (type: string, isSelected?: boolean) => {
    if (isSelected) return 'border-red-600 bg-red-100 ring-2 ring-red-500';
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

  const initialPixelX = (field.positionX / 100) * pageOriginalWidth;
  const initialPixelY = (field.positionY / 100) * pageOriginalHeight;
  const initialPixelWidth = (field.width / 100) * pageOriginalWidth;
  const initialPixelHeight = (field.height / 100) * pageOriginalHeight;

  const handleDragStop = (e: MouseEvent | TouchEvent, d: DraggableData) => {
    if (!onFieldUpdate) return;
    const newPositionX = (d.x / pageOriginalWidth) * 100;
    const newPositionY = (d.y / pageOriginalHeight) * 100;
    onFieldUpdate({
      id: field.id,
      positionX: Math.max(0, Math.min(100 - field.width, newPositionX)), // Basic boundary
      positionY: Math.max(0, Math.min(100 - field.height, newPositionY)), // Basic boundary
    });
  };

  const handleResizeStop = (
    e: MouseEvent | TouchEvent, 
    direction: ResizeDirection,
    ref: HTMLElement, 
    delta: ResizableDelta, 
    position: Position
  ) => {
    if (!onFieldUpdate) return;
    const newPixelWidth = parseFloat(ref.style.width);
    const newPixelHeight = parseFloat(ref.style.height);

    const newWidth = (newPixelWidth / pageOriginalWidth) * 100;
    const newHeight = (newPixelHeight / pageOriginalHeight) * 100;
    const newPositionX = (position.x / pageOriginalWidth) * 100;
    const newPositionY = (position.y / pageOriginalHeight) * 100;
    
    onFieldUpdate({
      id: field.id,
      positionX: Math.max(0, newPositionX),
      positionY: Math.max(0, newPositionY),
      width: Math.max(5, newWidth), // Min width 5%
      height: Math.max(2, newHeight), // Min height 2%
    });
  };
  
  // Prevent click from bubbling to page for new field placement & handle selection
  const handleMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    if (onFieldSelect) {
      onFieldSelect(field.id);
    }
  };

  return (
    <Rnd
      size={{ width: initialPixelWidth, height: initialPixelHeight }}
      position={{ x: initialPixelX, y: initialPixelY }}
      scale={viewerScale}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onMouseDown={handleMouseDown}
      bounds="parent" // Constrains to the parent div (absolute inset-0)
      minWidth={(5 / 100) * pageOriginalWidth} // Min width 5% in pixels
      minHeight={(2 / 100) * pageOriginalHeight} // Min height 2% in pixels
      style={{
        pointerEvents: 'auto', // Enable mouse events for this Rnd instance
      }}
      enableResizing={{
        top: false, right: true, bottom: true, left: false,
        topRight: false, bottomRight: true, bottomLeft: false, topLeft: false
      }}
    >
      <div
        className={`w-full h-full border-2 border-dashed rounded flex items-center justify-center text-xs font-medium ${getFieldColor(field.type, isSelected)} opacity-75 hover:opacity-100 cursor-move`}
        title={`${field.type} field for ${field.recipientEmail} (ID: ${field.id})`}
      >
        <span className="opacity-100 select-none"> {/* Ensure icon/text are visible */}
          {getFieldIcon(field.type)} {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
        </span>
      </div>
    </Rnd>
  );
}

// New DroppablePDFPage component
interface DroppablePDFPageProps {
  pageNumber: number;
  scale: number;
  onPageLoadSuccess: (page: PDFPageProxy) => void;
  handlePageClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  pageDimensions: PageDimensions | undefined;
  children: React.ReactNode; // For field overlays
}

function DroppablePDFPage({
  pageNumber,
  scale,
  onPageLoadSuccess,
  handlePageClick,
  pageDimensions,
  children
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

  return (
    <div
      ref={setDroppableNodeRef}
      key={`page_wrapper_${pageNumber}`}
      className={`relative shadow-lg ${isOver ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''}`}
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
      {/* Field overlays container - RND components will be children here */}
      <div className="absolute inset-0 pointer-events-none"> 
        {children}
      </div>
    </div>
  );
} 