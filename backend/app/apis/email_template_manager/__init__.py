from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.auth import AuthorizedUser

router = APIRouter(prefix="/email-templates", tags=["Email Templates"])

# Storage key for email templates (separate from PDF templates)
EMAIL_TEMPLATES_STORAGE_KEY = "email_templates"

class EmailMatchingCriteria(BaseModel):
    """Criteria for matching emails to templates"""
    sender_domains: List[str] = []  # e.g., ["@statsbygg.no", "@oslobygg.no"]
    sender_emails: List[str] = []   # e.g., ["bestilling@statsbygg.no"]
    subject_keywords: List[str] = [] # e.g., ["bestilling", "oppdrag", "ordre"]
    required_words: List[str] = []   # Words that must appear in email content
    excluded_words: List[str] = []   # Words that disqualify the email

class EmailExtractionField(BaseModel):
    """Field to extract from email content"""
    id: Optional[str] = None
    field_name: str  # e.g., "Oppdragsgiver", "Kontaktperson"
    ai_hint: Optional[str] = None  # Hint for AI extraction
    required: bool = False  # Whether this field is mandatory
    validation_pattern: Optional[str] = None  # Regex pattern for validation

class EmailTemplate(BaseModel):
    """Template for processing email orders/requests"""
    id: Optional[str] = None
    name: str  # e.g., "Statsbygg E-post Bestilling"
    description: Optional[str] = None
    template_type: str = "email"  # Always "email" to distinguish from PDF templates
    
    # Matching criteria
    matching_criteria: EmailMatchingCriteria
    
    # Fields to extract
    extraction_fields: List[EmailExtractionField]
    
    # Template metadata
    created_date: Optional[str] = None
    updated_date: Optional[str] = None
    created_by: Optional[str] = None
    is_active: bool = True
    usage_count: int = 0  # How many emails have been processed with this template

class EmailTemplateCreate(BaseModel):
    """Schema for creating new email template"""
    name: str
    description: Optional[str] = None
    matching_criteria: EmailMatchingCriteria
    extraction_fields: List[EmailExtractionField]

class EmailTemplateUpdate(BaseModel):
    """Schema for updating email template"""
    name: Optional[str] = None
    description: Optional[str] = None
    matching_criteria: Optional[EmailMatchingCriteria] = None
    extraction_fields: Optional[List[EmailExtractionField]] = None
    is_active: Optional[bool] = None

class EmailTemplateMatchResult(BaseModel):
    """Result of matching an email against templates"""
    template_id: str
    template_name: str
    confidence_score: float  # 0.0 to 1.0
    match_reasons: List[str]  # Why this template was matched
    auto_processable: bool  # Whether confidence is high enough for auto-processing

@router.get("/", response_model=List[EmailTemplate])
async def list_email_templates(user: AuthorizedUser):
    """List all email templates"""
    try:
        templates_dict = db.storage.json.get(EMAIL_TEMPLATES_STORAGE_KEY, default={})
        templates = list(templates_dict.values())
        
        # Sort by name
        templates.sort(key=lambda x: x.get('name', '').lower())
        
        return [EmailTemplate(**template) for template in templates]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing email templates: {str(e)}")

@router.post("/", response_model=EmailTemplate)
async def create_email_template(template_data: EmailTemplateCreate, user: AuthorizedUser):
    """Create a new email template"""
    try:
        # Generate unique ID
        template_id = str(uuid.uuid4())
        
        # Generate IDs for extraction fields
        for field in template_data.extraction_fields:
            if not field.id:
                field.id = str(uuid.uuid4())
        
        # Create template object
        template = EmailTemplate(
            id=template_id,
            name=template_data.name,
            description=template_data.description,
            matching_criteria=template_data.matching_criteria,
            extraction_fields=template_data.extraction_fields,
            created_date=datetime.now().isoformat(),
            updated_date=datetime.now().isoformat(),
            created_by=user.sub,
            is_active=True,
            usage_count=0
        )
        
        # Load existing templates
        templates_dict = db.storage.json.get(EMAIL_TEMPLATES_STORAGE_KEY, default={})
        
        # Add new template
        templates_dict[template_id] = template.dict()
        
        # Save back to storage
        db.storage.json.put(EMAIL_TEMPLATES_STORAGE_KEY, templates_dict)
        
        return template
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating email template: {str(e)}")

@router.get("/_{template_id}", response_model=EmailTemplate)
async def get_email_template(template_id: str, user: AuthorizedUser):
    """Get specific email template by ID"""
    try:
        templates_dict = db.storage.json.get(EMAIL_TEMPLATES_STORAGE_KEY, default={})
        
        if template_id not in templates_dict:
            raise HTTPException(status_code=404, detail="Email template not found")
        
        return EmailTemplate(**templates_dict[template_id])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting email template: {str(e)}")

@router.put("/_{template_id}", response_model=EmailTemplate)
async def update_email_template(template_id: str, update_data: EmailTemplateUpdate, user: AuthorizedUser):
    """Update existing email template"""
    try:
        templates_dict = db.storage.json.get(EMAIL_TEMPLATES_STORAGE_KEY, default={})
        
        if template_id not in templates_dict:
            raise HTTPException(status_code=404, detail="Email template not found")
        
        # Get existing template
        existing_template = templates_dict[template_id]
        
        # Update fields if provided
        if update_data.name is not None:
            existing_template['name'] = update_data.name
        if update_data.description is not None:
            existing_template['description'] = update_data.description
        if update_data.matching_criteria is not None:
            existing_template['matching_criteria'] = update_data.matching_criteria.dict()
        if update_data.extraction_fields is not None:
            # Generate IDs for new fields
            for field in update_data.extraction_fields:
                if not field.id:
                    field.id = str(uuid.uuid4())
            existing_template['extraction_fields'] = [field.dict() for field in update_data.extraction_fields]
        if update_data.is_active is not None:
            existing_template['is_active'] = update_data.is_active
            
        # Update timestamp
        existing_template['updated_date'] = datetime.now().isoformat()
        
        # Save back to storage
        templates_dict[template_id] = existing_template
        db.storage.json.put(EMAIL_TEMPLATES_STORAGE_KEY, templates_dict)
        
        return EmailTemplate(**existing_template)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating email template: {str(e)}")

@router.delete("/_{template_id}")
async def delete_email_template(template_id: str, user: AuthorizedUser):
    """Delete email template"""
    try:
        templates_dict = db.storage.json.get(EMAIL_TEMPLATES_STORAGE_KEY, default={})
        
        if template_id not in templates_dict:
            raise HTTPException(status_code=404, detail="Email template not found")
        
        # Remove template
        del templates_dict[template_id]
        
        # Save back to storage
        db.storage.json.put(EMAIL_TEMPLATES_STORAGE_KEY, templates_dict)
        
        return {"message": "Email template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting email template: {str(e)}")

@router.post("/test-match")
async def test_email_template_match(
    template_id: str,
    email_content: str,
    email_subject: str,
    email_sender: str,
    user: AuthorizedUser
):
    """Test how well an email matches against a specific template"""
    try:
        # Get template
        templates_dict = db.storage.json.get(EMAIL_TEMPLATES_STORAGE_KEY, default={})
        if template_id not in templates_dict:
            raise HTTPException(status_code=404, detail="Email template not found")
        
        template = EmailTemplate(**templates_dict[template_id])
        
        # Perform matching logic
        from app.libs.email_template_matcher import EmailTemplateMatcher
        matcher = EmailTemplateMatcher()
        
        match_result = matcher.test_template_match(
            template=template,
            email_content=email_content,
            email_subject=email_subject,
            email_sender=email_sender
        )
        
        return match_result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing template match: {str(e)}")
