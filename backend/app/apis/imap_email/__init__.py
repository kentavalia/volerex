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
    prefix="/imap-email",
    tags=["IMAP Email Processing"]
)

class ImapEmailDocument(BaseModel):
    id: str
    sender: str
    subject: str
    received_date: str
    pdf_count: int
    status: str  # "new", "processing", "completed", "error"
    error_message: Optional[str] = None

class ImapEmailCheckResponse(BaseModel):
    message: str
    new_emails_count: int
    processed_documents: List[ImapEmailDocument]

class ImapEmailStatus(BaseModel):
    is_configured: bool
    last_check: Optional[str] = None
    total_processed: int
    enabled: bool
    email_address: Optional[str] = None

@router.get("/status", response_model=ImapEmailStatus)
async def get_imap_email_status(user: AuthorizedUser):
    """
    Get current IMAP email configuration status
    """
    try:
        # Get configuration from storage
        config_data = db.storage.json.get(f"email_config_{user.sub}", default={})
        
        is_configured = bool(
            config_data.get("username") and 
            config_data.get("password") and 
            config_data.get("imap_server")
        )
        
        # Get status from storage
        status_data = db.storage.json.get(f"imap_email_status_{user.sub}", default={
            "last_check": None,
            "total_processed": 0,
            "enabled": True
        })
        
        return ImapEmailStatus(
            is_configured=is_configured,
            last_check=status_data.get("last_check"),
            total_processed=status_data.get("total_processed", 0),
            enabled=status_data.get("enabled", True),
            email_address=config_data.get("username") if is_configured else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting IMAP email status: {str(e)}")

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

@router.get("/documents", response_model=List[ImapEmailDocument])
async def list_imap_email_documents(user: AuthorizedUser):
    """
    List all IMAP email documents for the current user
    """
    try:
        # Get all IMAP email documents for this user
        all_files = db.storage.json.list()
        documents = []
        
        for file in all_files:
            if file.name.startswith(f"email_doc_{user.sub}_"):
                try:
                    metadata = db.storage.json.get(file.name)
                    if metadata.get('source') == 'imap':
                        documents.append(ImapEmailDocument(
                            id=metadata['id'],
                            sender=metadata['sender'],
                            subject=metadata['subject'],
                            received_date=metadata['received_date'],
                            pdf_count=metadata['pdf_count'],
                            status=metadata['status'],
                            error_message=metadata.get('error_message')
                        ))
                except Exception as e:
                    print(f"Error reading IMAP document metadata {file.name}: {e}")
                    continue
        
        # Sort by received date, newest first
        documents.sort(key=lambda x: x.received_date, reverse=True)
        
        return documents
        
    except Exception as e:
        print(f"Error listing IMAP email documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list IMAP email documents: {str(e)}")

@router.get("/documents/{document_id}/pdfs")
async def list_imap_document_pdfs(document_id: str, user: AuthorizedUser):
    """
    List PDF attachments for a specific IMAP document
    """
    try:
        # Verify document belongs to user
        metadata_key = sanitize_storage_key(f"email_doc_{user.sub}_{document_id}")
        metadata = db.storage.json.get(metadata_key)
        
        if not metadata or metadata.get('source') != 'imap':
            raise HTTPException(status_code=404, detail="IMAP document not found")
        
        # Find all PDF files for this document
        all_files = db.storage.binary.list()
        pdfs = []
        
        prefix = f"pdf_{user.sub}_{document_id}_"
        for file in all_files:
            if file.name.startswith(prefix):
                # Extract index from storage key
                parts = file.name.split('_')
                if len(parts) >= 4:
                    index = parts[-1]  # Last part should be index
                    pdfs.append({
                        'storage_key': file.name,
                        'index': index,
                        'size': file.size
                    })
        
        return {'document_id': document_id, 'pdfs': pdfs}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing IMAP document PDFs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list IMAP document PDFs: {str(e)}")

class ProcessImapDocumentRequest(BaseModel):
    template_id: Optional[str] = None
    email_template_id: Optional[str] = None

@router.post("/documents/{document_id}/process")
async def process_imap_email_document(document_id: str, request: ProcessImapDocumentRequest, user: AuthorizedUser):
    """
    Process an IMAP email document with AI extraction and store in unified system
    """
    try:
        # Get document metadata
        metadata_key = sanitize_storage_key(f"email_doc_{user.sub}_{document_id}")
        metadata = db.storage.json.get(metadata_key)
        
        if not metadata or metadata.get('source') != 'imap':
            raise HTTPException(status_code=404, detail="IMAP document not found")
        
        # Update status to processing
        metadata['status'] = 'processing'
        db.storage.json.put(metadata_key, metadata)
        
        # Get the first PDF for processing
        pdf_files = db.storage.binary.list()
        pdf_key = None
        
        for file in pdf_files:
            if file.name.startswith(f"pdf_{user.sub}_{document_id}_"):
                pdf_key = file.name
                break
        
        if not pdf_key:
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Get PDF content
        pdf_content = db.storage.binary.get(pdf_key)
        
        # Get template info
        template_name = None
        if request.template_id:
            try:
                from app.apis.template_manager.__init__ import TEMPLATES_STORAGE_KEY as TEMPLATE_MANAGER_STORAGE_KEY
                all_templates_dict = db.storage.json.get(TEMPLATE_MANAGER_STORAGE_KEY, default={})
                if request.template_id in all_templates_dict:
                    template_name = all_templates_dict[request.template_id].get('name')
            except Exception as e:
                print(f"Error fetching template {request.template_id}: {e}")
        
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
        if request.template_id:
            try:
                from app.apis.template_manager.__init__ import TEMPLATES_STORAGE_KEY as TEMPLATE_MANAGER_STORAGE_KEY
                from app.apis.template_manager.__init__ import PdfTemplate
                all_templates_dict = db.storage.json.get(TEMPLATE_MANAGER_STORAGE_KEY, default={})
                if request.template_id in all_templates_dict:
                    chosen_template = PdfTemplate(**all_templates_dict[request.template_id])
                    print(f"Using template: {chosen_template.name} (ID: {request.template_id})")
                else:
                    print(f"Template ID {request.template_id} not found in storage. Proceeding with generic extraction.")
            except Exception as e:
                print(f"Error fetching template {request.template_id}: {e}. Proceeding with generic extraction.")
        
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
        
        print(f"Processing IMAP email document with template: {chosen_template.name if chosen_template else 'Generic'}")
        
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
            source="imap_email",
            original_filename=f"imap_email_{document_id}.pdf",
            template_id=request.template_id,
            template_name=template_name,
            extracted_data=extracted_data,
            raw_text=raw_text,
            user_id=user.sub,
            user_email=user.email if hasattr(user, 'email') else 'unknown@example.com',
            pdf_storage_key=pdf_key,
            email_sender=metadata.get('sender'),
            email_subject=metadata.get('subject'),
            email_received_date=metadata.get('received_date'),
            email_address=metadata.get('email_address', 'emailparser@digitool.no')
        )
        
        # Update email document status
        metadata['status'] = 'completed'
        metadata['processed_at'] = datetime.now().isoformat()
        db.storage.json.put(metadata_key, metadata)
        
        print(f"Processed IMAP email document and stored with unified ID: {document_id_unified}")
        
        return {
            "message": "IMAP document processed successfully",
            "unified_document_id": document_id_unified,
            "extracted_data": extracted_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing IMAP email document {document_id}: {e}")
        import traceback
        traceback.print_exc()
        
        # Update status to error
        try:
            metadata_key = sanitize_storage_key(f"email_doc_{user.sub}_{document_id}")
            metadata = db.storage.json.get(metadata_key, default={})
            metadata['status'] = 'error'
            metadata['error_message'] = str(e)
            db.storage.json.put(metadata_key, metadata)
        except Exception:
            pass
        
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.post("/check", response_model=ImapEmailCheckResponse)
async def check_imap_emails(user: AuthorizedUser):
    """
    Check for new emails using IMAP configuration and process PDF attachments
    """
    try:
        # Get configuration from storage
        config_data = db.storage.json.get(f"email_config_{user.sub}", default={})
        
        username = config_data.get("username")
        password = config_data.get("password")
        imap_server = config_data.get("imap_server")
        port = config_data.get("port", 993)
        
        if not (username and password and imap_server):
            raise HTTPException(status_code=400, detail="IMAP email not configured. Please configure in settings.")
        
        # Connect to IMAP server
        print(f"Connecting to IMAP server: {imap_server}:{port}")
        mail = imaplib.IMAP4_SSL(imap_server, port)
        mail.login(username, password)
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
                received_date = email_message.get('Date', '')
                
                print(f"Processing email from {sender}: {subject}")
                
                # Look for PDF attachments
                pdf_attachments = []
                for part in email_message.walk():
                    if part.get_content_disposition() == 'attachment':
                        filename = part.get_filename()
                        if filename and filename.lower().endswith('.pdf'):
                            pdf_content = part.get_payload(decode=True)
                            if pdf_content:
                                pdf_attachments.append({
                                    'filename': filename,
                                    'content': pdf_content
                                })
                
                if pdf_attachments:
                    new_emails_count += 1
                    email_doc_id = str(uuid.uuid4())
                    
                    # Store email metadata
                    email_doc = {
                        'id': email_doc_id,
                        'sender': sender,
                        'subject': subject,
                        'received_date': received_date,
                        'pdf_count': len(pdf_attachments),
                        'status': 'new',
                        'source': 'imap',
                        'email_address': username
                    }
                    
                    # Store email document
                    db.storage.json.put(
                        sanitize_storage_key(f"email_doc_{user.sub}_{email_doc_id}"),
                        email_doc
                    )
                    
                    # Process each PDF attachment
                    for i, attachment in enumerate(pdf_attachments):
                        try:
                            # Store PDF in binary storage
                            pdf_key = sanitize_storage_key(f"pdf_{user.sub}_{email_doc_id}_{i}")
                            db.storage.binary.put(pdf_key, attachment['content'])
                            
                            # Extract data from PDF using AI
                            extraction_result = template_matcher.extract_and_match_data(
                                attachment['content'],
                                attachment['filename']
                            )
                            
                            # Check for email template match
                            email_match = email_template_matcher.find_matching_template(
                                sender, subject
                            )
                            
                            # Create document metadata
                            document_data = {
                                'id': f"{email_doc_id}_{i}",
                                'filename': attachment['filename'],
                                'user_id': user.sub,
                                'extracted_data': extraction_result['extracted_data'],
                                'template_match': extraction_result.get('template_match'),
                                'email_template_match': email_match,
                                'confidence_score': extraction_result.get('confidence_score', 0),
                                'processing_notes': extraction_result.get('notes', ''),
                                'email_metadata': {
                                    'sender': sender,
                                    'subject': subject,
                                    'received_date': received_date,
                                    'email_doc_id': email_doc_id
                                },
                                'source': 'imap_email',
                                'created_at': datetime.now().isoformat()
                            }
                            
                            # Store processed document
                            store_processed_document(
                                source="email",
                                original_filename=attachment['filename'],
                                template_id=extraction_result.get('template_match', {}).get('template_id'),
                                template_name=extraction_result.get('template_match', {}).get('template_name'),
                                extracted_data=extraction_result['extracted_data'],
                                raw_text=extraction_result.get('raw_text', ''),
                                user_id=user.sub,
                                user_email=user.email if hasattr(user, 'email') else 'unknown@example.com',
                                pdf_storage_key=pdf_key,
                                email_sender=sender,
                                email_subject=subject,
                                email_received_date=received_date,
                                email_address="emailparser@digitool.no"
                            )
                            
                            print(f"Processed PDF: {attachment['filename']} from email {email_doc_id}")
                            
                        except Exception as e:
                            print(f"Error processing PDF {attachment['filename']}: {str(e)}")
                            # Update email doc with error
                            email_doc['status'] = 'error'
                            email_doc['error_message'] = f"Error processing {attachment['filename']}: {str(e)}"
                    
                    # Update email document status
                    if email_doc['status'] != 'error':
                        email_doc['status'] = 'completed'
                    
                    db.storage.json.put(
                        sanitize_storage_key(f"email_doc_{user.sub}_{email_doc_id}"),
                        email_doc
                    )
                    
                    processed_documents.append(ImapEmailDocument(**email_doc))
                    
                # Mark email as read
                mail.store(msg_id, '+FLAGS', '\\Seen')
                
            except Exception as e:
                print(f"Error processing email {msg_id}: {str(e)}")
                continue
        
        # Close connection
        mail.close()
        mail.logout()
        
        # Update status
        status_data = db.storage.json.get(f"imap_email_status_{user.sub}", default={
            "total_processed": 0,
            "enabled": True
        })
        status_data['last_check'] = datetime.now().isoformat()
        status_data['total_processed'] = status_data.get('total_processed', 0) + new_emails_count
        db.storage.json.put(f"imap_email_status_{user.sub}", status_data)
        
        return ImapEmailCheckResponse(
            message=f"Processed {new_emails_count} emails with PDF attachments",
            new_emails_count=new_emails_count,
            processed_documents=processed_documents
        )
        
    except Exception as e:
        print(f"Error checking IMAP emails: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking IMAP emails: {str(e)}")
