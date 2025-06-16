import {
  BatchExportRequest,
  CheckEmailsData,
  CheckHealthData,
  CheckImapEmailsData,
  ClearEmailConfig2Data,
  ClearEmailConfigData,
  ClearWebhookEmailConfigData,
  CreateEmailTemplateData,
  CreateTemplateData,
  DeleteBatchDocumentsData,
  DeleteEmailTemplateData,
  DeleteProcessedDocumentData,
  DeleteTemplateData,
  DownloadDocumentPdfData,
  DownloadExportFileData,
  EmailConfigRequest,
  EmailConfigUpdate,
  EmailTemplateCreate,
  EmailTemplateUpdate,
  ExportBatchDocumentsData,
  ExtractDataFromPdf2Data,
  ExtractDataFromPdfData,
  FastapiCompatBodyExtractDataFromPdf1,
  FastapiCompatBodyExtractDataFromPdf2,
  GetEmailConfig2Data,
  GetEmailConfigData,
  GetEmailStatusData,
  GetEmailTemplateData,
  GetImapEmailStatusData,
  GetProcessedDocumentData,
  GetTemplateData,
  GetWebhookEmailConfigData,
  ListDocumentPdfsData,
  ListEmailDocumentsData,
  ListEmailTemplatesData,
  ListImapDocumentPdfsData,
  ListImapEmailDocumentsData,
  ListProcessedDocumentsData,
  ListProcessedDocumentsPayload,
  ListTemplatesData,
  PdfTemplateCreate,
  PdfTemplateUpdate,
  ProcessEmailDocumentData,
  ProcessImapDocumentRequest,
  ProcessImapEmailDocumentData,
  TestAuthEndpointData,
  TestConnectionRequest,
  TestEmailConnection2Data,
  TestEmailConnectionData,
  TestEmailTemplateMatchData,
  TestWebhookConnectionData,
  UpdateDocumentRequest,
  UpdateEmailConfig2Data,
  UpdateEmailConfigData,
  UpdateEmailTemplateData,
  UpdateProcessedDocumentData,
  UpdateTemplateData,
  UpdateWebhookEmailConfigData,
  WebhookEmailConfigUpdate,
} from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Lists all available PDF extraction templates.
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name list_templates
   * @summary List Templates
   * @request GET:/routes/templates/
   */
  export namespace list_templates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListTemplatesData;
  }

  /**
   * @description Creates a new PDF extraction template.
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name create_template
   * @summary Create Template
   * @request POST:/routes/templates/
   */
  export namespace create_template {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PdfTemplateCreate;
    export type RequestHeaders = {};
    export type ResponseBody = CreateTemplateData;
  }

  /**
   * @description Retrieves a specific template by its ID.
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name get_template
   * @summary Get Template
   * @request GET:/routes/templates/{template_id}
   */
  export namespace get_template {
    export type RequestParams = {
      /** Template Id */
      templateId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTemplateData;
  }

  /**
   * @description Updates an existing template. Allows partial updates: only provided fields will be changed.
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name update_template
   * @summary Update Template
   * @request PUT:/routes/templates/{template_id}
   */
  export namespace update_template {
    export type RequestParams = {
      /** Template Id */
      templateId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PdfTemplateUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateTemplateData;
  }

  /**
   * @description Deletes a template by its ID.
   * @tags Template Management, dbtn/module:template_manager, dbtn/hasAuth
   * @name delete_template
   * @summary Delete Template
   * @request DELETE:/routes/templates/{template_id}
   */
  export namespace delete_template {
    export type RequestParams = {
      /** Template Id */
      templateId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteTemplateData;
  }

  /**
   * No description
   * @tags PDF Parser, dbtn/module:pdf_parser, dbtn/hasAuth
   * @name test_auth_endpoint
   * @summary Test Auth Endpoint
   * @request GET:/routes/pdf-parser/test-auth
   */
  export namespace test_auth_endpoint {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TestAuthEndpointData;
  }

  /**
   * No description
   * @tags PDF Parser, dbtn/module:pdf_parser, dbtn/hasAuth
   * @name extract_data_from_pdf
   * @summary Extract Data From Pdf
   * @request POST:/routes/pdf-parser/extract-data
   */
  export namespace extract_data_from_pdf {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = FastapiCompatBodyExtractDataFromPdf1;
    export type RequestHeaders = {};
    export type ResponseBody = ExtractDataFromPdfData;
  }

  /**
   * @description Extract data from uploaded PDF using AI
   * @tags dbtn/module:pdf_processor, dbtn/hasAuth
   * @name extract_data_from_pdf2
   * @summary Extract Data From Pdf
   * @request POST:/routes/pdf/extract
   * @originalName extract_data_from_pdf
   * @duplicate
   */
  export namespace extract_data_from_pdf2 {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = FastapiCompatBodyExtractDataFromPdf2;
    export type RequestHeaders = {};
    export type ResponseBody = ExtractDataFromPdf2Data;
  }

  /**
   * @description List all email templates
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name list_email_templates
   * @summary List Email Templates
   * @request GET:/routes/email-templates/
   */
  export namespace list_email_templates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListEmailTemplatesData;
  }

  /**
   * @description Create a new email template
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name create_email_template
   * @summary Create Email Template
   * @request POST:/routes/email-templates/
   */
  export namespace create_email_template {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = EmailTemplateCreate;
    export type RequestHeaders = {};
    export type ResponseBody = CreateEmailTemplateData;
  }

  /**
   * @description Get specific email template by ID
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name get_email_template
   * @summary Get Email Template
   * @request GET:/routes/email-templates/_{template_id}
   */
  export namespace get_email_template {
    export type RequestParams = {
      /** Template Id */
      templateId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetEmailTemplateData;
  }

  /**
   * @description Update existing email template
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name update_email_template
   * @summary Update Email Template
   * @request PUT:/routes/email-templates/_{template_id}
   */
  export namespace update_email_template {
    export type RequestParams = {
      /** Template Id */
      templateId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = EmailTemplateUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateEmailTemplateData;
  }

  /**
   * @description Delete email template
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name delete_email_template
   * @summary Delete Email Template
   * @request DELETE:/routes/email-templates/_{template_id}
   */
  export namespace delete_email_template {
    export type RequestParams = {
      /** Template Id */
      templateId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteEmailTemplateData;
  }

  /**
   * @description Test how well an email matches against a specific template
   * @tags Email Templates, dbtn/module:email_template_manager, dbtn/hasAuth
   * @name test_email_template_match
   * @summary Test Email Template Match
   * @request POST:/routes/email-templates/test-match
   */
  export namespace test_email_template_match {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Template Id */
      template_id: string;
      /** Email Content */
      email_content: string;
      /** Email Subject */
      email_subject: string;
      /** Email Sender */
      email_sender: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TestEmailTemplateMatchData;
  }

  /**
   * @description Get current email configuration (without sensitive data)
   * @tags Configuration, dbtn/module:config, dbtn/hasAuth
   * @name get_email_config
   * @summary Get Email Config
   * @request GET:/routes/config/email
   */
  export namespace get_email_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetEmailConfigData;
  }

  /**
   * @description Update email configuration
   * @tags Configuration, dbtn/module:config, dbtn/hasAuth
   * @name update_email_config
   * @summary Update Email Config
   * @request PUT:/routes/config/email
   */
  export namespace update_email_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = EmailConfigUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateEmailConfigData;
  }

  /**
   * @description Clear email configuration
   * @tags Configuration, dbtn/module:config, dbtn/hasAuth
   * @name clear_email_config
   * @summary Clear Email Config
   * @request DELETE:/routes/config/email
   */
  export namespace clear_email_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ClearEmailConfigData;
  }

  /**
   * @description Test email connection with provided settings
   * @tags Configuration, dbtn/module:config, dbtn/hasAuth
   * @name test_email_connection
   * @summary Test Email Connection
   * @request POST:/routes/config/email/test
   */
  export namespace test_email_connection {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TestConnectionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = TestEmailConnectionData;
  }

  /**
   * @description Get current email configuration for the user
   * @tags Email Configuration, dbtn/module:email_config, dbtn/hasAuth
   * @name get_email_config2
   * @summary Get Email Config
   * @request GET:/routes/email-config/
   * @originalName get_email_config
   * @duplicate
   */
  export namespace get_email_config2 {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetEmailConfig2Data;
  }

  /**
   * @description Update email configuration for the user
   * @tags Email Configuration, dbtn/module:email_config, dbtn/hasAuth
   * @name update_email_config2
   * @summary Update Email Config
   * @request POST:/routes/email-config/
   * @originalName update_email_config
   * @duplicate
   */
  export namespace update_email_config2 {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = EmailConfigRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateEmailConfig2Data;
  }

  /**
   * @description Clear email configuration for the user
   * @tags Email Configuration, dbtn/module:email_config, dbtn/hasAuth
   * @name clear_email_config2
   * @summary Clear Email Config
   * @request DELETE:/routes/email-config/
   * @originalName clear_email_config
   * @duplicate
   */
  export namespace clear_email_config2 {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ClearEmailConfig2Data;
  }

  /**
   * @description Test email connection with provided credentials
   * @tags Email Configuration, dbtn/module:email_config, dbtn/hasAuth
   * @name test_email_connection2
   * @summary Test Email Connection
   * @request POST:/routes/email-config/test
   * @originalName test_email_connection
   * @duplicate
   */
  export namespace test_email_connection2 {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = EmailConfigRequest;
    export type RequestHeaders = {};
    export type ResponseBody = TestEmailConnection2Data;
  }

  /**
   * @description Get all processed documents with optional filtering
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name list_processed_documents
   * @summary List Processed Documents
   * @request GET:/routes/list
   */
  export namespace list_processed_documents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ListProcessedDocumentsPayload;
    export type RequestHeaders = {};
    export type ResponseBody = ListProcessedDocumentsData;
  }

  /**
   * @description Get a specific processed document by ID
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name get_processed_document
   * @summary Get Processed Document
   * @request GET:/routes/get/{document_id}
   */
  export namespace get_processed_document {
    export type RequestParams = {
      /** Document Id */
      documentId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetProcessedDocumentData;
  }

  /**
   * @description Update extracted data for a processed document
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name update_processed_document
   * @summary Update Processed Document
   * @request PUT:/routes/update/{document_id}
   */
  export namespace update_processed_document {
    export type RequestParams = {
      /** Document Id */
      documentId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateDocumentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateProcessedDocumentData;
  }

  /**
   * @description Export multiple documents to Excel with template-based structure
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name export_batch_documents
   * @summary Export Batch Documents
   * @request POST:/routes/export-batch
   */
  export namespace export_batch_documents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BatchExportRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ExportBatchDocumentsData;
  }

  /**
   * @description Download the original PDF for a processed document
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name download_document_pdf
   * @summary Download Document Pdf
   * @request GET:/routes/download-pdf/{document_id}
   */
  export namespace download_document_pdf {
    export type RequestParams = {
      /** Document Id */
      documentId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DownloadDocumentPdfData;
  }

  /**
   * @description Download an exported Excel file
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name download_export_file
   * @summary Download Export File
   * @request GET:/routes/download-export/{filename}
   */
  export namespace download_export_file {
    export type RequestParams = {
      /** Filename */
      filename: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DownloadExportFileData;
  }

  /**
   * @description Delete a processed document and its associated PDF file
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name delete_processed_document
   * @summary Delete Processed Document
   * @request DELETE:/routes/delete/{document_id}
   */
  export namespace delete_processed_document {
    export type RequestParams = {
      /** Document Id */
      documentId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteProcessedDocumentData;
  }

  /**
   * @description Delete multiple documents at once
   * @tags dbtn/module:processed_documents, dbtn/hasAuth
   * @name delete_batch_documents
   * @summary Delete Batch Documents
   * @request POST:/routes/delete-batch
   */
  export namespace delete_batch_documents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BatchExportRequest;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteBatchDocumentsData;
  }

  /**
   * @description Get current webhook email configuration
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name get_webhook_email_config
   * @summary Get Webhook Email Config
   * @request GET:/routes/email/config
   */
  export namespace get_webhook_email_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetWebhookEmailConfigData;
  }

  /**
   * @description Update webhook email configuration
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name update_webhook_email_config
   * @summary Update Webhook Email Config
   * @request PUT:/routes/email/config
   */
  export namespace update_webhook_email_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = WebhookEmailConfigUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateWebhookEmailConfigData;
  }

  /**
   * @description Clear webhook email configuration
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name clear_webhook_email_config
   * @summary Clear Webhook Email Config
   * @request DELETE:/routes/email/config
   */
  export namespace clear_webhook_email_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ClearWebhookEmailConfigData;
  }

  /**
   * @description Test webhook email connection
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name test_webhook_connection
   * @summary Test Webhook Connection
   * @request POST:/routes/email/test-connection
   */
  export namespace test_webhook_connection {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TestWebhookConnectionData;
  }

  /**
   * @description Get current email processing status (legacy endpoint for backward compatibility)
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name get_email_status
   * @summary Get Email Status
   * @request GET:/routes/email/status
   */
  export namespace get_email_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetEmailStatusData;
  }

  /**
   * @description Check for new emails and process PDF attachments with automatic template matching
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name check_emails
   * @summary Check Emails
   * @request POST:/routes/email/check
   */
  export namespace check_emails {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckEmailsData;
  }

  /**
   * @description List all email documents for the current user
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name list_email_documents
   * @summary List Email Documents
   * @request GET:/routes/email/documents
   */
  export namespace list_email_documents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListEmailDocumentsData;
  }

  /**
   * @description List PDF attachments for a specific document
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name list_document_pdfs
   * @summary List Document Pdfs
   * @request GET:/routes/email/documents/{document_id}/pdfs
   */
  export namespace list_document_pdfs {
    export type RequestParams = {
      /** Document Id */
      documentId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListDocumentPdfsData;
  }

  /**
   * @description Process an email document with AI extraction and store in unified system
   * @tags Email Processing, dbtn/module:email_processor, dbtn/hasAuth
   * @name process_email_document
   * @summary Process Email Document
   * @request POST:/routes/email/documents/{document_id}/process
   */
  export namespace process_email_document {
    export type RequestParams = {
      /** Document Id */
      documentId: string;
    };
    export type RequestQuery = {
      /** Template Id */
      template_id: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProcessEmailDocumentData;
  }

  /**
   * @description Get current IMAP email configuration status
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name get_imap_email_status
   * @summary Get Imap Email Status
   * @request GET:/routes/imap-email/status
   */
  export namespace get_imap_email_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetImapEmailStatusData;
  }

  /**
   * @description List all IMAP email documents for the current user
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name list_imap_email_documents
   * @summary List Imap Email Documents
   * @request GET:/routes/imap-email/documents
   */
  export namespace list_imap_email_documents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListImapEmailDocumentsData;
  }

  /**
   * @description List PDF attachments for a specific IMAP document
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name list_imap_document_pdfs
   * @summary List Imap Document Pdfs
   * @request GET:/routes/imap-email/documents/{document_id}/pdfs
   */
  export namespace list_imap_document_pdfs {
    export type RequestParams = {
      /** Document Id */
      documentId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListImapDocumentPdfsData;
  }

  /**
   * @description Process an IMAP email document with AI extraction and store in unified system
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name process_imap_email_document
   * @summary Process Imap Email Document
   * @request POST:/routes/imap-email/documents/{document_id}/process
   */
  export namespace process_imap_email_document {
    export type RequestParams = {
      /** Document Id */
      documentId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ProcessImapDocumentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ProcessImapEmailDocumentData;
  }

  /**
   * @description Check for new emails using IMAP configuration and process PDF attachments
   * @tags IMAP Email Processing, dbtn/module:imap_email, dbtn/hasAuth
   * @name check_imap_emails
   * @summary Check Imap Emails
   * @request POST:/routes/imap-email/check
   */
  export namespace check_imap_emails {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckImapEmailsData;
  }
}
