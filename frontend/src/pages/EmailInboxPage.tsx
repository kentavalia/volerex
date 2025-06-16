import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Mail, FileText, Download, Play, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import backend from 'brain';
import { EmailDocument, EmailCheckResponse } from 'types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserGuardContext } from 'app';

const EmailInboxPage = () => {
  const [documents, setDocuments] = useState<EmailDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('documentId');
  const { user } = useUserGuardContext();

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await backend.list_email_documents();
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Kunne ikke laste inn e-postdokumenter');
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmails = async () => {
    try {
      setIsChecking(true);
      const response = await backend.check_emails();
      const data: EmailCheckResponse = await response.json();
      
      if (data.new_emails_count > 0) {
        toast.success(`Fant ${data.new_emails_count} nye e-poster med PDF-vedlegg`);
        await loadDocuments(); // Reload to show new documents
      } else {
        toast.info('Ingen nye e-poster med PDF-vedlegg funnet');
      }
    } catch (error) {
      console.error('Error checking emails:', error);
      toast.error('Kunne ikke sjekke e-post. Kontroller innstillinger.');
    } finally {
      setIsChecking(false);
    }
  };

  const downloadPdf = async (documentId: string, pdfIndex: number) => {
    try {
      const response = await backend.download_pdf({ documentId, pdfIndex });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `document_${documentId}_${pdfIndex}.pdf`;
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

  const processDocument = (documentId: string) => {
    // Navigate to processing page with document ID
    navigate(`/process-email-document-page?documentId=${documentId}`);
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
    loadDocuments();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-postinnboks</h1>
          <p className="text-muted-foreground">
            Administrer innkommende e-poster med PDF-vedlegg
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadDocuments}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Oppdater
          </Button>
          <Button
            onClick={checkEmails}
            disabled={isChecking}
          >
            <Mail className={`h-4 w-4 mr-2 ${isChecking ? 'animate-pulse' : ''}`} />
            {isChecking ? 'Sjekker...' : 'Sjekk e-post'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-postdokumenter
          </CardTitle>
          <CardDescription>
            E-poster mottatt på mottak@digitool.no med PDF-vedlegg
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Laster inn dokumenter...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Ingen dokumenter funnet</h3>
              <p className="text-muted-foreground mb-4">
                Ingen e-poster med PDF-vedlegg er mottatt ennå.
              </p>
              <Button onClick={checkEmails} disabled={isChecking}>
                <Mail className="h-4 w-4 mr-2" />
                Sjekk for nye e-poster
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Avsender</TableHead>
                  <TableHead>Emne</TableHead>
                  <TableHead>Mottatt</TableHead>
                  <TableHead>PDF-er</TableHead>
                  <TableHead>AI Forslag</TableHead>
                  <TableHead>Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="font-medium">{doc.sender}</TableCell>
                    <TableCell>{doc.subject}</TableCell>
                    <TableCell>{formatDate(doc.received_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {doc.pdf_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(doc as any).ai_analysis ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {(doc as any).ai_analysis.suggested_template_id ? (
                              <span className="text-green-600">Mal foreslått</span>
                            ) : (
                              <span className="text-yellow-600">Ingen match</span>
                            )}
                          </div>
                          {(doc as any).ai_analysis.confidence_score > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {(doc as any).ai_analysis.confidence_score}% sikkerhet
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ikke analysert</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {(doc.status === 'new' || doc.status === 'template_suggested') && (
                          <Button
                            size="sm"
                            onClick={() => processDocument(doc.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Prosesser
                          </Button>
                        )}
                        {doc.status === 'ready_for_auto_processing' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => processDocument(doc.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Auto-prosesser
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadPdf(doc.id, 0)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Last ned
                        </Button>
                        {doc.error_message && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => toast.error(doc.error_message)}
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hvordan det fungerer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-medium mb-1">1. Send e-post</h3>
              <p className="text-sm text-muted-foreground">
                Send e-post med PDF-vedlegg til mottak@digitool.no
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-medium mb-1">2. Sjekk e-post</h3>
              <p className="text-sm text-muted-foreground">
                Klikk "Sjekk e-post" for å hente nye meldinger
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Play className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-medium mb-1">3. Prosesser</h3>
              <p className="text-sm text-muted-foreground">
                Velg mal og prosesser PDF-data automatisk
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailInboxPage;