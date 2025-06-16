from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import databutton as db
import imaplib
import email
import email.header
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
import base64
import uuid
import re
from datetime import datetime
from app.auth import AuthorizedUser
from app.libs.document_processor import store_processed_document, sanitize_storage_key as lib_sanitize_storage_key
from app.libs.template_matcher import AITemplateMatcher
from app.libs.email_template_matcher import EmailTemplateMatcher

router = APIRouter(
    prefix="/email",
    tags=["Email Processing"]
)

# Email configuration - now configurable like IMAP system
# These will be loaded from API configuration instead of hardcoded

class EmailDocument(BaseModel):
    id: str
    sender: str
    subject: str
    received_date: str
    pdf_count: int
    status: str  # "new", "processing", "completed", "error"
    error_message: Optional[str] = None

class EmailCheckResponse(BaseModel):
    message: str
    new_emails_count: int
    processed_documents: List[EmailDocument]

class EmailStatus(BaseModel):
    is_configured: bool
    last_check: Optional[str] = None
    total_processed: int
    enabled: bool

class WebhookEmailConfig(BaseModel):
    imap_server: str
    username: str
    port: int = 993
    use_ssl: bool = True
    enabled: bool = True

class WebhookEmailConfigResponse(BaseModel):
    imap_server: Optional[str] = None
    username: Optional[str] = None
    port: Optional[int] = None
    use_ssl: Optional[bool] = None
    enabled: Optional[bool] = None
    is_configured: bool
    last_test: Optional[str] = None
    test_status: Optional[str] = None

class WebhookEmailConfigUpdate(BaseModel):
    imap_server: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    port: Optional[int] = None
    use_ssl: Optional[bool] = None
    enabled: Optional[bool] = None

class WebhookTestResult(BaseModel):
    success: bool
    message: str
    details: Optional[str] = None

@router.get("/config", response_model=WebhookEmailConfigResponse)
async def get_webhook_email_config(user: AuthorizedUser):
    """Get current webhook email configuration"""
    try:
        # Get user-specific configuration from storage
        config = db.storage.json.get(f"webhook_email_config_{user.sub}", default={})
        
        # Check if all required fields are present (including password)
        is_configured = bool(
            config.get("imap_server") and 
            config.get("username") and 
            config.get("password")  # Check if password is stored in config
        )
        
        return WebhookEmailConfigResponse(
            imap_server=config.get("imap_server"),
            username=config.get("username"),
            port=config.get("port", 993),
            use_ssl=config.get("use_ssl", True),
            enabled=config.get("enabled", True),
            is_configured=is_configured,
            last_test=config.get("last_test"),
            test_status=config.get("test_status")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting webhook email config: {str(e)}")

@router.put("/config")
async def update_webhook_email_config(config_update: WebhookEmailConfigUpdate, user: AuthorizedUser):
    """Update webhook email configuration"""
    try:
        # Get existing user-specific configuration
        current_config = db.storage.json.get(f"webhook_email_config_{user.sub}", default={})
        
        # Update configuration fields
        if config_update.imap_server is not None:
            current_config["imap_server"] = config_update.imap_server
        if config_update.username is not None:
            current_config["username"] = config_update.username
        if config_update.port is not None:
            current_config["port"] = config_update.port
        if config_update.use_ssl is not None:
            current_config["use_ssl"] = config_update.use_ssl
        if config_update.enabled is not None:
            current_config["enabled"] = config_update.enabled
        
        # Update password if provided
        if config_update.password is not None and config_update.password.strip():
            current_config["password"] = config_update.password
            print(f"Webhook password updated for user {user.sub}")
        
        # Add timestamp
        from datetime import datetime
        current_config["last_updated"] = datetime.now().isoformat()
        
        # Save updated configuration
        db.storage.json.put(f"webhook_email_config_{user.sub}", current_config)
        
        return {"message": "Configuration updated successfully"}
        
    except Exception as e:
        print(f"Error updating webhook email config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")

@router.delete("/config")
async def clear_webhook_email_config(user: AuthorizedUser):
    """Clear webhook email configuration"""
    try:
        # Clear user-specific configuration from storage
        db.storage.json.put(f"webhook_email_config_{user.sub}", {})
        
        return {"message": "Configuration cleared successfully"}
    except Exception as e:
        print(f"Error clearing webhook email config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear configuration: {str(e)}")

@router.post("/test-connection", response_model=WebhookTestResult)
async def test_webhook_connection(user: AuthorizedUser):
    """Test webhook email connection"""
    try:
        # Get user-specific configuration
        config = db.storage.json.get(f"webhook_email_config_{user.sub}", default={})
        
        if not config.get("imap_server") or not config.get("username") or not config.get("password"):
            return WebhookTestResult(
                success=False,
                message="Configuration incomplete",
                details="Please configure IMAP server, username and password first"
            )
        
        # Add missing import
        from datetime import datetime
        import ssl
        
        server = config["imap_server"]
        username = config["username"]
        password = config["password"]
        port = config.get("port", 993)
        use_ssl = config.get("use_ssl", True)
        
        print(f"Testing connection to {server}:{port} with user {username}")
        
        if use_ssl:
            mail = imaplib.IMAP4_SSL(server, port)
        else:
            mail = imaplib.IMAP4(server, port)
        
        # Test login
        mail.login(username, password)
        
        # Test selecting inbox
        status, folders = mail.list()
        mail.select('inbox')
        
        # Get folder count
        folder_count = len(folders) if folders else 0
        
        mail.close()
        mail.logout()
        
        # Update config with test result
        config["last_test"] = datetime.now().isoformat()
        config["test_status"] = "success"
        db.storage.json.put(f"webhook_email_config_{user.sub}", config)
        
        return WebhookTestResult(
            success=True,
            message="Connection successful",
            details=f"Successfully connected and found {folder_count} folders"
        )
        
    except imaplib.IMAP4.error as e:
        error_msg = f"IMAP error: {str(e)}"
        print(error_msg)
        
        # Update config with test result
        config["last_test"] = datetime.now().isoformat()
        config["test_status"] = "failed"
        db.storage.json.put(f"webhook_email_config_{user.sub}", config)
        
        return WebhookTestResult(
            success=False,
            message="Connection failed",
            details=error_msg
        )
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(error_msg)
        
        # Update config with test result
        config["last_test"] = datetime.now().isoformat()
        config["test_status"] = "failed"
        db.storage.json.put(f"webhook_email_config_{user.sub}", config)
        
        return WebhookTestResult(
            success=False,
            message="Test failed",
            details=error_msg
        )

@router.get("/status", response_model=EmailStatus)
async def get_email_status():
    """Get current email processing status (legacy endpoint for backward compatibility)"""
    try:
        # This endpoint is kept for backward compatibility
        # For actual webhook email configuration, use /config endpoint
        
        # Get status from storage (legacy format)
        status_data = db.storage.json.get("email_status", default={
            "last_check": None,
            "total_processed": 0,
            "enabled": True
        })
        
        # Always return not configured for this legacy endpoint
        # since webhook configuration is now user-specific
        return EmailStatus(
            is_configured=False,
            last_check=status_data.get("last_check"),
            total_processed=status_data.get("total_processed", 0),
            enabled=status_data.get("enabled", True)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting email status: {str(e)}")

def sanitize_storage_key(key: str) -> str:
    """Sanitize storage key to only allow alphanumeric and ._- symbols"""
    return re.sub(r'[^a-zA-Z0-9._-]', '', key)

def decode_mime_words(s):
    """Decode MIME encoded words in email headers"""
    try:
        decoded_parts = email.header.decode_header(s)
        decoded_string = ''
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                decoded_string += part.decode(encoding or 'utf-8')
            else:
                decoded_string += part
        return decoded_string
    except Exception:
        return s

@router.post("/check", response_model=EmailCheckResponse)
async def check_emails(user: AuthorizedUser):
    """
    Check for new emails and process PDF attachments with automatic template matching
    """
    try:
        # Get webhook email configuration from user-specific storage
        config = db.storage.json.get(f"webhook_email_config_{user.sub}", default={})
        
        if not config.get("imap_server") or not config.get("username") or not config.get("password"):
            raise HTTPException(status_code=500, detail="Webhook email configuration incomplete")
        
        imap_server = config["imap_server"]
        email_user = config["username"]
        webhook_password = config["password"]
        port = config.get("port", 993)
        use_ssl = config.get("use_ssl", True)
        
        # Connect to IMAP server
        print(f"Connecting to IMAP server: {imap_server}:{port} with user {email_user}")
        if use_ssl:
            mail = imaplib.IMAP4_SSL(imap_server, port)
        else:
            mail = imaplib.IMAP4(imap_server, port)
        mail.login(email_user, webhook_password)
        mail.select('inbox')
        
        # Search for unread emails
        status, messages = mail.search(None, 'UNSEEN')
        if status != 'OK':
            raise HTTPException(status_code=500, detail="Failed to search for emails")
        
        message_ids = messages[0].split()
        processed_documents = []
        new_emails_count = 0
        
        print(f"Found {len(message_ids)} unread emails")
        
        # Initialize AI template matcher
        template_matcher = AITemplateMatcher()
        
        # Initialize email template matcher
        email_template_matcher = EmailTemplateMatcher()
        
        for msg_id in message_ids:
            try:
                # Fetch email
                status, msg_data = mail.fetch(msg_id, '(RFC822)')
                if status != 'OK':
                    continue
                    
                # Parse email
                email_body = msg_data[0][1]
                email_message = email.message_from_bytes(email_body)
                
                # Extract basic info
                sender = decode_mime_words(email_message.get('From', 'Unknown'))
                subject = decode_mime_words(email_message.get('Subject', 'No Subject'))
                date_str = email_message.get('Date', '')
                
                print(f"Processing email from {sender}, subject: {subject}")
                
                # Generate unique document ID
                doc_id = str(uuid.uuid4())
                
                # Extract PDF attachments
                pdf_attachments = []
                
                def extract_attachments(msg, attachments_list):
                    for part in msg.walk():
                        if part.get_content_disposition() == 'attachment':
                            filename = part.get_filename()
                            if filename and filename.lower().endswith('.pdf'):
                                try:
                                    content = part.get_payload(decode=True)
                                    if content:
                                        attachments_list.append({
                                            'filename': filename,
                                            'content': content
                                        })
                                        print(f"Found PDF attachment: {filename}")
                                except Exception as e:
                                    print(f"Error extracting attachment {filename}: {e}")
                
                extract_attachments(email_message, pdf_attachments)
                
                # Only process emails with PDF attachments
                if pdf_attachments:
                    new_emails_count += 1
                    
                    # Extract email content for template matching
                    email_content = ""
                    for part in email_message.walk():
                        if part.get_content_type() == "text/plain":
                            try:
                                email_content = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                                break
                            except Exception:
                                continue
                    
                    # First try email template matching (for email-based processing)
                    email_template_match = None
                    email_template_confidence = 0
                    
                    if email_content:
                        print("Running email template matching...")
                        email_template_match = email_template_matcher.find_best_template_for_email(
                            email_content=email_content,
                            email_subject=subject,
                            email_sender=sender
                        )
                        
                        if email_template_match:
                            email_template_confidence = email_template_match.confidence_score
                            print(f"Email template match: {email_template_match.template_name} (confidence: {email_template_confidence:.2f})")
                        else:
                            print("No email template match found")
                    
                    # Then try PDF template matching (for PDF-based processing)
                    pdf_template_match = None
                    pdf_confidence_score = 0
                    pdf_matching_reasoning = ""
                    
                    if pdf_attachments:
                        print("Running PDF template matching...")
                        pdf_match_result = template_matcher.match_template_for_pdf(pdf_attachments[0]['content'])
                        if pdf_match_result:
                            pdf_template_match = pdf_match_result.template_id
                            pdf_confidence_score = pdf_match_result.confidence
                            pdf_matching_reasoning = pdf_match_result.reasoning
                            print(f"PDF template match: {pdf_template_match} (confidence: {pdf_confidence_score}%)")
                        else:
                            print("No PDF template match found")
                    
                    # Determine best processing approach
                    processing_type = "unknown"
                    suggested_template = None
                    confidence_score = 0
                    matching_reasoning = ""
                    auto_processable = False
                    
                    # Prioritize email templates for direct email processing
                    if email_template_match and email_template_confidence >= 0.7:
                        processing_type = "email_template"
                        suggested_template = email_template_match.template_id
                        confidence_score = email_template_confidence * 100  # Convert to percentage
                        matching_reasoning = f"Email template match: {', '.join(email_template_match.match_reasons)}"
                        auto_processable = email_template_match.auto_processable
                        print(f"Selected email template processing: {email_template_match.template_name}")
                    
                    # Fall back to PDF template processing
                    elif pdf_template_match and pdf_confidence_score >= 70:
                        processing_type = "pdf_template"
                        suggested_template = pdf_template_match
                        confidence_score = pdf_confidence_score
                        matching_reasoning = pdf_matching_reasoning
                        auto_processable = template_matcher.should_auto_process(confidence_score)
                        print(f"Selected PDF template processing: {pdf_template_match}")
                    
                    # Use lower confidence matches as suggestions
                    elif email_template_match and email_template_confidence >= 0.5:
                        processing_type = "email_template_suggestion"
                        suggested_template = email_template_match.template_id
                        confidence_score = email_template_confidence * 100
                        matching_reasoning = f"Email template suggestion: {', '.join(email_template_match.match_reasons)}"
                        auto_processable = False
                        print(f"Email template suggestion: {email_template_match.template_name}")
                    
                    elif pdf_template_match and pdf_confidence_score >= 50:
                        processing_type = "pdf_template_suggestion"
                        suggested_template = pdf_template_match
                        confidence_score = pdf_confidence_score
                        matching_reasoning = pdf_matching_reasoning
                        auto_processable = False
                        print(f"PDF template suggestion: {pdf_template_match}")
                    
                    # Determine initial status based on AI confidence
                    initial_status = "new"
                    if auto_processable:
                        initial_status = "ready_for_auto_processing"
                    elif suggested_template:
                        initial_status = "template_suggested"
                    
                    # Store email metadata
                    email_metadata = {
                        'id': doc_id,
                        'sender': sender,
                        'subject': subject,
                        'received_date': datetime.now().isoformat(),
                        'original_date': date_str,
                        'pdf_count': len(pdf_attachments),
                        'status': initial_status,
                        'processed_at': None,
                        'user_id': user.sub,
                        'processing_type': processing_type,
                        'email_content': email_content[:500] + "..." if len(email_content) > 500 else email_content,  # Store snippet for debugging
                        'ai_analysis': {
                            'suggested_template_id': suggested_template,
                            'confidence_score': confidence_score,
                            'reasoning': matching_reasoning,
                            'auto_processable': auto_processable,
                            'processing_type': processing_type
                        },
                        'email_template_analysis': {
                            'match_found': email_template_match is not None,
                            'template_id': email_template_match.template_id if email_template_match else None,
                            'template_name': email_template_match.template_name if email_template_match else None,
                            'confidence': email_template_confidence
                        } if email_template_match else None,
                        'pdf_template_analysis': {
                            'match_found': pdf_template_match is not None,
                            'template_id': pdf_template_match,
                            'confidence': pdf_confidence_score
                        } if pdf_template_match else None
                    }
                    
                    # Store metadata
                    metadata_key = f"email_documents.{sanitize_storage_key(doc_id)}"
                    db.storage.json.put(metadata_key, email_metadata)
                    
                    # Store PDF attachments
                    pdf_info = []
                    for i, attachment in enumerate(pdf_attachments):
                        attachment_key = f"email_pdfs.{sanitize_storage_key(doc_id)}.{i}.{sanitize_storage_key(attachment['filename'])}"
                        db.storage.binary.put(attachment_key, attachment['content'])
                        print(f"Stored PDF: {attachment_key}")
                        pdf_info.append({'index': i, 'filename': attachment['filename'], 'storage_key': attachment_key, 'size': len(attachment['content'])})
                    
                    # Update metadata with PDF info
                    email_metadata['pdfs'] = pdf_info
                    db.storage.json.put(metadata_key, email_metadata)
                    
                    processed_documents.append(EmailDocument(
                        id=doc_id,
                        sender=sender,
                        subject=subject,
                        received_date=email_metadata['received_date'],
                        pdf_count=len(pdf_attachments),
                        status=initial_status
                    ))
                    
                    print(f"Processed email {doc_id} with {len(pdf_attachments)} PDF attachments")
                
                # Mark email as read
                mail.store(msg_id, '+FLAGS', '\\Seen')
                
            except Exception as e:
                print(f"Error processing email {msg_id}: {e}")
                continue
        
        # Close IMAP connection
        mail.close()
        mail.logout()
        
        print(f"Email check completed. Processed {new_emails_count} emails with PDFs")
        
        # Update email status tracking
        current_status = db.storage.json.get("email_status", default={"total_processed": 0})
        updated_status = {
            "last_check": datetime.now().isoformat(),
            "total_processed": current_status.get("total_processed", 0) + new_emails_count,
            "enabled": True
        }
        db.storage.json.put("email_status", updated_status)
        
        return EmailCheckResponse(
            message=f"Successfully checked emails. Found {new_emails_count} new emails with PDF attachments.",
            new_emails_count=new_emails_count,
            processed_documents=processed_documents
        )
        
    except imaplib.IMAP4.error as e:
        print(f"IMAP error: {e}")
        raise HTTPException(status_code=500, detail=f"Email server error: {str(e)}") from e
    except Exception as e:
        print(f"Error checking emails: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to check emails: {str(e)}") from e

@router.get("/documents", response_model=List[EmailDocument])
async def list_email_documents(user: AuthorizedUser):
    """List all email documents for the current user"""
    try:
        # Get all email documents for this user
        all_files = db.storage.json.list()
        documents = []
        
        for file in all_files:
            if file.name.startswith("email_documents."):
                try:
                    metadata = db.storage.json.get(file.name)
                    if metadata.get('user_id') == user.sub:
                        documents.append(EmailDocument(
                            id=metadata['id'],
                            sender=metadata['sender'],
                            subject=metadata['subject'],
                            received_date=metadata['received_date'],
                            pdf_count=metadata['pdf_count'],
                            status=metadata['status'],
                            error_message=metadata.get('error_message')
                        ))
                except Exception as e:
                    print(f"Error reading document metadata {file.name}: {e}")
                    continue
        
        # Sort by received date, newest first
        documents.sort(key=lambda x: x.received_date, reverse=True)
        
        return documents
        
    except Exception as e:
        print(f"Error listing email documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list email documents: {str(e)}") from e

@router.get("/documents/{document_id}/pdfs")
async def list_document_pdfs(document_id: str, user: AuthorizedUser):
    """List PDF attachments for a specific document"""
    try:
        # Verify document belongs to user
        metadata_key = f"email_documents.{sanitize_storage_key(document_id)}"
        metadata = db.storage.json.get(metadata_key)
        
        if not metadata or metadata.get('user_id') != user.sub:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Find all PDF files for this document
        all_files = db.storage.binary.list()
        pdfs = []
        
        prefix = f"email_pdfs.{sanitize_storage_key(document_id)}."
        for file in all_files:
            if file.name.startswith(prefix):
                # Extract filename from storage key
                parts = file.name.split('.')
                if len(parts) >= 4:
                    filename = '.'.join(parts[3:])  # Everything after document_id and index
                    pdfs.append({
                        'storage_key': file.name,
                        'filename': filename,
                        'size': file.size
                    })
        
        return {'document_id': document_id, 'pdfs': pdfs}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing document PDFs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list document PDFs: {str(e)}") from e

@router.post("/documents/{document_id}/process")
async def process_email_document(document_id: str, template_id: str, user: AuthorizedUser):
    """
    Process an email document with AI extraction and store in unified system
    """
    try:
        # Get document metadata
        metadata_key = f"email_documents.{lib_sanitize_storage_key(document_id)}"
        metadata = db.storage.json.get(metadata_key)
        
        if not metadata:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if metadata.get('user_id') != user.sub:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get the first PDF for processing
        pdf_files = db.storage.binary.list()
        pdf_key = None
        pdf_filename = None
        
        for file in pdf_files:
            if file.name.startswith(f"email_pdfs.{lib_sanitize_storage_key(document_id)}."):
                pdf_key = file.name
                # Extract filename from storage key
                parts = file.name.split('.')
                if len(parts) >= 4:
                    pdf_filename = parts[-1]  # Last part should be filename
                break
        
        if not pdf_key:
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Get PDF content
        pdf_content = db.storage.binary.get(pdf_key)
        
        # Get template info
        template_name = None
        if template_id:
            try:
                from app.apis.template_manager.__init__ import TEMPLATES_STORAGE_KEY as TEMPLATE_MANAGER_STORAGE_KEY
                all_templates_dict = db.storage.json.get(TEMPLATE_MANAGER_STORAGE_KEY, default={})
                if template_id in all_templates_dict:
                    template_name = all_templates_dict[template_id].get('name')
            except Exception as e:
                print(f"Error fetching template {template_id}: {e}")
        
        # Process with AI (reuse PDF parser logic)
        import openai
        import pdfplumber
        import io
        import json
        
        # Initialize OpenAI client
        client = openai.OpenAI(api_key=db.secrets.get("OPENAI_API_KEY"))
        if not client:
            raise HTTPException(status_code=500, detail="OpenAI client not initialized")
        
        # Extract text from PDF
        raw_text = ""
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    raw_text += page_text + "\n"
        
        # Get template and build proper AI prompt (using same logic as pdf_parser)
        chosen_template = None
        if template_id:
            try:
                from app.apis.template_manager.__init__ import TEMPLATES_STORAGE_KEY as TEMPLATE_MANAGER_STORAGE_KEY
                from app.apis.template_manager.__init__ import PdfTemplate
                all_templates_dict = db.storage.json.get(TEMPLATE_MANAGER_STORAGE_KEY, default={})
                if template_id in all_templates_dict:
                    chosen_template = PdfTemplate(**all_templates_dict[template_id])
                    print(f"Using template: {chosen_template.name} (ID: {template_id})")
                else:
                    print(f"Template ID {template_id} not found in storage. Proceeding with generic extraction.")
            except Exception as e:
                print(f"Error fetching template {template_id}: {e}. Proceeding with generic extraction.")
        
        # Base prompt
        prompt_parts = [
            "You are an expert data extraction assistant. Your task is to extract structured information from the provided text, which originates from a PDF document.",
            "The text to parse is delimited by '--- BEGIN TEXT ---' and '--- END TEXT ---'.",
            "Respond with a valid JSON object."
        ]

        # Schema and specific instructions based on template or generic
        if chosen_template and chosen_template.target_fields:
            prompt_parts.append(f"A specific extraction template named '{chosen_template.name}' has been selected. Focus on extracting the following fields:")
            field_descriptions = []
            json_schema_fields = "{"
            for i, field in enumerate(chosen_template.target_fields):
                field_desc = f"  - '{field.field_name}'"
                if field.ai_hint:
                    field_desc += f" (Hint: {field.ai_hint})"
                field_descriptions.append(field_desc)
                json_schema_fields += f'"{field.field_name}": "string or number or array or null"'
                if i < len(chosen_template.target_fields) - 1:
                    json_schema_fields += ", "
            json_schema_fields += "}"
            prompt_parts.append("\n".join(field_descriptions))
            prompt_parts.append(f"The JSON output should strictly follow this structure: {json_schema_fields}.")
            prompt_parts.append("If a field is not found or not applicable, use a JSON 'null' value for it.")
        else:
            prompt_parts.append("No specific template was selected, or the selected template has no target fields. Perform a generic extraction.")
            prompt_parts.append("Identify and extract common business document fields such as: OrderNumber, OrderDate, CustomerName, DeliveryAddress, Items (with ProductName, Quantity, UnitPrice, TotalPrice), TotalAmount, Currency, etc.")
            prompt_parts.append("The JSON output should be a flat object where keys are descriptive names for the data points and values are the extracted information. For lists like 'Items', use an array of objects.")
            prompt_parts.append("If a commonly expected field is not found, you may omit it or use a JSON 'null' value.")

        prompt_parts.append("\nText to parse:")
        prompt_parts.append("--- BEGIN TEXT ---")
        prompt_parts.append(raw_text[:4000])  # Limit text sent to OpenAI for performance/cost
        prompt_parts.append("--- END TEXT ---")
        
        final_prompt = "\n".join(prompt_parts)
        
        print(f"Processing email document with template: {chosen_template.name if chosen_template else 'Generic'}")
        
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an AI assistant that extracts structured data from text and returns it as a valid JSON object according to the user's instructions."},
                {"role": "user", "content": final_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        extracted_data = {}
        if completion.choices and completion.choices[0].message and completion.choices[0].message.content:
            try:
                extracted_data = json.loads(completion.choices[0].message.content)
            except json.JSONDecodeError:
                extracted_data = {"AI_Extraction_Error": "Failed to parse AI response"}
        
        # Store in unified processed documents system
        document_id_unified = store_processed_document(
            source="email",
            original_filename=pdf_filename or "email_attachment.pdf",
            template_id=template_id,
            template_name=template_name,
            extracted_data=extracted_data,
            raw_text=raw_text,
            user_id=user.sub,
            user_email=user.email if hasattr(user, 'email') else 'unknown@example.com',
            pdf_storage_key=pdf_key,
            email_sender=metadata.get('sender'),
            email_subject=metadata.get('subject'),
            email_received_date=metadata.get('received_date'),
            email_address="mottak@digitool.no"
        )
        
        # Update email document status
        metadata['status'] = 'completed'
        metadata['processed_at'] = datetime.now().isoformat()
        db.storage.json.put(metadata_key, metadata)
        
        print(f"Processed email document and stored with unified ID: {document_id_unified}")
        
        return {
            "message": "Document processed successfully",
            "unified_document_id": document_id_unified,
            "extracted_data": extracted_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing email document {document_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


async def download_pdf(document_id: str, pdf_index: int, user: AuthorizedUser):
    """Download a specific PDF attachment"""
    try:
        # Verify document belongs to user
        metadata_key = f"email_documents.{sanitize_storage_key(document_id)}"
        metadata = db.storage.json.get(metadata_key)
        
        if not metadata or metadata.get('user_id') != user.sub:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Find the PDF file
        all_files = db.storage.binary.list()
        prefix = f"email_pdfs.{sanitize_storage_key(document_id)}.{pdf_index}."
        
        pdf_file = None
        for file in all_files:
            if file.name.startswith(prefix):
                pdf_file = file
                break
        
        if not pdf_file:
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Get PDF content
        pdf_content = db.storage.binary.get(pdf_file.name)
        
        # Extract filename
        parts = pdf_file.name.split('.')
        filename = '.'.join(parts[3:]) if len(parts) >= 4 else 'document.pdf'
        
        from fastapi.responses import Response
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download PDF: {str(e)}") from e
