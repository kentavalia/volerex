import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Edit, Eye, Filter, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import backend from 'brain';
import { ProcessedDocument } from 'types';
import { useUserGuardContext } from 'app';
import PdfViewerModal from 'components/PdfViewerModal';
import EditDocumentModal from 'components/EditDocumentModal';

const ReportsPage = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useUserGuardContext();

  // Filter states
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [emailSourceFilter, setEmailSourceFilter] = useState('all');
  const [senderFilter, setSenderFilter] = useState('all');
  
  // Available templates for filtering
  const [availableTemplates, setAvailableTemplates] = useState<{id: string, name: string}[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [availableSenders, setAvailableSenders] = useState<string[]>([]);

  // Modal states
  const [selectedDocumentForView, setSelectedDocumentForView] = useState<ProcessedDocument | null>(null);
  const [selectedDocumentForEdit, setSelectedDocumentForEdit] = useState<ProcessedDocument | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await backend.list_processed_documents();
      const data = await response.json();
      setDocuments(data);
      setFilteredDocuments(data);
      
      // Extract unique templates for filter dropdown
      const uniqueTemplates = new Map<string, string>();
      const uniqueSenders = new Set<string>();
      data.forEach((doc: ProcessedDocument) => {
        if (doc.template_id && doc.template_name) {
          uniqueTemplates.set(doc.template_id, doc.template_name);
        }
        if (doc.email_sender) {
          uniqueSenders.add(doc.email_sender);
        }
      });
      setAvailableTemplates(
        Array.from(uniqueTemplates.entries()).map(([id, name]) => ({ id, name }))
      );
      setAvailableSenders(Array.from(uniqueSenders).sort());
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Kunne ikke laste inn dokumenter');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(doc => doc.source === sourceFilter);
    }

    // Email source filter (webhook vs IMAP)
    if (emailSourceFilter !== 'all') {
      if (emailSourceFilter === 'webhook') {
        filtered = filtered.filter(doc => doc.email_address === 'mottak@digitool.no');
      } else if (emailSourceFilter === 'imap') {
        filtered = filtered.filter(doc => doc.email_address === 'emailparser@digitool.no');
      }
    }

    // Sender filter
    if (senderFilter !== 'all') {
      filtered = filtered.filter(doc => doc.email_sender === senderFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Template filter
    if (templateFilter !== 'all') {
      if (templateFilter === 'no_template') {
        filtered = filtered.filter(doc => !doc.template_id);
      } else {
        filtered = filtered.filter(doc => doc.template_id === templateFilter);
      }
    }

    // Search term
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email_sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email_subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.template_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocuments(filtered);
    
    // Clear selections when filters change
    setSelectedDocuments([]);
    setSelectedTemplate(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select documents with the same template
      if (filteredDocuments.length > 0) {
        const firstTemplate = filteredDocuments[0].template_id;
        const sameTemplateDocuments = filteredDocuments.filter(doc => doc.template_id === firstTemplate);
        setSelectedDocuments(sameTemplateDocuments.map(doc => doc.id));
        setSelectedTemplate(firstTemplate || null);
      }
    } else {
      setSelectedDocuments([]);
      setSelectedTemplate(null);
    }
  };

  const handleSelectDocument = (documentId: string, checked: boolean) => {
    const document = filteredDocuments.find(doc => doc.id === documentId);
    if (!document) return;

    if (checked) {
      // Check if this is the first selection or if template matches
      if (selectedDocuments.length === 0) {
        setSelectedDocuments([documentId]);
        setSelectedTemplate(document.template_id || null);
      } else if (document.template_id === selectedTemplate) {
        setSelectedDocuments(prev => [...prev, documentId]);
      } else {
        const selectedTemplateName = selectedTemplate 
          ? availableTemplates.find(t => t.id === selectedTemplate)?.name || 'Ingen mal'
          : 'Ingen mal';
        toast.error(`Kan ikke velge dokumenter med forskjellige maler. Valgte dokumenter bruker mal: ${selectedTemplateName}`);
      }
    } else {
      const newSelected = selectedDocuments.filter(id => id !== documentId);
      setSelectedDocuments(newSelected);
      if (newSelected.length === 0) {
        setSelectedTemplate(null);
      }
    }
  };

  const exportSelectedDocuments = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('Velg dokumenter å eksportere');
      return;
    }

    try {
      setIsExporting(true);
      const response = await backend.export_batch_documents({ document_ids: selectedDocuments });
      const result = await response.json();
      
      // Download the exported file
      const downloadResponse = await backend.download_export_file({ filename: result.filename });
      
      if (downloadResponse.ok) {
        // Create blob and download
        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`Eksporterte og lastet ned ${result.document_count} dokumenter`);
      } else {
        toast.error('Kunne ikke laste ned eksportfilen');
      }
      
      // Reload documents to update export status
      await loadDocuments();
    } catch (error) {
      console.error('Error exporting documents:', error);
      toast.error('Kunne ikke eksportere dokumenter');
    } finally {
      setIsExporting(false);
    }
  };

  const deleteSelectedDocuments = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('Velg dokumenter å slette');
      return;
    }

    const confirmed = window.confirm(
      `Er du sikker på at du vil slette ${selectedDocuments.length} dokumenter? Dette kan ikke angres.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const response = await backend.delete_batch_documents({ document_ids: selectedDocuments });
      const result = await response.json();
      
      toast.success(`Slettet ${result.deleted_count} dokumenter`);
      
      // Clear selections and reload documents
      setSelectedDocuments([]);
      setSelectedTemplate(null);
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting documents:', error);
      toast.error('Kunne ikke slette dokumenter');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteSingleDocument = async (documentId: string, filename: string) => {
    const confirmed = window.confirm(
      `Er du sikker på at du vil slette dokumentet "${filename}"? Dette kan ikke angres.`
    );

    if (!confirmed) return;

    try {
      const response = await backend.delete_processed_document({ documentId });
      await response.json();
      
      toast.success('Dokument slettet');
      
      // Clear selections if the deleted document was selected
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
      if (selectedDocuments.length === 1 && selectedDocuments[0] === documentId) {
        setSelectedTemplate(null);
      }
      
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Kunne ikke slette dokument');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge variant="secondary">Prosessert</Badge>;
      case 'exported':
        return <Badge variant="default">Eksportert</Badge>;
      case 'corrected':
        return <Badge variant="outline">Korrigert</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'file_upload':
        return <Badge variant="outline">Fil-opplasting</Badge>;
      case 'email':
        return <Badge variant="outline">E-post</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  const getEmailSourceBadge = (emailAddress: string | null | undefined) => {
    if (!emailAddress) return null;
    
    switch (emailAddress) {
      case 'mottak@digitool.no':
        return <Badge variant="default" className="bg-blue-500">Webhook</Badge>;
      case 'emailparser@digitool.no':
        return <Badge variant="default" className="bg-green-500">IMAP</Badge>;
      default:
        return <Badge variant="outline">{emailAddress}</Badge>;
    }
  };

  const openPdfViewer = (document: ProcessedDocument) => {
    setSelectedDocumentForView(document);
    setIsPdfViewerOpen(true);
  };

  const openEditModal = (document: ProcessedDocument) => {
    setSelectedDocumentForEdit(document);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsPdfViewerOpen(false);
    setIsEditModalOpen(false);
    setSelectedDocumentForView(null);
    setSelectedDocumentForEdit(null);
  };

  const handleDocumentSaved = () => {
    // Reload documents after editing
    loadDocuments();
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

  useEffect(() => {
    applyFilters();
  }, [sourceFilter, statusFilter, templateFilter, searchTerm, emailSourceFilter, senderFilter, documents]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rapporter</h1>
          <p className="text-muted-foreground">
            Oversikt over alle prosesserte dokumenter
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportSelectedDocuments}
            disabled={selectedDocuments.length === 0 || isExporting}
            variant="default"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Eksporterer...' : `Eksporter (${selectedDocuments.length})`}
          </Button>
          <Button
            onClick={deleteSelectedDocuments}
            disabled={selectedDocuments.length === 0 || isDeleting}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Sletter...' : `Slett (${selectedDocuments.length})`}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Søk</label>
              <Input
                placeholder="Søk i filnavn, avsender, emne..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Mal</label>
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle maler</SelectItem>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="no_template">Ingen mal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Kilde</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle kilder</SelectItem>
                  <SelectItem value="file_upload">Fil-opplasting</SelectItem>
                  <SelectItem value="email">E-post</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statuser</SelectItem>
                  <SelectItem value="processed">Prosessert</SelectItem>
                  <SelectItem value="exported">Eksportert</SelectItem>
                  <SelectItem value="corrected">Korrigert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">E-post System</label>
              <Select value={emailSourceFilter} onValueChange={setEmailSourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle systemer</SelectItem>
                  <SelectItem value="webhook">Webhook (mottak@digitool.no)</SelectItem>
                  <SelectItem value="imap">IMAP (emailparser@digitool.no)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">E-post Avsender</label>
              <Select value={senderFilter} onValueChange={setSenderFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle avsendere</SelectItem>
                  {availableSenders.map((sender) => (
                    <SelectItem key={sender} value={sender}>
                      {sender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSourceFilter('all');
                  setStatusFilter('all');
                  setTemplateFilter('all');
                  setSearchTerm('');
                  setEmailSourceFilter('all');
                  setSenderFilter('all');
                }}
                className="w-full"
              >
                Nullstill filtre
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Prosesserte dokumenter ({filteredDocuments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Laster inn dokumenter...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ingen dokumenter funnet</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Fil</TableHead>
                    <TableHead>Kilde</TableHead>
                    <TableHead>E-post System</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mal</TableHead>
                    <TableHead>Avsender/E-post</TableHead>
                    <TableHead>Mottatt Dato</TableHead>
                    <TableHead>Prosessert</TableHead>
                    <TableHead>Sist eksportert</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={(checked) => handleSelectDocument(doc.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-500" />
                          <span className="font-medium">{doc.original_filename}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getSourceBadge(doc.source)}</TableCell>
                      <TableCell>{getEmailSourceBadge(doc.email_address)}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        {doc.template_name ? (
                          <span className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                            {doc.template_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Ingen mal</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.source === 'email' ? (
                          <div className="text-sm">
                            <div className="font-medium">{doc.email_sender}</div>
                            <div className="text-muted-foreground truncate max-w-48">
                              {doc.email_subject}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Fil-opplasting</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.email_received_date ? formatDate(doc.email_received_date) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(doc.processed_date)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.last_exported_date ? formatDate(doc.last_exported_date) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-end">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openPdfViewer(doc)}
                            title="Se PDF"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openEditModal(doc)}
                            title="Rediger data"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {doc.pdf_storage_key && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => openPdfViewer(doc)}
                              title="Åpne PDF"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => deleteSingleDocument(doc.id, doc.original_filename)}
                            title="Slett dokument"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modals */}
      <PdfViewerModal
        isOpen={isPdfViewerOpen}
        onClose={handleModalClose}
        documentId={selectedDocumentForView?.id || ''}
        filename={selectedDocumentForView?.original_filename || ''}
      />
      
      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        document={selectedDocumentForEdit}
        onSave={handleDocumentSaved}
      />
    </div>
  );
};

export default ReportsPage;