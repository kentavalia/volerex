import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Mail, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { toast } from 'sonner';
import brain from 'brain';
import { useNavigate } from 'react-router-dom';

// Define email-specific types inline
interface EmailStatus {
  is_configured: boolean;
  last_check: string | null;
  total_processed: number;
  enabled: boolean;
}

interface ProcessEmailRequest {
  force_check?: boolean;
}

interface EmailDocument {
  id: string;
  source_type: string;
  original_filename: string;
  email_subject?: string;
  email_from?: string;
  email_date?: string;
  extracted_data: Record<string, any>;
  processed_date: string;
  template_name: string;
}

interface CheckEmailsResponse {
  message: string;
  processed_count: number;
  new_documents: string[];
  timestamp: string;
}

export default function EmailPage() {
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckingImap, setIsCheckingImap] = useState(false);
  const [imapStatus, setImapStatus] = useState<any | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<EmailDocument[]>([]);
  const navigate = useNavigate();

  const loadEmailStatus = async () => {
    try {
      const response = await brain.get_webhook_email_config(); // Use the webhook email config API
      const webhookConfig = await response.json();
      
      // Get the status from the legacy endpoint
      const statusResponse = await brain.get_email_status();
      const status: EmailStatus = await statusResponse.json();
      
      // Merge webhook config info with status
      setEmailStatus({
        ...status,
        is_configured: webhookConfig.is_configured
      });
    } catch (error) {
      console.error('Error loading email status:', error);
      toast.error('Kunne ikke laste webhook e-post status');
    } finally {
      setIsLoading(false);
    }
  };

  const loadImapStatus = async () => {
    try {
      const response = await brain.get_imap_email_status();
      const status = await response.json();
      setImapStatus(status);
    } catch (error) {
      console.error('Error loading IMAP status:', error);
      toast.error('Feil ved lasting av IMAP status');
    }
  };

  const loadRecentDocuments = async () => {
    try {
      const response = await brain.list_processed_documents();
      const allDocs = await response.json();
      
      // Filter email documents and get recent ones
      const emailDocs = allDocs.filter((doc: EmailDocument) => 
        doc.source_type === 'email' || doc.source_type === 'email_pdf_attachment'
      );
      
      // Sort by processed date and take latest 10
      const sortedDocs = emailDocs.sort((a: EmailDocument, b: EmailDocument) => 
        new Date(b.processed_date).getTime() - new Date(a.processed_date).getTime()
      );
      
      setRecentDocuments(sortedDocs.slice(0, 10));
    } catch (error) {
      console.error('Error loading recent documents:', error);
    }
  };

  const checkEmails = async () => {
    setIsChecking(true);
    try {
      const response = await brain.check_emails();
      const result: CheckEmailsResponse = await response.json();
      
      toast.success(`E-post sjekk fullført! ${result.new_emails_count} nye e-poster`);
      
      // Reload status and documents
      await Promise.all([loadEmailStatus(), loadRecentDocuments()]);
    } catch (error) {
      console.error('Error checking emails:', error);
      toast.error('Feil ved sjekking av e-post');
    } finally {
      setIsChecking(false);
    }
  };

  const checkImapEmails = async () => {
    setIsCheckingImap(true);
    try {
      const response = await brain.check_imap_emails();
      const result = await response.json();
      
      toast.success(`IMAP e-post sjekk fullført! ${result.new_emails_count} nye e-poster`);
      
      // Reload status and documents
      await Promise.all([loadImapStatus(), loadRecentDocuments()]);
    } catch (error) {
      console.error('Error checking IMAP emails:', error);
      toast.error('Feil ved sjekking av IMAP e-post');
    } finally {
      setIsCheckingImap(false);
    }
  };

  useEffect(() => {
    Promise.all([loadEmailStatus(), loadImapStatus(), loadRecentDocuments()]);
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('no-NO');
    } catch {
      return dateString;
    }
  };

  const getSourceTypeLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'email':
        return 'E-post';
      case 'email_pdf_attachment':
        return 'PDF Vedlegg';
      default:
        return sourceType;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Laster e-post konfigurasjon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-post Integrasjon</h1>
          <p className="text-muted-foreground mt-2">
            To separate e-post systemer for automatisk mottak og prosessering
          </p>
        </div>
      </div>

      {/* Webhook Email System */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Webhook E-post System
              </CardTitle>
              <CardDescription>
                Konfigurerbart webhook mottak for e-post prosessering
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/email-inbox-page')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Webhook Inbox
              </Button>
              {emailStatus?.is_configured && (
                <Button onClick={checkEmails} disabled={isChecking}>
                  {isChecking ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Sjekk E-post Nå
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => navigate('/config-page?tab=webhook')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Konfigurer Webhook
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {emailStatus?.is_configured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">Webhook Status:</span>
              <Badge variant={emailStatus?.is_configured ? 'default' : 'destructive'}>
                {emailStatus?.is_configured ? 'Konfigurert' : 'Ikke konfigurert'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant={emailStatus?.enabled ? 'default' : 'secondary'}>
                {emailStatus?.enabled ? 'Aktiv' : 'Inaktiv'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Totalt prosessert:</span>
              <Badge variant="outline">
                {emailStatus?.total_processed || 0} e-poster
              </Badge>
            </div>
          </div>

          {emailStatus?.last_check && (
            <div className="text-sm text-muted-foreground">
              <strong>Sist sjekket:</strong> {formatDate(emailStatus.last_check)}
            </div>
          )}

          {emailStatus?.is_configured ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Webhook E-post Adresse</h4>
              <p className="text-green-800 text-sm">
                Konfigurert webhook e-post system
              </p>
              <p className="text-green-600 text-xs mt-1">
                Dette systemet mottar e-post via webhook. Klikk "Sjekk E-post Nå" for å se nye meldinger.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Webhook Ikke Konfigurert</h4>
              <p className="text-yellow-800 text-sm">
                Konfigurer webhook e-post innstillinger for automatisk mottak
              </p>
              <p className="text-yellow-600 text-xs mt-1">
                Gå til konfigurasjonssiden for å sette opp webhook e-post tilgang.
              </p>
              <Button 
                onClick={() => navigate('/config-page?tab=webhook')}
                className="mt-3"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Konfigurer Webhook Nå
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IMAP Email System */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                IMAP E-post System
              </CardTitle>
              <CardDescription>
                Konfigurerbart IMAP mottak for emailparser@digitool.no
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {imapStatus?.is_configured && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/imap-inbox-page')}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    IMAP Inbox
                  </Button>
                  <Button onClick={checkImapEmails} disabled={isCheckingImap}>
                    {isCheckingImap ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Sjekk IMAP E-post
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                onClick={() => navigate('/config-page')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Konfigurer IMAP
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {imapStatus?.is_configured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">IMAP Status:</span>
              <Badge variant={imapStatus?.is_configured ? 'default' : 'destructive'}>
                {imapStatus?.is_configured ? 'Konfigurert' : 'Ikke konfigurert'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Sist sjekket:</span>
              <span className="text-sm text-muted-foreground">
                {imapStatus?.last_check ? formatDate(imapStatus.last_check) : 'Aldri'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Totalt prosessert:</span>
              <Badge variant="secondary">{imapStatus?.total_processed || 0}</Badge>
            </div>
          </div>

          {imapStatus?.is_configured ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">IMAP E-post Adresse</h4>
              <p className="text-green-800 text-sm">
                Konfigurert e-post: <strong>{imapStatus.email_address}</strong>
              </p>
              <p className="text-green-600 text-xs mt-1">
                Dette systemet henter e-post direkte via IMAP. Bruk "IMAP Inbox" for manuell mal-mapping eller "Sjekk IMAP E-post" for automatisk prosessering.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">IMAP Ikke Konfigurert</h4>
              <p className="text-yellow-800 text-sm">
                Konfigurer IMAP innstillinger for å motta e-post på emailparser@digitool.no
              </p>
              <p className="text-yellow-600 text-xs mt-1">
                Gå til konfigurasjonssiden for å sette opp IMAP tilgang.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Email Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Nylig Prosesserte E-poster
          </CardTitle>
          <CardDescription>
            Siste dokumenter mottatt via e-post
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ingen e-post dokumenter funnet ennå</p>
              <p className="text-sm">Send en e-post til emailparser@digitool.no for å teste</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{getSourceTypeLabel(doc.source_type)}</Badge>
                        <Badge variant="secondary">{doc.template_name}</Badge>
                      </div>
                      
                      <h4 className="font-medium truncate">
                        {doc.email_subject || doc.original_filename}
                      </h4>
                      
                      {doc.email_from && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Fra: {doc.email_from}
                        </p>
                      )}
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        {Object.entries(doc.extracted_data).slice(0, 3).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-muted-foreground ml-4">
                      <div>Prosessert:</div>
                      <div>{formatDate(doc.processed_date)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}