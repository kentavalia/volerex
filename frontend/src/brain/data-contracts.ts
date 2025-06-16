/** BatchExportRequest */
export interface BatchExportRequest {
  /** Document Ids */
  document_ids: string[];
}

/** DocumentFilter */
export interface DocumentFilter {
  /** Source */
  source?: string | null;
  /** Status */
  status?: string | null;
  /** Template Id */
  template_id?: string | null;
  /** Start Date */
  start_date?: string | null;
  /** End Date */
  end_date?: string | null;
  /** User Id */
  user_id?: string | null;
}

/** EmailCheckResponse */
export interface EmailCheckResponse {
  /** Message */
  message: string;
  /** New Emails Count */
  new_emails_count: number;
  /** Processed Documents */
  processed_documents: EmailDocument[];
}

/** EmailConfigRequest */
export interface EmailConfigRequest {
  /** Username */
  username: string;
  /** Password */
  password?: string | null;
  /** Imap Server */
  imap_server: string;
  /**
   * Port
   * @default 993
   */
  port?: number;
}

/** EmailConfigTestResponse */
export interface EmailConfigTestResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
}

/**
 * EmailConfigUpdate
 * Model for updating email configuration
 */
export interface EmailConfigUpdate {
  /** Imap Server */
  imap_server: string;
  /** Username */
  username: string;
  /** Password */
  password: string;
  /**
   * Port
   * @default 993
   */
  port?: number | null;
  /**
   * Use Ssl
   * @default true
   */
  use_ssl?: boolean;
  /**
   * Enabled
   * @default true
   */
  enabled?: boolean;
}

/** EmailDocument */
export interface EmailDocument {
  /** Id */
  id: string;
  /** Sender */
  sender: string;
  /** Subject */
  subject: string;
  /** Received Date */
  received_date: string;
  /** Pdf Count */
  pdf_count: number;
  /** Status */
  status: string;
  /** Error Message */
  error_message?: string | null;
}

/**
 * EmailExtractionField
 * Field to extract from email content
 */
export interface EmailExtractionField {
  /** Id */
  id?: string | null;
  /** Field Name */
  field_name: string;
  /** Ai Hint */
  ai_hint?: string | null;
  /**
   * Required
   * @default false
   */
  required?: boolean;
  /** Validation Pattern */
  validation_pattern?: string | null;
}

/**
 * EmailMatchingCriteria
 * Criteria for matching emails to templates
 */
export interface EmailMatchingCriteria {
  /**
   * Sender Domains
   * @default []
   */
  sender_domains?: string[];
  /**
   * Sender Emails
   * @default []
   */
  sender_emails?: string[];
  /**
   * Subject Keywords
   * @default []
   */
  subject_keywords?: string[];
  /**
   * Required Words
   * @default []
   */
  required_words?: string[];
  /**
   * Excluded Words
   * @default []
   */
  excluded_words?: string[];
}

/** EmailStatus */
export interface EmailStatus {
  /** Is Configured */
  is_configured: boolean;
  /** Last Check */
  last_check?: string | null;
  /** Total Processed */
  total_processed: number;
  /** Enabled */
  enabled: boolean;
}

/**
 * EmailTemplate
 * Template for processing email orders/requests
 */
export interface EmailTemplate {
  /** Id */
  id?: string | null;
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /**
   * Template Type
   * @default "email"
   */
  template_type?: string;
  /** Criteria for matching emails to templates */
  matching_criteria: EmailMatchingCriteria;
  /** Extraction Fields */
  extraction_fields: EmailExtractionField[];
  /** Created Date */
  created_date?: string | null;
  /** Updated Date */
  updated_date?: string | null;
  /** Created By */
  created_by?: string | null;
  /**
   * Is Active
   * @default true
   */
  is_active?: boolean;
  /**
   * Usage Count
   * @default 0
   */
  usage_count?: number;
}

/**
 * EmailTemplateCreate
 * Schema for creating new email template
 */
export interface EmailTemplateCreate {
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /** Criteria for matching emails to templates */
  matching_criteria: EmailMatchingCriteria;
  /** Extraction Fields */
  extraction_fields: EmailExtractionField[];
}

/**
 * EmailTemplateUpdate
 * Schema for updating email template
 */
export interface EmailTemplateUpdate {
  /** Name */
  name?: string | null;
  /** Description */
  description?: string | null;
  matching_criteria?: EmailMatchingCriteria | null;
  /** Extraction Fields */
  extraction_fields?: EmailExtractionField[] | null;
  /** Is Active */
  is_active?: boolean | null;
}

/** ExtractedField */
export interface ExtractedField {
  /** Field Name */
  field_name: string;
  /** Value */
  value: string | null;
  /** Confidence */
  confidence?: number | null;
}

/** ExtractionResponse */
export interface ExtractionResponse {
  /** Message */
  message: string;
  /** File Name */
  file_name: string;
  /** Extracted Data */
  extracted_data?: ExtractedField[] | null;
  /** Raw Text Sample */
  raw_text_sample?: string | null;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** ImapEmailCheckResponse */
export interface ImapEmailCheckResponse {
  /** Message */
  message: string;
  /** New Emails Count */
  new_emails_count: number;
  /** Processed Documents */
  processed_documents: ImapEmailDocument[];
}

/** ImapEmailDocument */
export interface ImapEmailDocument {
  /** Id */
  id: string;
  /** Sender */
  sender: string;
  /** Subject */
  subject: string;
  /** Received Date */
  received_date: string;
  /** Pdf Count */
  pdf_count: number;
  /** Status */
  status: string;
  /** Error Message */
  error_message?: string | null;
}

/** ImapEmailStatus */
export interface ImapEmailStatus {
  /** Is Configured */
  is_configured: boolean;
  /** Last Check */
  last_check?: string | null;
  /** Total Processed */
  total_processed: number;
  /** Enabled */
  enabled: boolean;
  /** Email Address */
  email_address?: string | null;
}

/** PDFExtractionResponse */
export interface PDFExtractionResponse {
  /** Extracted Data */
  extracted_data: Record<string, any>;
  /** Template Id */
  template_id?: string;
  /**
   * Template Name
   * @default "Ukjent mal"
   */
  template_name?: string;
  /** Success */
  success: boolean;
  /** Message */
  message: string;
}

/**
 * PdfTemplate
 * Represents an extraction template for a specific PDF structure/type.
 */
export interface PdfTemplate {
  /** Id */
  id?: string;
  /**
   * Name
   * A user-friendly name for this template, e.g., 'Statsbygg Standard Order'.
   */
  name: string;
  /**
   * Description
   * A more detailed description of the template or the PDF type it targets.
   */
  description?: string | null;
  /**
   * Target Fields
   * A list of fields to be extracted using this template.
   */
  target_fields?: TargetField[];
}

/**
 * PdfTemplateCreate
 * Schema for creating a new template. ID is generated automatically.
 */
export interface PdfTemplateCreate {
  /**
   * Name
   * A user-friendly name for this template.
   */
  name: string;
  /**
   * Description
   * A more detailed description of the template.
   */
  description?: string | null;
  /**
   * Target Fields
   * Initial list of fields for this template.
   */
  target_fields?: TargetField[];
}

/**
 * PdfTemplateUpdate
 * Schema for updating an existing template. Fields are optional.
 */
export interface PdfTemplateUpdate {
  /** Name */
  name?: string | null;
  /** Description */
  description?: string | null;
  /** Target Fields */
  target_fields?: TargetField[] | null;
}

/** ProcessImapDocumentRequest */
export interface ProcessImapDocumentRequest {
  /** Template Id */
  template_id?: string | null;
  /** Email Template Id */
  email_template_id?: string | null;
}

/** ProcessedDocument */
export interface ProcessedDocument {
  /** Id */
  id: string;
  /** Source */
  source: string;
  /** Original Filename */
  original_filename: string;
  /** Template Id */
  template_id?: string | null;
  /** Template Name */
  template_name?: string | null;
  /** Extracted Data */
  extracted_data: Record<string, any>;
  /** Raw Text */
  raw_text?: string | null;
  /** Processed Date */
  processed_date: string;
  /** Status */
  status: string;
  /** User Id */
  user_id: string;
  /** User Email */
  user_email: string;
  /** Email Sender */
  email_sender?: string | null;
  /** Email Subject */
  email_subject?: string | null;
  /** Email Received Date */
  email_received_date?: string | null;
  /** Email Address */
  email_address?: string | null;
  /** Pdf Storage Key */
  pdf_storage_key?: string | null;
  /** Corrections */
  corrections?: Record<string, any> | null;
  /**
   * Export Count
   * @default 0
   */
  export_count?: number;
  /** Last Exported Date */
  last_exported_date?: string | null;
}

/**
 * TargetField
 * A specific field to be extracted as part of a template.
 */
export interface TargetField {
  /** Id */
  id?: string;
  /**
   * Field Name
   * The name of the field to extract, e.g., 'Order Number', 'Customer Name'.
   */
  field_name: string;
  /**
   * Ai Hint
   * A hint or description for the AI on how to find this field or what it represents.
   */
  ai_hint?: string | null;
}

/**
 * TestConnectionRequest
 * Model for testing email connection
 */
export interface TestConnectionRequest {
  /** Imap Server */
  imap_server: string;
  /** Username */
  username: string;
  /** Password */
  password: string;
  /**
   * Port
   * @default 993
   */
  port?: number | null;
  /**
   * Use Ssl
   * @default true
   */
  use_ssl?: boolean;
}

/**
 * TestConnectionResponse
 * Model for test connection response
 */
export interface TestConnectionResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Details */
  details?: string | null;
}

/** UpdateDocumentRequest */
export interface UpdateDocumentRequest {
  /** Extracted Data */
  extracted_data: Record<string, any>;
  /** Corrections */
  corrections?: Record<string, any> | null;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

/** WebhookEmailConfigResponse */
export interface WebhookEmailConfigResponse {
  /** Imap Server */
  imap_server?: string | null;
  /** Username */
  username?: string | null;
  /** Port */
  port?: number | null;
  /** Use Ssl */
  use_ssl?: boolean | null;
  /** Enabled */
  enabled?: boolean | null;
  /** Is Configured */
  is_configured: boolean;
  /** Last Test */
  last_test?: string | null;
  /** Test Status */
  test_status?: string | null;
}

/** WebhookEmailConfigUpdate */
export interface WebhookEmailConfigUpdate {
  /** Imap Server */
  imap_server?: string | null;
  /** Username */
  username?: string | null;
  /** Password */
  password?: string | null;
  /** Port */
  port?: number | null;
  /** Use Ssl */
  use_ssl?: boolean | null;
  /** Enabled */
  enabled?: boolean | null;
}

/** WebhookTestResult */
export interface WebhookTestResult {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Details */
  details?: string | null;
}

/**
 * EmailConfigResponse
 * Model for email configuration response (without password)
 */
export interface AppApisConfigEmailConfigResponse {
  /** Imap Server */
  imap_server?: string | null;
  /** Username */
  username?: string | null;
  /**
   * Port
   * @default 993
   */
  port?: number;
  /**
   * Use Ssl
   * @default true
   */
  use_ssl?: boolean;
  /**
   * Enabled
   * @default true
   */
  enabled?: boolean;
  /**
   * Is Configured
   * @default false
   */
  is_configured?: boolean;
  /** Last Test */
  last_test?: string | null;
  /** Test Status */
  test_status?: string | null;
}

/** EmailConfigResponse */
export interface AppApisEmailConfigEmailConfigResponse {
  /** Is Configured */
  is_configured: boolean;
  /** Username */
  username?: string | null;
  /** Imap Server */
  imap_server?: string | null;
  /** Port */
  port?: number | null;
  /** Last Updated */
  last_updated?: string | null;
}

/** Body_extract_data_from_pdf */
export interface FastapiCompatBodyExtractDataFromPdf1 {
  /**
   * File
   * @format binary
   */
  file: File;
  /** Template Id */
  template_id?: string | null;
}

/** Body_extract_data_from_pdf */
export interface FastapiCompatBodyExtractDataFromPdf2 {
  /**
   * File
   * @format binary
   */
  file: File;
}

export type CheckHealthData = HealthResponse;

/** Response List Templates */
export type ListTemplatesData = PdfTemplate[];

export type CreateTemplateData = PdfTemplate;

export type CreateTemplateError = HTTPValidationError;

export interface GetTemplateParams {
  /** Template Id */
  templateId: string;
}

export type GetTemplateData = PdfTemplate;

export type GetTemplateError = HTTPValidationError;

export interface UpdateTemplateParams {
  /** Template Id */
  templateId: string;
}

export type UpdateTemplateData = PdfTemplate;

export type UpdateTemplateError = HTTPValidationError;

export interface DeleteTemplateParams {
  /** Template Id */
  templateId: string;
}

export type DeleteTemplateData = any;

export type DeleteTemplateError = HTTPValidationError;

export type TestAuthEndpointData = any;

export type ExtractDataFromPdfData = ExtractionResponse;

export type ExtractDataFromPdfError = HTTPValidationError;

export type ExtractDataFromPdf2Data = PDFExtractionResponse;

export type ExtractDataFromPdf2Error = HTTPValidationError;

/** Response List Email Templates */
export type ListEmailTemplatesData = EmailTemplate[];

export type CreateEmailTemplateData = EmailTemplate;

export type CreateEmailTemplateError = HTTPValidationError;

export interface GetEmailTemplateParams {
  /** Template Id */
  templateId: string;
}

export type GetEmailTemplateData = EmailTemplate;

export type GetEmailTemplateError = HTTPValidationError;

export interface UpdateEmailTemplateParams {
  /** Template Id */
  templateId: string;
}

export type UpdateEmailTemplateData = EmailTemplate;

export type UpdateEmailTemplateError = HTTPValidationError;

export interface DeleteEmailTemplateParams {
  /** Template Id */
  templateId: string;
}

export type DeleteEmailTemplateData = any;

export type DeleteEmailTemplateError = HTTPValidationError;

export interface TestEmailTemplateMatchParams {
  /** Template Id */
  template_id: string;
  /** Email Content */
  email_content: string;
  /** Email Subject */
  email_subject: string;
  /** Email Sender */
  email_sender: string;
}

export type TestEmailTemplateMatchData = any;

export type TestEmailTemplateMatchError = HTTPValidationError;

export type GetEmailConfigData = AppApisConfigEmailConfigResponse;

export type UpdateEmailConfigData = AppApisConfigEmailConfigResponse;

export type UpdateEmailConfigError = HTTPValidationError;

export type ClearEmailConfigData = any;

export type TestEmailConnectionData = TestConnectionResponse;

export type TestEmailConnectionError = HTTPValidationError;

export type GetEmailConfig2Data = AppApisEmailConfigEmailConfigResponse;

export type UpdateEmailConfig2Data = AppApisEmailConfigEmailConfigResponse;

export type UpdateEmailConfig2Error = HTTPValidationError;

export type ClearEmailConfig2Data = any;

export type TestEmailConnection2Data = EmailConfigTestResponse;

export type TestEmailConnection2Error = HTTPValidationError;

/** Filters */
export type ListProcessedDocumentsPayload = DocumentFilter | null;

/** Response List Processed Documents */
export type ListProcessedDocumentsData = ProcessedDocument[];

export type ListProcessedDocumentsError = HTTPValidationError;

export interface GetProcessedDocumentParams {
  /** Document Id */
  documentId: string;
}

export type GetProcessedDocumentData = ProcessedDocument;

export type GetProcessedDocumentError = HTTPValidationError;

export interface UpdateProcessedDocumentParams {
  /** Document Id */
  documentId: string;
}

export type UpdateProcessedDocumentData = ProcessedDocument;

export type UpdateProcessedDocumentError = HTTPValidationError;

export type ExportBatchDocumentsData = any;

export type ExportBatchDocumentsError = HTTPValidationError;

export interface DownloadDocumentPdfParams {
  /** Document Id */
  documentId: string;
}

export type DownloadDocumentPdfData = any;

export type DownloadDocumentPdfError = HTTPValidationError;

export interface DownloadExportFileParams {
  /** Filename */
  filename: string;
}

export type DownloadExportFileData = any;

export type DownloadExportFileError = HTTPValidationError;

export interface DeleteProcessedDocumentParams {
  /** Document Id */
  documentId: string;
}

export type DeleteProcessedDocumentData = any;

export type DeleteProcessedDocumentError = HTTPValidationError;

export type DeleteBatchDocumentsData = any;

export type DeleteBatchDocumentsError = HTTPValidationError;

export type GetWebhookEmailConfigData = WebhookEmailConfigResponse;

export type UpdateWebhookEmailConfigData = any;

export type UpdateWebhookEmailConfigError = HTTPValidationError;

export type ClearWebhookEmailConfigData = any;

export type TestWebhookConnectionData = WebhookTestResult;

export type GetEmailStatusData = EmailStatus;

export type CheckEmailsData = EmailCheckResponse;

/** Response List Email Documents */
export type ListEmailDocumentsData = EmailDocument[];

export interface ListDocumentPdfsParams {
  /** Document Id */
  documentId: string;
}

export type ListDocumentPdfsData = any;

export type ListDocumentPdfsError = HTTPValidationError;

export interface ProcessEmailDocumentParams {
  /** Template Id */
  template_id: string;
  /** Document Id */
  documentId: string;
}

export type ProcessEmailDocumentData = any;

export type ProcessEmailDocumentError = HTTPValidationError;

export type GetImapEmailStatusData = ImapEmailStatus;

/** Response List Imap Email Documents */
export type ListImapEmailDocumentsData = ImapEmailDocument[];

export interface ListImapDocumentPdfsParams {
  /** Document Id */
  documentId: string;
}

export type ListImapDocumentPdfsData = any;

export type ListImapDocumentPdfsError = HTTPValidationError;

export interface ProcessImapEmailDocumentParams {
  /** Document Id */
  documentId: string;
}

export type ProcessImapEmailDocumentData = any;

export type ProcessImapEmailDocumentError = HTTPValidationError;

export type CheckImapEmailsData = ImapEmailCheckResponse;
