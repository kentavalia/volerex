import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import backend from 'brain';
import { ProcessedDocument } from 'types';

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ProcessedDocument | null;
  onSave: () => void;
}

const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  onSave
}) => {
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = async () => {
    if (!document) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await backend.get_processed_document({ documentId: document.id });
      const data = await response.json();
      
      // Initialize editable data with current extracted data
      setEditedData(data.extracted_data || {});
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Kunne ikke laste dokumentdata');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const addNewField = () => {
    const fieldName = prompt('Skriv inn feltnavn:');
    if (fieldName && !editedData[fieldName]) {
      setEditedData(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const removeField = (fieldName: string) => {
    setEditedData(prev => {
      const newData = { ...prev };
      delete newData[fieldName];
      return newData;
    });
  };

  const handleSave = async () => {
    if (!document) return;
    
    try {
      setIsSaving(true);
      
      const response = await backend.update_processed_document(
        { documentId: document.id },
        {
          extracted_data: editedData,
          notes: 'Manuelt redigert'
        }
      );
      
      if (response.ok) {
        toast.success('Dokumentdata oppdatert');
        onSave();
        onClose();
      } else {
        throw new Error('Failed to update document');
      }
    } catch (err) {
      console.error('Error saving document:', err);
      toast.error('Kunne ikke lagre endringer');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen && document) {
      loadDocument();
    }
  }, [isOpen, document]);

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Rediger dokumentdata - {document.original_filename}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Laster dokumentdata...</span>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!isLoading && !error && (
            <>
              <div className="space-y-4">
                {Object.entries(editedData).map(([fieldName, value]) => (
                  <div key={fieldName} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm font-medium">{fieldName}</Label>
                      {typeof value === 'string' && value.length > 100 ? (
                        <Textarea
                          value={value}
                          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                          className="min-h-20"
                        />
                      ) : (
                        <Input
                          value={typeof value === 'object' ? JSON.stringify(value) : String(value || '')}
                          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                        />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField(fieldName)}
                      className="mt-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={addNewField}
                className="w-full"
              >
                Legg til nytt felt
              </Button>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Lagre endringer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditDocumentModal;