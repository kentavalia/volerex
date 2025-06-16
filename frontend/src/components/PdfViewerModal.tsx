import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import backend from 'brain';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  filename: string;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  documentId,
  filename
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  const loadPdf = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await backend.download_document_pdf({ documentId });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } else {
        throw new Error('Failed to load PDF');
      }
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Kunne ikke laste PDF-fil');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!pdfUrl) return;
    
    try {
      const response = await backend.download_document_pdf({ documentId });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  useEffect(() => {
    if (isOpen && documentId) {
      loadPdf();
    }
    
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, documentId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>PDF Viewer - {filename}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">{Math.round(scale * 100)}%</span>
              <Button size="sm" variant="outline" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={downloadPdf}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Laster PDF...</span>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {pdfUrl && !isLoading && (
            <div className="flex justify-center">
              <iframe
                src={pdfUrl}
                className="w-full min-h-[600px] border"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center top'
                }}
                title={`PDF: ${filename}`}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerModal;