import {
  BatchExportRequest,
  CheckEmailsData,
  CheckHealthData,
  CheckImapEmailsData,
  ClearEmailConfig2Data,
  ClearEmailConfigData,
  ClearWebhookEmailConfigData,
  CreateEmailTemplateData,
  CreateEmailTemplateError,
  CreateTemplateData,
  CreateTemplateError,
  DeleteBatchDocumentsData,
  DeleteBatchDocumentsError,
  DeleteEmailTemplateData,
  DeleteEmailTemplateError,
  DeleteEmailTemplateParams,
  DeleteProcessedDocumentData,
  DeleteProcessedDocumentError,
  DeleteProcessedDocumentParams,
  DeleteTemplateData,
  DeleteTemplateError,
  DeleteTemplateParams,
  DownloadDocumentPdfData,
  DownloadDocumentPdfError,
  DownloadDocumentPdfParams,
  DownloadExportFileData,
  DownloadExportFileError,
  DownloadExportFileParams,
  EmailConfigRequest,
  EmailConfigUpdate,
  EmailTemplateCreate,
  EmailTemplateUpdate,
  ExportBatchDocumentsData,
  ExportBatchDocumentsError,
  ExtractDataFromPdf2Data,
  ExtractDataFromPdf2Error,
  ExtractDataFromPdfData,
  ExtractDataFromPdfError,
  FastapiCompatBodyExtractDataFromPdf1,
  FastapiCompatBodyExtractDataFromPdf2,
  GetEmailConfig2Data,
  GetEmailConfigData,
  GetEmailStatusData,
  GetEmailTemplateData,
  GetEmailTemplateError,
  GetEmailTemplateParams,
  GetImapEmailStatusData,
  GetProcessedDocumentData,
  GetProcessedDocumentError,
  GetProcessedDocumentParams,
  GetTemplateData,
  GetTemplateError,
  GetTemplateParams,
  GetWebhookEmailConfigData,
  ListDocumentPdfsData,
  ListDocumentPdfsError,
  ListDocumentPdfsParams,
  ListEmailDocumentsData,
  ListEmailTemplatesData,
  ListImapDocumentPdfsData,
  ListImapDocumentPdfsError,
  ListImapDocumentPdfsParams,
  ListImapEmailDocumentsData,
  ListProcessedDocumentsData,
  ListProcessedDocumentsError,
  ListProcessedDocumentsPayload,
  ListTemplatesData,
  PdfTemplateCreate,
  PdfTemplateUpdate,
  ProcessEmailDocumentData,
  ProcessEmailDocumentError,
  ProcessEmailDocumentParams,
  ProcessImapDocumentRequest,
  ProcessImapEmailDocumentData,
  ProcessImapEmailDocumentError,
  ProcessImapEmailDocumentParams,
  TestAuthEndpointData,
  TestConnectionRequest,
  TestEmailConnection2Data,
  TestEmailConnection2Error,
  TestEmailConnectionData,
  TestEmailConnectionError,
  TestEmailTemplateMatchData,
  TestEmailTemplateMatchError,
  TestEmailTemplateMatchParams,
  TestWebhookConnectionData,
  UpdateDocumentRequest,
  UpdateEmailConfig2Data,
  UpdateEmailConfig2Error,
  UpdateEmailConfigData,
  UpdateEmailConfigError,
  UpdateEmailTemplateData,
  UpdateEmailTemplateError,
  UpdateEmailTemplateParams,
  UpdateProcessedDocumentData,
  UpdateProcessedDocumentError,
  UpdateProcessedDocumentParams,
  UpdateTemplateData,
  UpdateTemplateError,
  UpdateTemplateParams,
  UpdateWebhookEmailConfigData,
  UpdateWebhookEmailConfigError,
  WebhookEmailConfigUpdate,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Lists all available PDF extraction templates.
   *
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name list_templates
   * @summary List Templates
   * @request GET:/routes/templates/
   */
  list_templates = (params: RequestParams = {}) =>
    this.request<ListTemplatesData, any>({
      path: `/routes/templates/`,
      method: "GET",
      ...params,
    });

  /**
   * @description Creates a new PDF extraction template.
   *
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name create_template
   * @summary Create Template
   * @request POST:/routes/templates/
   */
  create_template = (data: PdfTemplateCreate, params: RequestParams = {}) =>
    this.request<CreateTemplateData, CreateTemplateError>({
      path: `/routes/templates/`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Retrieves a specific template by its ID.
   *
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name get_template
   * @summary Get Template
   * @request GET:/routes/templates/{template_id}
   */
  get_template = ({ templateId, ...query }: GetTemplateParams, params: RequestParams = {}) =>
    this.request<GetTemplateData, GetTemplateError>({
      path: `/routes/templates/${templateId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Updates an existing template. Allows partial updates: only provided fields will be changed.
   *
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name update_template
   * @summary Update Template
   * @request PUT:/routes/templates/{template_id}
   */
  update_template = (
    { templateId, ...query }: UpdateTemplateParams,
    data: PdfTemplateUpdate,
    params: RequestParams = {},
  ) =>
    this.request<UpdateTemplateData, UpdateTemplateError>({
      path: `/routes/templates/${templateId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Deletes a template by its ID.
   *
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name delete_template
   * @summary Delete Template
   * @request DELETE:/routes/templates/{template_id}
   */
  delete_template = ({ templateId, ...query }: DeleteTemplateParams, params: RequestParams = {}) =>
    this.request<DeleteTemplateData, DeleteTemplateError>({
      path: `/routes/templates/${templateId}`,
      method: "DELETE",
      ...params,
    });

  /**
   * No description
   *
   * @tags PDF Parser, dbtn/module:pdf_parser, dbtn/hasAuth
   * @name test_auth_endpoint
   * @summary Test Auth Endpoint
   * @request GET:/routes/pdf-parser/test-auth
   */
  test_auth_endpoint = (params: RequestParams = {}) =>
    this.request<TestAuthEndpointData, any>({
      path: `/routes/pdf-parser/test-auth`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags PDF Parser, dbtn/module:pdf_parser, dbtn/hasAuth
   * @name extract_data_from_pdf
   * @summary Extract Data From Pdf
   * @request POST:/routes/pdf-parser/extract-data
   */
  extract_data_from_pdf = (data: FastapiCompatBodyExtractDataFromPdf1, params: RequestParams = {}) =>
    this.request<ExtractDataFromPdfData, ExtractDataFromPdfError>({
      path: `/routes/pdf-parser/extract-data`,
      method: "POST",
      body: data,
      type: ContentType.FormData,
      ...params,
    });

  /**
   * @description Extract data from uploaded PDF using AI
   *
   * @tags dbtn/module:pdf_processor, dbtn/hasAuth
   * @name extract_data_from_pdf2
   * @summary Extract Data From Pdf
   * @request POST:/routes/pdf/extract
   * @originalName extract_data_from_pdf
   * @duplicate
   */
  extract_data_from_pdf2 = (data: FastapiCompatBodyExtractDataFromPdf2, params: RequestParams = {}) =>
    this.request<ExtractDataFromPdf2Data, ExtractDataFromPdf2Error>({
      path: `/routes/pdf/extract`,
      method: "POST",
      body: data,
      type: ContentType.FormData,
      ...params,
    });

  /**
   * @description List all email templates
   *
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name list_email_templates
   * @summary List Email Templates
   * @request GET:/routes/email-templates/
   */
  list_email_templates = (params: RequestParams = {}) =>
    this.request<ListEmailTemplatesData, any>({
      path: `/routes/email-templates/`,
      method: "GET",
      ...params,
    });

  /**
   * @description Create a new email template
   *
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name create_email_template
   * @summary Create Email Template
   * @request POST:/routes/email-templates/
   */
  create_email_template = (data: EmailTemplateCreate, params: RequestParams = {}) =>
    this.request<CreateEmailTemplateData, CreateEmailTemplateError>({
      path: `/routes/email-templates/`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get specific email template by ID
   *
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name get_email_template
   * @summary Get Email Template
   * @request GET:/routes/email-templates/_{template_id}
   */
  get_email_template = ({ templateId, ...query }: GetEmailTemplateParams, params: RequestParams = {}) =>
    this.request<GetEmailTemplateData, GetEmailTemplateError>({
      path: `/routes/email-templates/_${templateId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Update existing email template
   *
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name update_email_template
   * @summary Update Email Template
   * @request PUT:/routes/email-templates/_{template_id}
   */
  update_email_template = (
    { templateId, ...query }: UpdateEmailTemplateParams,
    data: EmailTemplateUpdate,
    params: RequestParams = {},
  ) =>
    this.request<UpdateEmailTemplateData, UpdateEmailTemplateError>({
      path: `/routes/email-templates/_${templateId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Delete email template
   *
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name delete_email_template
   * @summary Delete Email Template
   * @request DELETE:/routes/email-templates/_{template_id}
   */
  delete_email_template = ({ templateId, ...query }: DeleteEmailTemplateParams, params: RequestParams = {}) =>
    this.request<DeleteEmailTemplateData, DeleteEmailTemplateError>({
      path: `/routes/email-templates/_${templateId}`,
      method: "DELETE",
      ...params,
    });

  /**
   * @description Test how well an email matches against a specific template
   *
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name test_email_template_match
   * @summary Test Email Template Match
   * @request POST:/routes/email-templates/test-match
   */
  test_email_template_match = (query: TestEmailTemplateMatchParams, params: RequestParams = {}) =>
    this.request<TestEmailTemplateMatchData, TestEmailTemplateMatchError>({
      path: `/routes/email-templates/test-match`,
      method: "POST",
      query: query,
      ...params,
    });

  /**
   * @description Get current email configuration (without sensitive data)
   *
   * @tags Configuration, dbtn/module:config, dbtn/hasAuth
   * @name get_email_config
   * @summary Get Email Config
   * @request GET:/routes/config/email
   */
  get_email_config = (params: RequestParams = {}) =>
    this.request<GetEmailConfigData, any>({
      path: `/routes/config/email`,
      method: "GET",
      ...params,
    });

  /**
   * @description Update email configuration
   *
   * @tags Configuration, dbtn/module:config, dbtn/hasAuth
   * @name update_email_config
   * @summary Update Email Config
   * @request PUT:/routes/config/email
   */
  update_email_config = (data: EmailConfigUpdate, params: RequestParams = {}) =>
    this.request<UpdateEmailConfigData, UpdateEmailConfigError>({
      path: `/routes/config/email`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Clear email configuration
   *
   * @tags Configuration, dbtn/module:config, dbtn/hasAuth
   * @name clear_email_config
   * @summary Clear Email Config
   * @request DELETE:/routes/config/email
   */
  clear_email_config = (params: RequestParams = {}) =>
    this.request<ClearEmailConfigData, any>({
      path: `/routes/config/email`,
      method: "DELETE",
      ...params,
    });

  /**
   * @description Test email connection with provided settings
   *
   * @tags Configuration, dbtn/module:config, dbtn/hasAuth
   * @name test_email_connection
   * @summary Test Email Connection
   * @request POST:/routes/config/email/test
   */
  test_email_connection = (data: TestConnectionRequest, params: RequestParams = {}) =>
    this.request<TestEmailConnectionData, TestEmailConnectionError>({
      path: `/routes/config/email/test`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get current email configuration for the user
   *
   * @tags Email Configuration, dbtn/module:email_config, dbtn/hasAuth
   * @name get_email_config2
   * @summary Get Email Config
   * @request GET:/routes/email-config/
   * @originalName get_email_config
   * @duplicate
   */
  get_email_config2 = (params: RequestParams = {}) =>
    this.request<GetEmailConfig2Data, any>({
      path: `/routes/email-config/`,
      method: "GET",
      ...params,
    });

  /**
   * @description Update email configuration for the user
   *
   * @tags Email Configuration, dbtn/module:email_config, dbtn/hasAuth
   * @name update_email_config2
   * @summary Update Email Config
   * @request POST:/routes/email-config/
   * @originalName update_email_config
   * @duplicate
   */
  update_email_config2 = (data: EmailConfigRequest, params: RequestParams = {}) =>
    this.request<UpdateEmailConfig2Data, UpdateEmailConfig2Error>({
      path: `/routes/email-config/`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Clear email configuration for the user
   *
   * @tags Email Configuration, dbtn/module:email_config, dbtn/hasAuth
   * @name clear_email_config2
   * @summary Clear Email Config
   * @request DELETE:/routes/email-config/
   * @originalName clear_email_config
   * @duplicate
   */
  clear_email_config2 = (params: RequestParams = {}) =>
    this.request<ClearEmailConfig2Data, any>({
      path: `/routes/email-config/`,
      method: "DELETE",
      ...params,
    });

  /**
   * @description Test email connection with provided credentials
   *
   * @tags Email Configuration, dbtn/module:email_config, dbtn/hasAuth
   * @name test_email_connection2
   * @summary Test Email Connection
   * @request POST:/routes/email-config/test
   * @originalName test_email_connection
   * @duplicate
   */
  test_email_connection2 = (data: EmailConfigRequest, params: RequestParams = {}) =>
    this.request<TestEmailConnection2Data, TestEmailConnection2Error>({
      path: `/routes/email-config/test`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get all processed documents with optional filtering
   *
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name list_processed_documents
   * @summary List Processed Documents
   * @request GET:/routes/list
   */
  list_processed_documents = (data: ListProcessedDocumentsPayload, params: RequestParams = {}) =>
    this.request<ListProcessedDocumentsData, ListProcessedDocumentsError>({
      path: `/routes/list`,
      method: "GET",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get a specific processed document by ID
   *
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name get_processed_document
   * @summary Get Processed Document
   * @request GET:/routes/get/{document_id}
   */
  get_processed_document = ({ documentId, ...query }: GetProcessedDocumentParams, params: RequestParams = {}) =>
    this.request<GetProcessedDocumentData, GetProcessedDocumentError>({
      path: `/routes/get/${documentId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Update extracted data for a processed document
   *
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name update_processed_document
   * @summary Update Processed Document
   * @request PUT:/routes/update/{document_id}
   */
  update_processed_document = (
    { documentId, ...query }: UpdateProcessedDocumentParams,
    data: UpdateDocumentRequest,
    params: RequestParams = {},
  ) =>
    this.request<UpdateProcessedDocumentData, UpdateProcessedDocumentError>({
      path: `/routes/update/${documentId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Export multiple documents to Excel with template-based structure
   *
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name export_batch_documents
   * @summary Export Batch Documents
   * @request POST:/routes/export-batch
   */
  export_batch_documents = (data: BatchExportRequest, params: RequestParams = {}) =>
    this.request<ExportBatchDocumentsData, ExportBatchDocumentsError>({
      path: `/routes/export-batch`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Download the original PDF for a processed document
   *
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name download_document_pdf
   * @summary Download Document Pdf
   * @request GET:/routes/download-pdf/{document_id}
   */
  download_document_pdf = ({ documentId, ...query }: DownloadDocumentPdfParams, params: RequestParams = {}) =>
    this.request<DownloadDocumentPdfData, DownloadDocumentPdfError>({
      path: `/routes/download-pdf/${documentId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Download an exported Excel file
   *
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name download_export_file
   * @summary Download Export File
   * @request GET:/routes/download-export/{filename}
   */
  download_export_file = ({ filename, ...query }: DownloadExportFileParams, params: RequestParams = {}) =>
    this.request<DownloadExportFileData, DownloadExportFileError>({
      path: `/routes/download-export/${filename}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Delete a processed document and its associated PDF file
   *
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name delete_processed_document
   * @summary Delete Processed Document
   * @request DELETE:/routes/delete/{document_id}
   */
  delete_processed_document = ({ documentId, ...query }: DeleteProcessedDocumentParams, params: RequestParams = {}) =>
    this.request<DeleteProcessedDocumentData, DeleteProcessedDocumentError>({
      path: `/routes/delete/${documentId}`,
      method: "DELETE",
      ...params,
    });

  /**
   * @description Delete multiple documents at once
   *
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name delete_batch_documents
   * @summary Delete Batch Documents
   * @request POST:/routes/delete-batch
   */
  delete_batch_documents = (data: BatchExportRequest, params: RequestParams = {}) =>
    this.request<DeleteBatchDocumentsData, DeleteBatchDocumentsError>({
      path: `/routes/delete-batch`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get current webhook email configuration
   *
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name get_webhook_email_config
   * @summary Get Webhook Email Config
   * @request GET:/routes/email/config
   */
  get_webhook_email_config = (params: RequestParams = {}) =>
    this.request<GetWebhookEmailConfigData, any>({
      path: `/routes/email/config`,
      method: "GET",
      ...params,
    });

  /**
   * @description Update webhook email configuration
   *
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name update_webhook_email_config
   * @summary Update Webhook Email Config
   * @request PUT:/routes/email/config
   */
  update_webhook_email_config = (data: WebhookEmailConfigUpdate, params: RequestParams = {}) =>
    this.request<UpdateWebhookEmailConfigData, UpdateWebhookEmailConfigError>({
      path: `/routes/email/config`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Clear webhook email configuration
   *
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name clear_webhook_email_config
   * @summary Clear Webhook Email Config
   * @request DELETE:/routes/email/config
   */
  clear_webhook_email_config = (params: RequestParams = {}) =>
    this.request<ClearWebhookEmailConfigData, any>({
      path: `/routes/email/config`,
      method: "DELETE",
      ...params,
    });

  /**
   * @description Test webhook email connection
   *
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name test_webhook_connection
   * @summary Test Webhook Connection
   * @request POST:/routes/email/test-connection
   */
  test_webhook_connection = (params: RequestParams = {}) =>
    this.request<TestWebhookConnectionData, any>({
      path: `/routes/email/test-connection`,
      method: "POST",
      ...params,
    });

  /**
   * @description Get current email processing status (legacy endpoint for backward compatibility)
   *
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name get_email_status
   * @summary Get Email Status
   * @request GET:/routes/email/status
   */
  get_email_status = (params: RequestParams = {}) =>
    this.request<GetEmailStatusData, any>({
      path: `/routes/email/status`,
      method: "GET",
      ...params,
    });

  /**
   * @description Check for new emails and process PDF attachments with automatic template matching
   *
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name check_emails
   * @summary Check Emails
   * @request POST:/routes/email/check
   */
  check_emails = (params: RequestParams = {}) =>
    this.request<CheckEmailsData, any>({
      path: `/routes/email/check`,
      method: "POST",
      ...params,
    });

  /**
   * @description List all email documents for the current user
   *
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name list_email_documents
   * @summary List Email Documents
   * @request GET:/routes/email/documents
   */
  list_email_documents = (params: RequestParams = {}) =>
    this.request<ListEmailDocumentsData, any>({
      path: `/routes/email/documents`,
      method: "GET",
      ...params,
    });

  /**
   * @description List PDF attachments for a specific document
   *
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name list_document_pdfs
   * @summary List Document Pdfs
   * @request GET:/routes/email/documents/{document_id}/pdfs
   */
  list_document_pdfs = ({ documentId, ...query }: ListDocumentPdfsParams, params: RequestParams = {}) =>
    this.request<ListDocumentPdfsData, ListDocumentPdfsError>({
      path: `/routes/email/documents/${documentId}/pdfs`,
      method: "GET",
      ...params,
    });

  /**
   * @description Process an email document with AI extraction and store in unified system
   *
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name process_email_document
   * @summary Process Email Document
   * @request POST:/routes/email/documents/{document_id}/process
   */
  process_email_document = ({ documentId, ...query }: ProcessEmailDocumentParams, params: RequestParams = {}) =>
    this.request<ProcessEmailDocumentData, ProcessEmailDocumentError>({
      path: `/routes/email/documents/${documentId}/process`,
      method: "POST",
      query: query,
      ...params,
    });

  /**
   * @description Get current IMAP email configuration status
   *
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name get_imap_email_status
   * @summary Get Imap Email Status
   * @request GET:/routes/imap-email/status
   */
  get_imap_email_status = (params: RequestParams = {}) =>
    this.request<GetImapEmailStatusData, any>({
      path: `/routes/imap-email/status`,
      method: "GET",
      ...params,
    });

  /**
   * @description List all IMAP email documents for the current user
   *
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name list_imap_email_documents
   * @summary List Imap Email Documents
   * @request GET:/routes/imap-email/documents
   */
  list_imap_email_documents = (params: RequestParams = {}) =>
    this.request<ListImapEmailDocumentsData, any>({
      path: `/routes/imap-email/documents`,
      method: "GET",
      ...params,
    });

  /**
   * @description List PDF attachments for a specific IMAP document
   *
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name list_imap_document_pdfs
   * @summary List Imap Document Pdfs
   * @request GET:/routes/imap-email/documents/{document_id}/pdfs
   */
  list_imap_document_pdfs = ({ documentId, ...query }: ListImapDocumentPdfsParams, params: RequestParams = {}) =>
    this.request<ListImapDocumentPdfsData, ListImapDocumentPdfsError>({
      path: `/routes/imap-email/documents/${documentId}/pdfs`,
      method: "GET",
      ...params,
    });

  /**
   * @description Process an IMAP email document with AI extraction and store in unified system
   *
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name process_imap_email_document
   * @summary Process Imap Email Document
   * @request POST:/routes/imap-email/documents/{document_id}/process
   */
  process_imap_email_document = (
    { documentId, ...query }: ProcessImapEmailDocumentParams,
    data: ProcessImapDocumentRequest,
    params: RequestParams = {},
  ) =>
    this.request<ProcessImapEmailDocumentData, ProcessImapEmailDocumentError>({
      path: `/routes/imap-email/documents/${documentId}/process`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Check for new emails using IMAP configuration and process PDF attachments
   *
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name check_imap_emails
   * @summary Check Imap Emails
   * @request POST:/routes/imap-email/check
   */
  check_imap_emails = (params: RequestParams = {}) =>
    this.request<CheckImapEmailsData, any>({
      path: `/routes/imap-email/check`,
      method: "POST",
      ...params,
    });
}
