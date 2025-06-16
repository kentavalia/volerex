import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Download, Play, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import backend from 'brain';
import { EmailDocument, Template, ExtractDataResponse } from 'types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserGuardContext } from 'app';

const ProcessEmailDocumentPage = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('documentId');
  const [document, setDocument] = useState<EmailDocument | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [pdfs, setPdfs] = useState<any[]>([]);
  const navigate = useNavigate();
  const { user } = useUserGuardContext();

  const loadDocument = async () => {
    if (!documentId) return;
    
    try {
      // Load document metadata from the list
      const response = await backend.list_email_documents();
      const documents = await response.json();
      const doc = documents.find((d: EmailDocument) => d.id === documentId);
      
      if (!doc) {
        toast.error('Dokument ikke funnet');
        navigate('/email-inbox-page');
        return;
      }
      
      setDocument(doc);
      
      // Load PDFs for this document
      const pdfResponse = await backend.list_document_pdfs({ documentId });
      const pdfData = await pdfResponse.json();
      setPdfs(pdfData.pdfs || []);
      
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Kunne ikke laste inn dokument');
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await backend.list_templates();
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Kunne ikke laste inn maler');
    }
  };

  const processDocument = async () => {
    if (!documentId || !selectedTemplateId || pdfs.length === 0) {
      toast.error('Velg en mal før prosessering');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Process email document with selected template
      const processResponse = await backend.process_email_document({
        documentId,
        template_id: selectedTemplateId
      });
      
      const result: ExtractDataResponse = await processResponse.json();
      setExtractedData(result);
      
      toast.success('Dokument prosessert!');
      
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error('Kunne ikke prosessere dokument');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPdf = async (pdfIndex: number) => {
    if (!documentId) return;
    
    try {
      const response = await backend.download_pdf({ documentId, pdfIndex });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = pdfs[pdfIndex]?.filename || `document_${pdfIndex}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF lastet ned');
      } else {
        throw new Error('Failed to download PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Kunne ikke laste ned PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary">Ny</Badge>;
      case 'template_suggested':
        return <Badge variant="outline">AI forslag</Badge>;
      case 'ready_for_auto_processing':
        return <Badge variant="default">Klar for auto</Badge>;
      case 'processing':
        return <Badge variant="outline">Prosesserer</Badge>;
      case 'completed':
        return <Badge variant="default">Ferdig</Badge>;
      case 'error':
        return <Badge variant="destructive">Feil</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('nb-NO');
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadDocument(), loadTemplates()]);
      setIsLoading(false);
    };
    
    loadData();
  }, [documentId]);

  // Auto-select AI suggested template when document loads
  useEffect(() => {
    if (document && templates.length > 0 && !selectedTemplateId) {
      const aiAnalysis = (document as any).ai_analysis;
      if (aiAnalysis?.suggested_template_id) {
        const suggestedTemplate = templates.find(t => t.id === aiAnalysis.suggested_template_id);
        if (suggestedTemplate) {
          setSelectedTemplateId(aiAnalysis.suggested_template_id);
        }
      }
    }
  }, [document, templates, selectedTemplateId]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Laster inn dokument...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium mb-2">Dokument ikke funnet</h3>
          <Button onClick={() => navigate('/email-inbox-page')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake til innboks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/email-inbox-page')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Prosesser e-postdokument</h1>
          <p className="text-muted-foreground">
            Velg mal og prosesser PDF-data automatisk
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                E-postinformasjon
                {getStatusBadge(document.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Avsender</label>
                <p className="font-medium">{document.sender}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Emne</label>
                <p>{document.subject}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mottatt</label>
                <p>{formatDate(document.received_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Antall PDF-er</label>
                <p>{document.pdf_count}</p>
              </div>
              {(document as any).ai_analysis && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-muted-foreground">AI-analyse</label>
                  <div className="space-y-2 mt-2">
                    {(document as any).ai_analysis.suggested_template_id ? (
                      <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                        <div>
                          <p className="text-sm font-medium text-green-800">Mal foreslått av AI</p>
                          <p className="text-xs text-green-600">
                            {templates.find(t => t.id === (document as any).ai_analysis.suggested_template_id)?.name || 'Ukjent mal'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          {(document as any).ai_analysis.confidence_score}% sikkerhet
                        </Badge>
                      </div>
                    ) : (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">Ingen passende mal funnet av AI</p>
                      </div>
                    )}
                    {(document as any).ai_analysis.reasoning && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Begrunnelse:</strong> {(document as any).ai_analysis.reasoning}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {document.error_message && (
                <div>
                  <label className="text-sm font-medium text-red-600">Feilmelding</label>
                  <p className="text-red-600">{document.error_message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PDF-vedlegg</CardTitle>
              <CardDescription>
                Tilgjengelige PDF-filer i denne e-posten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pdfs.length === 0 ? (
                <p className="text-muted-foreground">Ingen PDF-er funnet</p>
              ) : (
                <div className="space-y-3">
                  {pdfs.map((pdf, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">{pdf.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {(pdf.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPdf(index)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Last ned
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Velg prosesseringsmal</CardTitle>
              <CardDescription>
                Velg hvilken mal som skal brukes for å trekke ut data fra PDF-en
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Mal</label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg en mal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={processDocument}
                disabled={!selectedTemplateId || pdfs.length === 0 || isProcessing}
                className="w-full"
              >
                <Play className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-pulse' : ''}`} />
                {isProcessing ? 'Prosesserer...' : 'Prosesser dokument'}
              </Button>
            </CardContent>
          </Card>

          {extractedData && (
            <Card>
              <CardHeader>
                <CardTitle>Prosesserte data</CardTitle>
                <CardDescription>
                  Data trukket ut fra PDF-en
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {extractedData.extracted_data && (
                    <div>
                      <h4 className="font-medium mb-2">Uttrukket informasjon:</h4>
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(extractedData.extracted_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate('/')}
                      variant="outline"
                    >
                      Se resultater
                    </Button>
                    <Button
                      onClick={() => navigate('/email-inbox-page')}
                    >
                      Tilbake til innboks
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessEmailDocumentPage;