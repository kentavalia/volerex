from fastapi import APIRouter, HTTPException, UploadFile, Form, Depends
from pydantic import BaseModel
from typing import Optional # Added Optional
import openai
import pdfplumber
import re
import io
import json
from app.auth import AuthorizedUser
# Attempt to import from template_manager - this relies on PYTHONPATH including src/
# and template_manager being an importable module/package structure.
# If direct import causes issues, we'll use db.storage.json.get directly later.
from app.apis.template_manager.__init__ import PdfTemplate, TargetField, TEMPLATES_STORAGE_KEY as TEMPLATE_MANAGER_STORAGE_KEY
from app.libs.document_processor import store_processed_document, sanitize_storage_key as lib_sanitize_storage_key

# Initialize OpenAI client
# Make sure to request the OPENAI_API_KEY from the user and store it as a secret
try:
    client = openai.OpenAI(api_key=db.secrets.get("OPENAI_API_KEY"))
except Exception as e:
    print(f"Error initializing OpenAI client: {e}. OPENAI_API_KEY might be missing.")
    client = None

router = APIRouter(
    prefix="/pdf-parser", 
    tags=["PDF Parser"]
)

class ExtractedField(BaseModel):
    field_name: str
    value: str | None
    confidence: float | None = None

class ExtractionResponse(BaseModel):
    message: str
    file_name: str
    extracted_data: list[ExtractedField] | None = None
    raw_text_sample: str | None = None # First N characters of raw text for preview


def sanitize_storage_key(key: str) -> str:
    """Sanitize storage key to only allow alphanumeric and ._- symbols"""
    return re.sub(r'[^a-zA-Z0-9._-]', '', key)

@router.get("/test-auth")
async def test_auth_endpoint(user: AuthorizedUser):
    return {"message": "Auth test successful", "user_id": user.sub}

@router.post("/extract-data", response_model=ExtractionResponse)
async def extract_data_from_pdf(user: AuthorizedUser, file: UploadFile, template_id: Optional[str] = Form(None)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are accepted.")

    try:
        pdf_content = await file.read()
        
        raw_text = ""
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    raw_text += page_text + "\n"
        
        raw_text_sample = raw_text[:500] # Get a sample for the response

        if not client:
            raise HTTPException(status_code=500, detail="OpenAI client not initialized. API key may be missing.")

        chosen_template: Optional[PdfTemplate] = None
        if template_id:
            try:
                # Fetch the specific template using its ID directly from storage
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
                json_schema_fields += f'\"{field.field_name}\": \"string or number or array or null\"' # Broad type for schema
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
        prompt_parts.append(raw_text[:4000]) # Limit text sent to OpenAI for performance/cost
        prompt_parts.append("--- END TEXT ---")
        
        final_prompt = "\n".join(prompt_parts)

        # Log the final prompt for debugging (optional, can be verbose)
        # print(f"\nFinal prompt being sent to OpenAI:\n{final_prompt}\n")

        extracted_fields = []
        try:
            print("Sending request to OpenAI...")
            completion = client.chat.completions.create(
                model="gpt-4o-mini", # Using a cost-effective and capable model
                messages=[
                    {"role": "system", "content": "You are an AI assistant that extracts structured data from text and returns it as a valid JSON object according to the user's instructions."},
                    {"role": "user", "content": final_prompt}
                ],
                response_format={"type": "json_object"} # Enable JSON mode
            )
            
            if completion.choices and completion.choices[0].message and completion.choices[0].message.content:
                extracted_json_str = completion.choices[0].message.content
                print(f"Received from OpenAI: {extracted_json_str}")
                
                # Attempt to parse the JSON string from OpenAI
                try:
                    data = json.loads(extracted_json_str)
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON from OpenAI: {e}")
                    raise HTTPException(status_code=500, detail="Failed to decode JSON response from AI model.")

                # This part needs to be adapted based on the actual JSON structure returned by OpenAI
                # For now, we'll iterate through top-level keys as an example.
                if chosen_template and chosen_template.target_fields:
                    # If a template was used, try to map directly from its fields
                    for field_template in chosen_template.target_fields:
                        value = data.get(field_template.field_name)
                        extracted_fields.append(ExtractedField(field_name=field_template.field_name, value=str(value) if value is not None else None))
                    if not extracted_fields and data:
                         extracted_fields.append(ExtractedField(field_name="AI_Extraction_Note", value="Template was used, AI returned data, but no template fields matched the AI response keys directly. Raw AI JSON might be available in logs or if parsing is adjusted."))
                else:
                    # Generic extraction: iterate through AI's response keys
                    for key, value in data.items():
                        if isinstance(value, list) and key.lower() == "items": # Handle items list separately
                            for i, item_obj in enumerate(value):
                                if isinstance(item_obj, dict):
                                    for sub_key, sub_value in item_obj.items():
                                        extracted_fields.append(ExtractedField(field_name=f"Item_{i+1}_{sub_key}", value=str(sub_value) if sub_value is not None else None))
                                else:
                                    extracted_fields.append(ExtractedField(field_name=f"Item_{i+1}", value=str(item_obj) if item_obj is not None else None))
                        elif isinstance(value, (dict, list)):
                            extracted_fields.append(ExtractedField(field_name=key, value=json.dumps(value) if value is not None else None))
                        else:
                            extracted_fields.append(ExtractedField(field_name=key, value=str(value) if value is not None else None))
                
                if not extracted_fields and data: # If data was returned but not mapped
                     extracted_fields.append(ExtractedField(field_name="AI_Extraction_Status", value="Completed, AI returned data, but it was not mapped to the expected structure. Check raw AI response."))
                elif not extracted_fields: # No data and no fields
                     extracted_fields.append(ExtractedField(field_name="AI_Extraction_Status", value="Completed, but AI did not return any extractable data fields."))

            else:
                print("OpenAI response was empty or not as expected.")
                raise HTTPException(status_code=500, detail="AI model returned an empty or unexpected response.")

        except openai.APIError as e:
            print(f"OpenAI API Error: {e}")
            # Consider more specific error handling based on e.status_code if needed
            raise HTTPException(status_code=503, detail=f"OpenAI API error: {str(e)}") # 503 Service Unavailable
        except Exception as e:
            print(f"An unexpected error occurred during AI processing: {e}")
            import traceback
            traceback.print_exc()
            # Keep the original exception type if it's an HTTPException, otherwise wrap it
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred during AI processing: {str(e)}")

        # Store the PDF file for later reference
        sanitized_filename = lib_sanitize_storage_key(file.filename)
        pdf_storage_key = f"processed_pdfs.{lib_sanitize_storage_key(user.sub)}.{sanitized_filename}"
        db.storage.binary.put(pdf_storage_key, pdf_content)
        
        # Convert extracted fields to dictionary format
        extracted_data = {}
        for field in extracted_fields:
            extracted_data[field.field_name] = field.value
        
        # Store in unified processed documents system
        template_name = chosen_template.name if chosen_template else None
        document_id = store_processed_document(
            source="file_upload",
            original_filename=file.filename,
            template_id=template_id,
            template_name=template_name,
            extracted_data=extracted_data,
            raw_text=raw_text,
            user_id=user.sub,
            user_email=user.email if hasattr(user, 'email') else 'unknown@example.com',
            pdf_storage_key=pdf_storage_key
        )
        
        print(f"Stored processed document with ID: {document_id}")

        return ExtractionResponse(
            message="File processed and data extracted by AI.",
            file_name=file.filename,
            extracted_data=extracted_fields,
            raw_text_sample=raw_text_sample
        )

    except HTTPException as e:
        raise e # Re-raise HTTPExceptions to be handled by FastAPI
    except openai.APIError as e:
        print(f"OpenAI API Error during PDF processing: {e}")
        raise HTTPException(status_code=503, detail=f"OpenAI API error: {e}") # 503 Service Unavailable for OpenAI issues
    except Exception as e:
        print(f"Unexpected error processing PDF {file.filename}: {e}")
        import traceback
        traceback.print_exc() # Print full traceback for unexpected errors
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
