import pdfplumber
from io import BytesIO
from typing import Dict, Any
from openai import OpenAI
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/pdf")

class PDFExtractionResponse(BaseModel):
    extracted_data: Dict[str, Any]
    template_id: str = None
    template_name: str = "Ukjent mal"
    success: bool
    message: str

@router.post("/extract", response_model=PDFExtractionResponse)
async def extract_data_from_pdf(file: UploadFile = File(...)):
    """Extract data from uploaded PDF using AI"""
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Read file content
        content = await file.read()
        
        # Process with existing logic
        result = extract_data_from_pdf_bytes(content, file.filename)
        
        return PDFExtractionResponse(
            extracted_data=result.get("extracted_data", {}),
            template_id=result.get("template_id"),
            template_name=result.get("template_name", "Ukjent mal"),
            success=True,
            message="PDF processed successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

def extract_data_from_pdf_bytes(pdf_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Extract data from PDF bytes using AI and template matching"""
    try:
        # Extract text from PDF
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        
        if not text.strip():
            raise Exception("No text found in PDF")
        
        # Use AI to extract structured data
        extracted_data = extract_structured_data_with_ai(text, filename)
        
        # Try to match against existing templates
        template_match = match_against_templates(extracted_data)
        
        return {
            "extracted_data": extracted_data,
            "template_id": template_match.get("template_id"),
            "template_name": template_match.get("template_name", "Ukjent mal"),
            "raw_text": text[:1000]  # Store first 1000 chars for debugging
        }
        
    except Exception as e:
        raise Exception(f"PDF processing failed: {str(e)}")

def extract_structured_data_with_ai(text: str, filename: str) -> Dict[str, Any]:
    """Use OpenAI to extract structured data from text"""
    try:
        client = OpenAI(api_key=db.secrets.get("OPENAI_API_KEY"))
        
        prompt = f"""
Du er en ekspert på å trekke ut strukturert informasjon fra PDF-dokumenter med bestillinger og oppdrag.

Dokument: {filename}

Tekst fra PDF:
{text}

Oppgave: Trekk ut all relevant bestillingsinformasjon og strukturer det som JSON.

Søk etter følgende informasjon (bruk null hvis ikke funnet):
- Oppdragsgiver/kunde navn
- Ansvarlig person
- Bestillingsnummer/referanse
- Prosjektnavn
- Beskrivelse av arbeid/tjenester
- Adresse/leveringssted
- Frist/dato
- Kontaktinformasjon
- Beløp/pris (hvis nevnt)
- Andre relevante detaljer

Returner kun gyldig JSON uten forklaringer:"""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Du er en ekspert på å trekke ut strukturert data fra dokumenter. Returner alltid gyldig JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        # Parse AI response
        ai_response = response.choices[0].message.content.strip()
        
        # Clean up response to ensure valid JSON
        if ai_response.startswith('```json'):
            ai_response = ai_response[7:]
        if ai_response.endswith('```'):
            ai_response = ai_response[:-3]
        
        try:
            extracted_data = json.loads(ai_response)
        except json.JSONDecodeError:
            # Fallback: create basic structure
            extracted_data = {
                "Beskrivelse": text[:200] + "..." if len(text) > 200 else text,
                "Dokument": filename
            }
        
        return extracted_data
        
    except Exception as e:
        print(f"Error extracting data with AI: {e}")
        # Fallback response
        return {
            "Beskrivelse": text[:200] + "..." if len(text) > 200 else text,
            "Dokument": filename,
            "error": str(e)
        }

def match_against_templates(extracted_data: Dict[str, Any]) -> Dict[str, str]:
    """Try to match extracted data against existing templates"""
    try:
        # Load existing templates
        from app.apis.template_manager import TEMPLATES_STORAGE_KEY
        templates_dict = db.storage.json.get(TEMPLATES_STORAGE_KEY, default={})
        
        if not templates_dict:
            return {"template_id": None, "template_name": "Ingen mal"}
        
        # Simple keyword-based matching
        best_match = None
        best_score = 0
        
        # Create searchable text from extracted data
        search_text = ' '.join(str(v) for v in extracted_data.values() if v).lower()
        
        for template_id, template_data in templates_dict.items():
            template_name = template_data.get('name', '').lower()
            score = 0
            
            # Check if template name appears in extracted data
            if template_name in search_text:
                score += 10
            
            # Check field overlap
            template_fields = [field.get('field_name', '') for field in template_data.get('target_fields', [])]
            matching_fields = sum(1 for field in template_fields if field in extracted_data)
            score += matching_fields * 2
            
            if score > best_score:
                best_score = score
                best_match = {
                    "template_id": template_id,
                    "template_name": template_data.get('name', 'Ukjent mal')
                }
        
        return best_match or {"template_id": None, "template_name": "Ingen mal"}
        
    except Exception as e:
        print(f"Error matching templates: {e}")
        return {"template_id": None, "template_name": "Ingen mal"}
