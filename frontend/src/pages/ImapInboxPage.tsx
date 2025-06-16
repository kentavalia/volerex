import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Mail, FileText, Play, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import brain from 'brain';
import { useNavigate } from 'react-router-dom';
import { useUserGuardContext } from 'app';

interface ImapEmailDocument {
  id: string;
  sender: string;
  subject: string;
  received_date: string;
  pdf_count: number;
  status: string;
  error_message?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
}

// Template selector component
interface TemplateSelectorProps {
  documentId: string;
  templates: Template[];
  emailTemplates: EmailTemplate[];
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ documentId, templates, emailTemplates }) => {
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState<string>('');
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>('');

  // Store selections globally so ProcessButton can access them
  useEffect(() => {
    (window as any).templateSelections = (window as any).templateSelections || {};
    (window as any).templateSelections[documentId] = {
      pdfTemplate: selectedPdfTemplate,
      emailTemplate: selectedEmailTemplate
    };
  }, [documentId, selectedPdfTemplate, selectedEmailTemplate]);

  return (
    <div className="space-y-2">
      <Select value={selectedPdfTemplate} onValueChange={setSelectedPdfTemplate}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Velg PDF mal" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedEmailTemplate} onValueChange={setSelectedEmailTemplate}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Velg e-post mal" />
        </SelectTrigger>
        <SelectContent>
          {emailTemplates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Process button component
interface ProcessButtonProps {
  documentId: string;
  onProcess: (templateId?: string, emailTemplateId?: string) => void;
}

const ProcessButton: React.FC<ProcessButtonProps> = ({ documentId, onProcess }) => {
  const handleProcess = () => {
    const selections = (window as any).templateSelections?.[documentId];
    const pdfTemplate = selections?.pdfTemplate || undefined;
    const emailTemplate = selections?.emailTemplate || undefined;
    
    if (!pdfTemplate && !emailTemplate) {
      toast.error('Vennligst velg minst én mal før prosessering');
      return;
    }
    
    onProcess(pdfTemplate, emailTemplate);
  };

  return (
    <Button size="sm" onClick={handleProcess}>
      <Play className="h-4 w-4 mr-1" />
      Prosesser
    </Button>
  );
};

const ImapInboxPage = () => {
  const [documents, setDocuments] = useState<ImapEmailDocument[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [processingDocs, setProcessingDocs] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { user } = useUserGuardContext();

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await brain.list_imap_email_documents();
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error loading IMAP documents:', error);
      toast.error('Kunne ikke laste inn IMAP e-postdokumenter');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const [templatesResponse, emailTemplatesResponse] = await Promise.all([
        brain.list_templates(),
        brain.list_email_templates()
      ]);
      
      const templatesData = await templatesResponse.json();
      const emailTemplatesData = await emailTemplatesResponse.json();
      
      setTemplates(templatesData);
      setEmailTemplates(emailTemplatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Kunne ikke laste inn maler');
    }
  };

  const checkEmails = async () => {
    try {
      setIsChecking(true);
      const response = await brain.check_imap_emails();
      const data = await response.json();
      
      if (data.new_emails_count > 0) {
        toast.success(`Fant ${data.new_emails_count} nye IMAP e-poster med PDF-vedlegg`);
        await loadDocuments();
      } else {
        toast.info('Ingen nye IMAP e-poster med PDF-vedlegg funnet');
      }
    } catch (error) {
      console.error('Error checking IMAP emails:', error);
      toast.error('Kunne ikke sjekke IMAP e-post. Kontroller innstillinger.');
    } finally {
      setIsChecking(false);
    }
  };

  const processDocument = async (documentId: string, templateId?: string, emailTemplateId?: string) => {
    if (!templateId && !emailTemplateId) {
      toast.error('Vennligst velg en mal før prosessering');
      return;
    }

    try {
      setProcessingDocs(prev => new Set(prev).add(documentId));
      
      const response = await brain.process_imap_email_document(
        { documentId: documentId },
        { template_id: templateId, email_template_id: emailTemplateId }
      );
      const data = await response.json();
      
      toast.success('Dokument prosessert og lagt til i rapporter');
      await loadDocuments(); // Refresh list
      
    } catch (error) {
      console.error('Error processing IMAP document:', error);
      toast.error('Kunne ikke prosessere dokumentet');
    } finally {
      setProcessingDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary">Ny</Badge>;
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
    loadTemplates();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/email-page')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake til E-post
          </Button>
          <div>
            <h1 className="text-3xl font-bold">IMAP E-postinnboks</h1>
            <p className="text-muted-foreground">
              Behandle IMAP e-poster manuelt med mal-mapping
            </p>
          </div>
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
            {isChecking ? 'Sjekker...' : 'Sjekk IMAP'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            IMAP E-postdokumenter
          </CardTitle>
          <CardDescription>
            E-poster mottatt via IMAP med PDF-vedlegg som trenger mal-mapping
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
              <h3 className="text-lg font-medium mb-2">Ingen IMAP dokumenter funnet</h3>
              <p className="text-muted-foreground mb-4">
                Ingen IMAP e-poster med PDF-vedlegg er mottatt ennå.
              </p>
              <Button onClick={checkEmails} disabled={isChecking}>
                <Mail className="h-4 w-4 mr-2" />
                Sjekk for nye IMAP e-poster
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
                  <TableHead>Velg Mal</TableHead>
                  <TableHead>Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const isProcessing = processingDocs.has(doc.id);
                  const canProcess = doc.status === 'new' || doc.status === 'error';
                  
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-48 truncate" title={doc.sender}>
                          {doc.sender}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48 truncate" title={doc.subject}>
                          {doc.subject}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(doc.received_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {doc.pdf_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canProcess ? (
                          <TemplateSelector
                            documentId={doc.id}
                            templates={templates}
                            emailTemplates={emailTemplates}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {doc.status === 'completed' ? 'Prosessert' : 'Ikke tilgjengelig'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {canProcess && !isProcessing && (
                            <ProcessButton
                              documentId={doc.id}
                              onProcess={(templateId, emailTemplateId) => 
                                processDocument(doc.id, templateId, emailTemplateId)
                              }
                            />
                          )}
                          {isProcessing && (
                            <Button size="sm" disabled>
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              Prosesserer...
                            </Button>
                          )}
                          {doc.error_message && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => toast.error(doc.error_message!)}
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hvordan IMAP inbox fungerer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-medium mb-1">1. IMAP mottak</h3>
              <p className="text-sm text-muted-foreground">
                E-poster mottas via IMAP konfigurasjon
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-medium mb-1">2. Se dokumenter</h3>
              <p className="text-sm text-muted-foreground">
                Se liste over mottatte e-poster som trenger behandling
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-medium mb-1">3. Velg mal</h3>
              <p className="text-sm text-muted-foreground">
                Velg PDF eller e-post mal for datauttrekk
              </p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Play className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-medium mb-1">4. Prosesser</h3>
              <p className="text-sm text-muted-foreground">
                Dokument prosesseres og legges til i rapporter
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImapInboxPage;