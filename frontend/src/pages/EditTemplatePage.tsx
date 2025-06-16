import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import brain from 'brain';
import { PdfTemplate, PdfTemplateCreate, PdfTemplateUpdate, TargetField } from 'types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2 } from 'lucide-react'; // For delete field icon
import { toast } from 'sonner';

const EditTemplatePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const templateIdFromQuery = searchParams.get('id');
  const action = searchParams.get('action');
  const isNew = action === 'new' || !templateIdFromQuery;

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [targetFields, setTargetFields] = useState<Array<Partial<TargetField>>>([{ name: '', ai_hint: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false); // Added missing state for page loading
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null); 

  // TODO: Fetch template data if templateId exists
  // TODO: Implement save logic (create or update)

  useEffect(() => {
    if (templateIdFromQuery && !isNew) {
      console.log(`Fetching template with ID: ${templateIdFromQuery}`);
      setIsPageLoading(true);
      setPageError(null);
      console.log(`Fetching template with ID: ${templateIdFromQuery} for editing.`);
      brain.get_template({ templateId: templateIdFromQuery })
        .then(async (response) => {
          if (!response.ok) {
            const errData = await response.json().catch(() => ({ detail: "Failed to parse error response from get_template." }));
            throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
          }
          const data: PdfTemplate = await response.json();
          console.log("Fetched template data for edit:", data); // Ensure this log is present
          setTemplateName(data.name || ''); 
          setTemplateDescription(data.description || '');
          setTargetFields(
            data.target_fields && Array.isArray(data.target_fields)
              ? data.target_fields.map(tf => ({ 
                  name: tf.field_name, // Use field_name from API response
                  ai_hint: tf.ai_hint || '' 
                }))
              : [{ name: '', ai_hint: '' }],
          );
        })
        .catch(err => {
          console.error("Failed to fetch template:", err);
          setPageError(err.message || "Could not load template for editing.");
        })
        .finally(() => {
          setIsPageLoading(false);
        });
    }
  }, [templateIdFromQuery, isNew]);

  const handleTargetFieldChange = (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const updatedFields = [...targetFields];
    updatedFields[index] = { ...updatedFields[index], [name]: value };
    setTargetFields(updatedFields);
  };

  const addTargetField = () => {
    setTargetFields([...targetFields, { name: '', ai_hint: '' }]);
  };

  const removeTargetField = (index: number) => {
    const updatedFields = targetFields.filter((_, i) => i !== index);
    setTargetFields(updatedFields);
  };

  const handleSave = async () => {
    setError(null);

    // Validate template name
    if (!templateName.trim()) {
      setError("Template Name is required.");
      toast.error("Template Name is required.");
      return;
    }

    // Validate target fields - ensure at least one field and each field has a name
    const validTargetFields = targetFields.filter(field => field.name && field.name.trim() !== '');
    if (validTargetFields.length === 0) {
      setError("At least one Field Name is required in Fields to Extract.");
      toast.error("At least one Field Name is required.");
      return;
    }
    if (validTargetFields.length !== targetFields.length) {
      setError("All added fields must have a Field Name.");
      toast.error("Ensure all added fields have a Field Name.");
      return;
    }

    setIsLoading(true);

    const templateData: PdfTemplateCreate = {
      name: templateName.trim(),
      description: templateDescription.trim() || null, // API might expect null for empty optional fields
      target_fields: validTargetFields.map(f => ({
        field_name: f.name!, // Changed from 'name' to 'field_name' based on API error
        ai_hint: f.ai_hint?.trim() || null,
      })),
    };

    try {
      if (isNew) {
        const createData: PdfTemplateCreate = {
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          target_fields: validTargetFields.map(f => ({
            field_name: f.name!, // For create, API expects field_name
            ai_hint: f.ai_hint?.trim() || null,
          })),
        };
        console.log("Creating template:", createData);
        await brain.create_template(createData);
        toast.success("Template created successfully!");
        navigate('/manage-templates-page');
      } else {
        // Update existing template
        if (!templateIdFromQuery) {
          setError("Template ID is missing. Cannot update.");
          toast.error("Template ID is missing. Cannot update.");
          setIsLoading(false);
          return;
        }
        const updateData: PdfTemplateUpdate = {
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          target_fields: validTargetFields.map(f => ({
            field_name: f.name!, // Changed from name to field_name assuming backend expects this for update
            ai_hint: f.ai_hint?.trim() || null,
          })),
        };
        console.log("Updating template:", templateIdFromQuery, updateData);
        await brain.update_template({ templateId: templateIdFromQuery }, updateData );
        toast.success("Template updated successfully!");
        navigate('/manage-templates-page');
      }
    } catch (err: any) {
      console.error("Failed to save template. Full error object:", err);
      if (err.response) {
        console.error("Error response object:", err.response);
        console.error("Error response data:", err.response.data);
        console.error("Error response status:", err.response.status);
      }
      const errorMessage = err.response?.data?.detail || err.message || "An unknown error occurred while saving the template.";
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (pageError) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/manage-templates-page')} className="mt-4">Back to Templates</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Create New Template' : 'Edit Template'}</CardTitle>
          <CardDescription>
            {isNew ? 'Define a new template for PDF data extraction.' : `Editing template: ${templateName || templateIdFromQuery}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Save Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name</Label>
            <Input 
              id="templateName" 
              placeholder="e.g., Statsbygg Standard Order" 
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="templateDescription">Description (Optional)</Label>
            <Textarea 
              id="templateDescription"
              placeholder="A brief description of this template or its source."
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Fields to Extract</h3>
            {targetFields.map((field, index) => (
              <div key={index} className="p-4 border rounded-md mb-3 space-y-3 bg-slate-50">
                <div className="flex justify-between items-center">
                  <Label className="text-base">Field #{index + 1}</Label>
                  <Button variant="ghost" size="icon" onClick={() => removeTargetField(index)} disabled={isLoading || targetFields.length <= 1}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`fieldName-${index}`}>Field Name*</Label>
                  <Input 
                    id={`fieldName-${index}`}
                    name="name" 
                    placeholder="e.g., Order Number, Customer Name"
                    value={field.name || ''}
                    onChange={(e) => handleTargetFieldChange(index, e)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`aiHint-${index}`}>AI Hint (Optional)</Label>
                  <Textarea 
                    id={`aiHint-${index}`}
                    name="ai_hint"
                    placeholder="e.g., 'Look for a 10-digit number starting with ORD', 'The name following \'Contact Person:\''"
                    value={field.ai_hint || ''}
                    onChange={(e) => handleTargetFieldChange(index, e)}
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addTargetField} disabled={isLoading} className="mt-2">
              Add Another Field
            </Button>
          </div>

        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => navigate('/manage-templates-page')} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : (isNew ? 'Create Template' : 'Save Changes')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EditTemplatePage;
