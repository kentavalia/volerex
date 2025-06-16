"""
API for managing PDF extraction templates.
Allows CRUD operations for templates, where each template defines a set of fields
to be extracted from a PDF, along with hints for the AI.
"""
import databutton as db
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
import uuid
from typing import List, Optional

router = APIRouter(prefix="/templates", tags=["Template Management"])

# Storage key for templates
TEMPLATES_STORAGE_KEY = "pdf_extraction_templates"

# --- Pydantic Models ---

class TargetField(BaseModel):
    """A specific field to be extracted as part of a template."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    field_name: str = Field(..., description="The name of the field to extract, e.g., 'Order Number', 'Customer Name'.")
    ai_hint: Optional[str] = Field(None, description="A hint or description for the AI on how to find this field or what it represents.")

class PdfTemplate(BaseModel):
    """Represents an extraction template for a specific PDF structure/type."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="A user-friendly name for this template, e.g., 'Statsbygg Standard Order'.")
    description: Optional[str] = Field(None, description="A more detailed description of the template or the PDF type it targets.")
    target_fields: List[TargetField] = Field(default_factory=list, description="A list of fields to be extracted using this template.")

class PdfTemplateCreate(BaseModel):
    """Schema for creating a new template. ID is generated automatically."""
    name: str = Field(..., description="A user-friendly name for this template.")
    description: Optional[str] = Field(None, description="A more detailed description of the template.")
    target_fields: List[TargetField] = Field(default_factory=list, description="Initial list of fields for this template.")

class PdfTemplateUpdate(BaseModel):
    """Schema for updating an existing template. Fields are optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    target_fields: Optional[List[TargetField]] = None


# --- Helper Functions ---

def get_all_templates() -> List[PdfTemplate]:
    """Retrieves all templates from db.storage."""
    templates_dict = db.storage.json.get(TEMPLATES_STORAGE_KEY, default={})
    return [PdfTemplate(**data) for data in templates_dict.values()]

def save_templates(templates: List[PdfTemplate]):
    """Saves the list of templates to db.storage."""
    templates_dict = {template.id: template.model_dump() for template in templates}
    db.storage.json.put(TEMPLATES_STORAGE_KEY, templates_dict)

# --- API Endpoints ---

# --- API Endpoints ---

@router.post("/", response_model=PdfTemplate, status_code=201)
def create_template(template_data: PdfTemplateCreate = Body(...)):
    """Creates a new PDF extraction template."""
    templates = get_all_templates()
    
    # Check for duplicate names, if desired (optional)
    if any(t.name == template_data.name for t in templates):
        raise HTTPException(status_code=409, detail=f"A template with the name '{template_data.name}' already exists.")

    new_template = PdfTemplate(**template_data.model_dump())
    templates.append(new_template)
    save_templates(templates)
    return new_template

@router.get("/", response_model=List[PdfTemplate])
def list_templates():
    """Lists all available PDF extraction templates."""
    return get_all_templates()

@router.get("/{template_id}", response_model=PdfTemplate)
def get_template(template_id: str):
    """Retrieves a specific template by its ID."""
    templates = get_all_templates()
    found_template = next((t for t in templates if t.id == template_id), None)
    if not found_template:
        raise HTTPException(status_code=404, detail=f"Template with ID '{template_id}' not found.")
    return found_template

@router.put("/{template_id}", response_model=PdfTemplate)
def update_template(template_id: str, template_update_data: PdfTemplateUpdate = Body(...)):
    """Updates an existing template.
    Allows partial updates: only provided fields will be changed.
    """
    templates = get_all_templates()
    template_index = -1
    current_template = None

    for i, t in enumerate(templates):
        if t.id == template_id:
            template_index = i
            current_template = t
            break
    
    if not current_template:
        raise HTTPException(status_code=404, detail=f"Template with ID '{template_id}' not found for update.")

    # Perform the update
    update_data = template_update_data.model_dump(exclude_unset=True)
    
    # If target_fields are being updated, we replace the whole list as per Pydantic model.
    # If you need finer-grained control (e.g., add/remove individual fields), 
    # this endpoint would need to be more complex or have dedicated sub-routes.
    updated_template = current_template.model_copy(update=update_data)
    
    templates[template_index] = updated_template
    save_templates(templates)
    return updated_template

@router.delete("/{template_id}", status_code=204) # 204 No Content for successful deletion
def delete_template(template_id: str):
    """Deletes a template by its ID."""
    templates = get_all_templates()
    initial_length = len(templates)
    
    templates_to_keep = [t for t in templates if t.id != template_id]
    
    if len(templates_to_keep) == initial_length:
        raise HTTPException(status_code=404, detail=f"Template with ID '{template_id}' not found for deletion.")
    
    save_templates(templates_to_keep)
    # No body should be returned for 204
    return
