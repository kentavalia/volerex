import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrentUser, API_URL, backend } from "app";
import { ExtractedField, ExtractionResponse, PdfTemplate, ProcessedDocument } from "types";
import * as XLSX from 'xlsx'; // Import XLSX library
import { useNavigate } from 'react-router-dom';
import { Mail, Settings, FileText, Upload, Cog, Webhook, Database, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const App = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedField[] | null>(null);
  const [rawTextSample, setRawTextSample] = useState<string | null>(null);

  // States for template selection
  const [availableTemplates, setAvailableTemplates] = useState<PdfTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  // Dashboard statistics
  const [documentStats, setDocumentStats] = useState({
    total: 0,
    webhook: 0,
    imap: 0,
    today: 0
  });

  const { user, loading: userLoading } = useCurrentUser(); // Get current user
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setResponseMessage(null); // Clear previous messages
      setUploadedFileName(null);
      setError(null);
      setExtractedData(null);
      setRawTextSample(null);
    }
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user) return; // Should not happen if userLoading is false and user is null, but good check
      setIsLoadingTemplates(true);
      setError(null); // Clear previous general errors
      try {
        const response = await backend.list_templates();
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: "Failed to fetch templates and parse error response." }));
          throw new Error(errorData.detail || `Failed to fetch templates: ${response.status}`);
        }
        const templatesData: PdfTemplate[] = await response.json();
        setAvailableTemplates(templatesData);
      } catch (err: any) {
        console.error("Error fetching templates:", err);
        // Set a more specific error for template loading if desired, or append to general error
        setError(prevError => prevError ? `${prevError}\n${err.message}` : err.message);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    const fetchDocumentStats = async () => {
      if (!user) return;
      try {
        const response = await backend.list_processed_documents();
        if (response.ok) {
          const documents: ProcessedDocument[] = await response.json();
          const today = new Date().toISOString().split('T')[0];
          
          const stats = {
            total: documents.length,
            webhook: documents.filter(doc => doc.email_address === 'mottak@digitool.no').length,
            imap: documents.filter(doc => doc.email_address === 'emailparser@digitool.no').length,
            today: documents.filter(doc => 
              doc.processed_date && doc.processed_date.startsWith(today)
            ).length
          };
          
          setDocumentStats(stats);
        }
      } catch (err) {
        console.error('Error fetching document stats:', err);
      }
    };

    if (user && !userLoading) { 
      fetchTemplates();
      fetchDocumentStats();
    } else {
      setAvailableTemplates([]); // Clear templates if user logs out or is not loaded
      setSelectedTemplateId(null);
      setDocumentStats({ total: 0, webhook: 0, imap: 0, today: 0 });
    }
  }, [user, userLoading]);

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }
    if (!user && !userLoading) { // Check if user is not loaded and not currently loading
      setError("You must be logged in to upload files.");
      // Optionally, redirect to login or show login modal
      return;
    }
    if (userLoading) {
      setError("Authenticating user, please wait...");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponseMessage(null);
    setExtractedData(null);
    setRawTextSample(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (selectedTemplateId) {
      formData.append("template_id", selectedTemplateId);
      console.log(`Uploading ${selectedFile.name} with template ID: ${selectedTemplateId}`);
    } else {
      console.log(`Uploading ${selectedFile.name} without a specific template ID.`);
    }

    try {
      const token = await user?.getIdToken(); // Get Firebase ID token
      if (!token) {
        setError("Authentication token not available. Please try logging in again.");
        setIsLoading(false);
        return;
      }

      // Kept fetch for now due to multipart/form-data handling with UploadFile + Form in generated client
      const response = await fetch(
        `${API_URL}/pdf-parser/extract-data`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          credentials: "include",
        }
      );

      // console.log("Response status:", response.status);
      // console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      // const rawResponseText = await response.text();
      // console.log("Raw response text:", rawResponseText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "An unknown error occurred, and error response was not valid JSON." }));
        // console.error("Error data from response:", errorData);
        throw new Error(errorData.detail || `Server responded with status ${response.status}`);
      }

      // const data = JSON.parse(rawResponseText); // If response.json() fails due to earlier text() call
      const data: ExtractionResponse = await response.json();
      setResponseMessage(data.message);
      setUploadedFileName(data.file_name);
      setExtractedData(data.extracted_data || null); 
      setRawTextSample(data.raw_text_sample || null);

    } catch (err: any) {
      console.error("File upload error:", err);
      setError(err.message || "An unexpected error occurred during file upload.");
      setResponseMessage(null);
      setUploadedFileName(null);
      setExtractedData(null);
      setRawTextSample(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToExcel = () => {
    if (!extractedData || extractedData.length === 0) {
      setError("No data available to export.");
      return;
    }

    // Prepare data for XLSX:
    // First row is headers
    const dataForExcel = [
      ["Field Name", "Value"] // Headers
    ];

    // Subsequent rows are the extracted field names and their values
    extractedData.forEach(field => {
      dataForExcel.push([field.field_name, field.value !== null ? String(field.value) : "N/A"]);
    });

    try {
      const worksheet = XLSX.utils.aoa_to_sheet(dataForExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");

      // Generate a filename, e.g., based on the uploaded file or a generic one
      const exportFileName = uploadedFileName ? 
        `${uploadedFileName.substring(0, uploadedFileName.lastIndexOf('.'))}_extraction.xlsx` :
        "extraction_export.xlsx";

      XLSX.writeFile(workbook, exportFileName);
      setResponseMessage("Data successfully exported to Excel."); // Optional success message
    } catch (exportError: any) {
      console.error("Error exporting to Excel:", exportError);
      setError(`Failed to export data to Excel: ${exportError.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center">
      {/* Dashboard Statistics */}
      {user && (
        <div className="w-full max-w-6xl mb-6">
          <h2 className="text-2xl font-bold mb-4">Systemstatus</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totalt Dokumenter</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documentStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Alle prosesserte dokumenter
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Webhook System</CardTitle>
                <Webhook className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{documentStats.webhook}</div>
                <p className="text-xs text-muted-foreground">
                  mottak@digitool.no
                </p>
                <Badge variant="default" className="bg-blue-500 mt-1">Webhook</Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IMAP System</CardTitle>
                <Database className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{documentStats.imap}</div>
                <p className="text-xs text-muted-foreground">
                  emailparser@digitool.no
                </p>
                <Badge variant="default" className="bg-green-500 mt-1">IMAP</Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">I dag</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{documentStats.today}</div>
                <p className="text-xs text-muted-foreground">
                  Prosessert i dag
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {/* Navigation Cards */}
      <div className="w-full max-w-6xl mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/email-inbox-page')}>
            <CardHeader className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-2 text-blue-600" />
              <CardTitle>E-postinnboks</CardTitle>
              <CardDescription>
                Administrer innkommende e-poster med PDF-vedlegg
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/config-page')}>
            <CardHeader className="text-center">
              <Cog className="h-12 w-12 mx-auto mb-2 text-orange-600" />
              <CardTitle>Konfigurasjon</CardTitle>
              <CardDescription>
                Sett opp e-post og andre systeminnstillinger
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/manage-templates-page')}>
            <CardHeader className="text-center">
              <Settings className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <CardTitle>Administrer maler</CardTitle>
              <CardDescription>
                Opprett og administrer maler for datauttrekk
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/reports-page')}>
            <CardHeader className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-2 text-purple-600" />
              <CardTitle>Rapporter</CardTitle>
              <CardDescription>
                Se alle prosesserte dokumenter og eksporter data
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="text-center">
              <Upload className="h-12 w-12 mx-auto mb-2 text-blue-600" />
              <CardTitle>Last opp PDF</CardTitle>
              <CardDescription>
                Last opp PDF direkte for øyeblikkelig prosessering
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">DataFlow PDF Extractor</CardTitle>
          <CardDescription className="text-center">
            Upload a PDF file to extract structured data using AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="pdf-upload" className="block text-sm font-medium text-gray-700">
              Choose PDF file
            </label>
            <Input 
              id="pdf-upload" 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange} 
              className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
          </div>

          {/* Template Selection Dropdown */}
          {user && availableTemplates.length > 0 && (
            <div className="space-y-2 mt-4">
              <label htmlFor="template-select" className="block text-sm font-medium text-gray-700">
                Choose Template (Optional)
              </label>
              <select
                id="template-select"
                value={selectedTemplateId || ""} // Ensure value is empty string if null for <select>
                onChange={(e) => setSelectedTemplateId(e.target.value || null)} // Set to null if empty string
                disabled={isLoadingTemplates || isLoading || userLoading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
              >
                <option value="">No template / Generic extraction</option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id!}> {/* Assuming template.id is never null/undefined here */}
                    {template.name}
                  </option>
                ))}
              </select>
              {isLoadingTemplates && <p className="text-xs text-gray-500 mt-1">Loading templates...</p>}
            </div>
          )}
          {user && !isLoadingTemplates && availableTemplates.length === 0 && !userLoading && (
             <p className="text-xs text-gray-500 mt-1">No templates found or you might need to create one.</p>
          )}
          
          {selectedFile && (
            <Alert variant="default">
              <AlertTitle>Selected File</AlertTitle>
              <AlertDescription>
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleFileUpload} 
            disabled={!selectedFile || isLoading || userLoading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-150 ease-in-out"
          >
            {isLoading ? "Processing..." : userLoading ? "Authenticating..." : "Upload and Process PDF"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Export to Excel Button */}
          {extractedData && extractedData.length > 0 && (
            <Button 
              onClick={handleExportToExcel} 
              disabled={isLoading} 
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition duration-150 ease-in-out"
            >
              Export to Excel
            </Button>
          )}

          {responseMessage && !error && (
            <Alert variant="success">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{responseMessage}</AlertDescription>
            </Alert>
          )}
          
          {uploadedFileName && !error && (
            <p className="text-sm text-gray-600 mt-2">Processed file: <strong>{uploadedFileName}</strong></p>
          )}

          {rawTextSample && !error && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Raw Text Sample (first 500 characters):</h3>
              <textarea 
                readOnly 
                value={rawTextSample} 
                className="w-full h-32 p-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
            </div>
          )}

          {extractedData && extractedData.length > 0 && !error && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Extracted Data:</h3>
              <ul className="space-y-1 list-disc list-inside bg-gray-50 p-4 rounded-md border border-gray-300">
                {extractedData.map((field, index) => (
                  <li key={index} className="text-sm">
                    <strong className="font-medium">{field.field_name}:</strong> {field.value !== null ? field.value : <span className="text-gray-400 italic">N/A</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {extractedData && extractedData.length === 0 && !error && responseMessage && (
             <Alert variant="default" className="mt-4">
              <AlertTitle>Extraction Note</AlertTitle>
              <AlertDescription>
                AI processing seems complete, but no specific data fields were extracted or mapped. The AI might not have found relevant information or the PDF content was not suitable for the current extraction logic.
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
        <CardFooter className="text-center text-xs text-gray-500">
          Ensure your PDF files are clear and text-based for best results.
        </CardFooter>
      </Card>
    </div>
  );
};

export default App;
