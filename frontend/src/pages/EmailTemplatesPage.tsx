import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, TestTube, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import brain from 'brain';
import {
  EmailTemplate,
  EmailTemplateCreate,
  EmailTemplateUpdate,
  EmailMatchingCriteria,
  EmailExtractionField
} from 'types';

interface EmailTemplateFormData {
  name: string;
  description: string;
  senderDomains: string;
  senderEmails: string;
  subjectKeywords: string;
  requiredWords: string;
  excludedWords: string;
  extractionFields: EmailExtractionField[];
}

const EmailTemplatesPage = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<EmailTemplateFormData>({
    name: '',
    description: '',
    senderDomains: '',
    senderEmails: '',
    subjectKeywords: '',
    requiredWords: '',
    excludedWords: '',
    extractionFields: []
  });
  const [testMode, setTestMode] = useState(false);
  const [testData, setTestData] = useState({
    emailContent: '',
    emailSubject: '',
    emailSender: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await brain.list_email_templates();
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading email templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      senderDomains: '',
      senderEmails: '',
      subjectKeywords: '',
      requiredWords: '',
      excludedWords: '',
      extractionFields: []
    });
    setEditingTemplate(null);
    setShowCreateForm(false);
  };

  const startEdit = (template: EmailTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      senderDomains: template.matching_criteria.sender_domains.join(', '),
      senderEmails: template.matching_criteria.sender_emails.join(', '),
      subjectKeywords: template.matching_criteria.subject_keywords.join(', '),
      requiredWords: template.matching_criteria.required_words.join(', '),
      excludedWords: template.matching_criteria.excluded_words.join(', '),
      extractionFields: [...template.extraction_fields]
    });
    setEditingTemplate(template);
    setShowCreateForm(true);
  };

  const addExtractionField = () => {
    setFormData(prev => ({
      ...prev,
      extractionFields: [...prev.extractionFields, {
        field_name: '',
        ai_hint: '',
        required: false
      }]
    }));
  };

  const updateExtractionField = (index: number, field: Partial<EmailExtractionField>) => {
    setFormData(prev => ({
      ...prev,
      extractionFields: prev.extractionFields.map((f, i) => 
        i === index ? { ...f, ...field } : f
      )
    }));
  };

  const removeExtractionField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      extractionFields: prev.extractionFields.filter((_, i) => i !== index)
    }));
  };

  const saveTemplate = async () => {
    try {
      const matchingCriteria: EmailMatchingCriteria = {
        sender_domains: formData.senderDomains.split(',').map(s => s.trim()).filter(Boolean),
        sender_emails: formData.senderEmails.split(',').map(s => s.trim()).filter(Boolean),
        subject_keywords: formData.subjectKeywords.split(',').map(s => s.trim()).filter(Boolean),
        required_words: formData.requiredWords.split(',').map(s => s.trim()).filter(Boolean),
        excluded_words: formData.excludedWords.split(',').map(s => s.trim()).filter(Boolean)
      };

      if (editingTemplate) {
        // Update existing template
        const updateData: EmailTemplateUpdate = {
          name: formData.name,
          description: formData.description,
          matching_criteria: matchingCriteria,
          extraction_fields: formData.extractionFields
        };
        
        await brain.update_email_template({ templateId: editingTemplate.id! }, updateData);
        toast.success('Email template updated successfully');
      } else {
        // Create new template
        const createData: EmailTemplateCreate = {
          name: formData.name,
          description: formData.description,
          matching_criteria: matchingCriteria,
          extraction_fields: formData.extractionFields
        };
        
        await brain.create_email_template(createData);
        toast.success('Email template created successfully');
      }
      
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save email template');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this email template?')) return;
    
    try {
      await brain.delete_email_template({ templateId });
      toast.success('Email template deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete email template');
    }
  };

  const testTemplate = async (templateId: string) => {
    try {
      const response = await brain.test_email_template_match({
        template_id: templateId,
        email_content: testData.emailContent,
        email_subject: testData.emailSubject,
        email_sender: testData.emailSender
      });
      
      const result = await response.json();
      
      toast.success(
        `Match Score: ${(result.confidence_score * 100).toFixed(1)}% - ${result.auto_processable ? 'Auto-processable' : 'Manual review needed'}`,
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Error testing template:', error);
      toast.error('Failed to test template');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading email templates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground mt-2">
            Manage templates for automatic email processing and data extraction
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={testMode ? "default" : "outline"}
            onClick={() => setTestMode(!testMode)}
          >
            <TestTube className="w-4 h-4 mr-2" />
            Test Mode
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {testMode && (
        <Card>
          <CardHeader>
            <CardTitle>Test Email Templates</CardTitle>
            <CardDescription>
              Test how well your templates match against sample emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="test-sender">Email Sender</Label>
                <Input
                  id="test-sender"
                  value={testData.emailSender}
                  onChange={(e) => setTestData(prev => ({ ...prev, emailSender: e.target.value }))}
                  placeholder="sender@example.com"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="test-subject">Email Subject</Label>
                <Input
                  id="test-subject"
                  value={testData.emailSubject}
                  onChange={(e) => setTestData(prev => ({ ...prev, emailSubject: e.target.value }))}
                  placeholder="Subject line..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="test-content">Email Content</Label>
              <Textarea
                id="test-content"
                value={testData.emailContent}
                onChange={(e) => setTestData(prev => ({ ...prev, emailContent: e.target.value }))}
                placeholder="Email content..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{editingTemplate ? 'Edit Email Template' : 'Create Email Template'}</CardTitle>
                <CardDescription>
                  Define matching criteria and extraction fields for email processing
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Statsbygg Orders"
                />
              </div>
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Template description..."
                />
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Matching Criteria</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sender-domains">Sender Domains</Label>
                  <Input
                    id="sender-domains"
                    value={formData.senderDomains}
                    onChange={(e) => setFormData(prev => ({ ...prev, senderDomains: e.target.value }))}
                    placeholder="@statsbygg.no, @oslobygg.no"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated domains</p>
                </div>
                
                <div>
                  <Label htmlFor="sender-emails">Sender Emails</Label>
                  <Input
                    id="sender-emails"
                    value={formData.senderEmails}
                    onChange={(e) => setFormData(prev => ({ ...prev, senderEmails: e.target.value }))}
                    placeholder="orders@statsbygg.no"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated email addresses</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subject-keywords">Subject Keywords</Label>
                  <Input
                    id="subject-keywords"
                    value={formData.subjectKeywords}
                    onChange={(e) => setFormData(prev => ({ ...prev, subjectKeywords: e.target.value }))}
                    placeholder="bestilling, ordre, oppdrag"
                  />
                </div>
                
                <div>
                  <Label htmlFor="required-words">Required Words</Label>
                  <Input
                    id="required-words"
                    value={formData.requiredWords}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiredWords: e.target.value }))}
                    placeholder="Words that must appear"
                  />
                </div>
                
                <div>
                  <Label htmlFor="excluded-words">Excluded Words</Label>
                  <Input
                    id="excluded-words"
                    value={formData.excludedWords}
                    onChange={(e) => setFormData(prev => ({ ...prev, excludedWords: e.target.value }))}
                    placeholder="Words that disqualify"
                  />
                </div>
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Extraction Fields</h3>
                <Button variant="outline" size="sm" onClick={addExtractionField}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Field
                </Button>
              </div>
              
              {formData.extractionFields.map((field, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Field Name</Label>
                        <Input
                          value={field.field_name}
                          onChange={(e) => updateExtractionField(index, { field_name: e.target.value })}
                          placeholder="e.g., Oppdragsgiver"
                        />
                      </div>
                      
                      <div>
                        <Label>AI Hint</Label>
                        <Input
                          value={field.ai_hint || ''}
                          onChange={(e) => updateExtractionField(index, { ai_hint: e.target.value })}
                          placeholder="Hint for AI extraction"
                        />
                      </div>
                      
                      <div className="flex items-end gap-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateExtractionField(index, { required: checked })}
                          />
                          <Label>Required</Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExtractionField(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={saveTemplate}>
                <Save className="w-4 h-4 mr-2" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    {!template.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {testMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testTemplate(template.id!)}
                      disabled={!testData.emailContent || !testData.emailSubject}
                    >
                      <TestTube className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(template)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTemplate(template.id!)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Matching Criteria:</strong>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {template.matching_criteria.sender_domains.length > 0 && (
                      <li>Domains: {template.matching_criteria.sender_domains.join(', ')}</li>
                    )}
                    {template.matching_criteria.subject_keywords.length > 0 && (
                      <li>Keywords: {template.matching_criteria.subject_keywords.join(', ')}</li>
                    )}
                    {template.matching_criteria.required_words.length > 0 && (
                      <li>Required: {template.matching_criteria.required_words.join(', ')}</li>
                    )}
                  </ul>
                </div>
                <div>
                  <strong>Extraction Fields ({template.extraction_fields.length}):</strong>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {template.extraction_fields.slice(0, 3).map((field, index) => (
                      <li key={index}>
                        {field.field_name}
                        {field.required && <span className="text-red-500">*</span>}
                      </li>
                    ))}
                    {template.extraction_fields.length > 3 && (
                      <li>... and {template.extraction_fields.length - 3} more</li>
                    )}
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Usage: {template.usage_count} emails</span>
                {template.created_date && (
                  <span>Created: {new Date(template.created_date).toLocaleDateString()}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {templates.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No Email Templates</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email template to start automatic processing
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Email Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmailTemplatesPage;