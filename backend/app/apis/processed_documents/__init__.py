from fastapi import APIRouter, HTTPException, UploadFile, File
from app.auth import AuthorizedUser
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

router = APIRouter()

class ProcessedDocument(BaseModel):
    id: str
    source: str  # 'file_upload' or 'email'
    original_filename: str
    template_id: Optional[str] = None
    template_name: Optional[str] = None
    extracted_data: Dict[str, Any]
    raw_text: Optional[str] = None
    processed_date: str
    status: str  # 'processed', 'exported', 'corrected'
    user_id: str
    user_email: str
    # Source-specific fields
    email_sender: Optional[str] = None
    email_subject: Optional[str] = None
    email_received_date: Optional[str] = None
    email_address: Optional[str] = None  # Which email address received it: mottak@digitool.no or emailparser@digitool.no
    # File storage references
    pdf_storage_key: Optional[str] = None  # Reference to original PDF in storage
    corrections: Optional[Dict[str, Any]] = None  # User corrections
    export_count: int = 0
    last_exported_date: Optional[str] = None

class DocumentFilter(BaseModel):
    source: Optional[str] = None  # 'file_upload', 'email', or None for all
    status: Optional[str] = None  # 'processed', 'exported', 'corrected', or None for all
    template_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    user_id: Optional[str] = None

class UpdateDocumentRequest(BaseModel):
    extracted_data: Dict[str, Any]
    corrections: Optional[Dict[str, Any]] = None

class BatchExportRequest(BaseModel):
    document_ids: List[str]

@router.get("/list")
def list_processed_documents(filters: Optional[DocumentFilter] = None) -> List[ProcessedDocument]:
    """
    Get all processed documents with optional filtering
    """
    try:
        # Get all processed documents from storage
        all_docs = db.storage.json.get("processed_documents", default=[])
        
        # Apply filters if provided
        if filters:
            filtered_docs = []
            for doc in all_docs:
                # Apply source filter
                if filters.source and doc.get('source') != filters.source:
                    continue
                # Apply status filter
                if filters.status and doc.get('status') != filters.status:
                    continue
                # Apply template filter
                if filters.template_id and doc.get('template_id') != filters.template_id:
                    continue
                # Apply date filters (simplified - could be enhanced)
                if filters.start_date or filters.end_date:
                    doc_date = doc.get('processed_date', '')
                    if filters.start_date and doc_date < filters.start_date:
                        continue
                    if filters.end_date and doc_date > filters.end_date:
                        continue
                # Apply user filter
                if filters.user_id and doc.get('user_id') != filters.user_id:
                    continue
                    
                filtered_docs.append(doc)
            
            return [ProcessedDocument(**doc) for doc in filtered_docs]
        
        return [ProcessedDocument(**doc) for doc in all_docs]
        
    except Exception as e:
        print(f"Error listing processed documents: {e}")
        return []

@router.get("/get/{document_id}")
def get_processed_document(document_id: str) -> ProcessedDocument:
    """
    Get a specific processed document by ID
    """
    try:
        all_docs = db.storage.json.get("processed_documents", default=[])
        doc = next((d for d in all_docs if d.get('id') == document_id), None)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
            
        return ProcessedDocument(**doc)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/update/{document_id}")
def update_processed_document(document_id: str, update_data: UpdateDocumentRequest) -> ProcessedDocument:
    """
    Update extracted data for a processed document
    """
    try:
        all_docs = db.storage.json.get("processed_documents", default=[])
        doc_index = next((i for i, d in enumerate(all_docs) if d.get('id') == document_id), None)
        
        if doc_index is None:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update the document
        all_docs[doc_index]['extracted_data'] = update_data.extracted_data
        all_docs[doc_index]['corrections'] = update_data.corrections
        all_docs[doc_index]['status'] = 'corrected'
        
        # Save back to storage
        db.storage.json.put("processed_documents", all_docs)
        
        return ProcessedDocument(**all_docs[doc_index])
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/export-batch")
def export_batch_documents(request: BatchExportRequest):
    """
    Export multiple documents to Excel with template-based structure
    """
    try:
        import pandas as pd
        from io import BytesIO
        
        all_docs = db.storage.json.get("processed_documents", default=[])
        selected_docs = [doc for doc in all_docs if doc.get('id') in request.document_ids]
        
        if not selected_docs:
            raise HTTPException(status_code=404, detail="No documents found")
        
        # Validate all documents use the same template
        template_ids = set()
        template_names = set()
        for doc in selected_docs:
            template_id = doc.get('template_id')
            template_name = doc.get('template_name', 'Ingen mal')
            template_ids.add(template_id)
            template_names.add(template_name)
        
        if len(template_ids) > 1:
            raise HTTPException(
                status_code=400, 
                detail="Kan ikke eksportere dokumenter med forskjellige maler. Velg kun dokumenter som bruker samme mal."
            )
        
        template_id = list(template_ids)[0] if template_ids else None
        template_name = list(template_names)[0] if template_names else 'Ingen mal'
        
        # Get template fields for consistent column structure
        template_fields = []
        if template_id:
            try:
                from app.apis.template_manager import TEMPLATES_STORAGE_KEY
                templates_dict = db.storage.json.get(TEMPLATES_STORAGE_KEY, default={})
                if template_id in templates_dict:
                    template_data = templates_dict[template_id]
                    target_fields = template_data.get('target_fields', [])
                    template_fields = [field.get('field_name') for field in target_fields if field.get('field_name')]
            except Exception as e:
                print(f"Error loading template fields: {e}")
        
        # If no template fields found, fall back to unique fields from documents
        if not template_fields:
            all_field_names = set()
            for doc in selected_docs:
                corrections = doc.get('corrections')
                if corrections is not None:
                    data_to_export = corrections
                else:
                    data_to_export = doc.get('extracted_data', {})
                if isinstance(data_to_export, dict):
                    all_field_names.update(data_to_export.keys())
            template_fields = sorted(list(all_field_names))
        
        # Prepare data for Excel export
        export_data = []
        
        for doc in selected_docs:
            # Use corrected data if available, otherwise use original extracted data
            corrections = doc.get('corrections')
            if corrections is not None:
                data_to_export = corrections
            else:
                data_to_export = doc.get('extracted_data', {})
            
            # Start with document metadata columns
            row = {
                'Document ID': doc.get('id'),
                'Filename': doc.get('original_filename', ''),
                'Processed Date': doc.get('processed_date', ''),
                'Export Count': doc.get('export_count', 0),
                'Last Exported': doc.get('last_exported_date', ''),
            }
            
            # Add template-specific field columns in alphabetical order
            if isinstance(data_to_export, dict):
                for field_name in sorted(template_fields):
                    row[field_name] = data_to_export.get(field_name, '')
            
            export_data.append(row)
        
        # Create DataFrame and Excel file
        df = pd.DataFrame(export_data)
        
        # Save to BytesIO buffer
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Use template name in sheet name
            sheet_name = f"{template_name}" if len(template_name) <= 31 else template_name[:31]
            df.to_excel(writer, index=False, sheet_name=sheet_name)
        
        # Store the Excel file with template name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        template_safe = template_name.replace(' ', '_').replace('/', '_')[:20]
        filename = f"export_{template_safe}_{timestamp}.xlsx"
        
        db.storage.binary.put(f"exports.{filename}", buffer.getvalue())
        
        # Update export status for the documents
        for doc in all_docs:
            if doc.get('id') in request.document_ids:
                doc['status'] = 'exported' if doc.get('status') == 'processed' else doc.get('status')
                doc['export_count'] = doc.get('export_count', 0) + 1
                doc['last_exported_date'] = datetime.now().isoformat()
        
        db.storage.json.put("processed_documents", all_docs)
        
        return {
            "message": f"Successfully exported {len(selected_docs)} documents using template '{template_name}'",
            "filename": filename,
            "document_count": len(selected_docs),
            "template_name": template_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error exporting batch documents: {e}")
        raise HTTPException(status_code=500, detail="Export failed")

@router.get("/download-pdf/{document_id}")
def download_document_pdf(document_id: str):
    """
    Download the original PDF for a processed document
    """
    try:
        all_docs = db.storage.json.get("processed_documents", default=[])
        doc = next((d for d in all_docs if d.get('id') == document_id), None)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        pdf_key = doc.get('pdf_storage_key')
        if not pdf_key:
            raise HTTPException(status_code=404, detail="PDF not available")
        
        # Get PDF from storage
        pdf_data = db.storage.binary.get(pdf_key)
        
        from fastapi.responses import Response
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={doc.get('original_filename', 'document.pdf')}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading PDF for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Download failed")

@router.get("/download-export/{filename}")
def download_export_file(filename: str, user: AuthorizedUser):
    """
    Download an exported Excel file
    """
    try:
        # Validate filename format for security
        if not filename.startswith("export_") or not filename.endswith(".xlsx"):
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        # Get file from storage
        storage_key = f"exports.{filename}"
        try:
            excel_data = db.storage.binary.get(storage_key)
        except:
            raise HTTPException(status_code=404, detail="Export file not found")
        
        from fastapi.responses import Response
        return Response(
            content=excel_data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading export file {filename}: {e}")
        raise HTTPException(status_code=500, detail="Download failed")

@router.delete("/delete/{document_id}")
def delete_processed_document(document_id: str, user: AuthorizedUser):
    """
    Delete a processed document and its associated PDF file
    """
    try:
        all_docs = db.storage.json.get("processed_documents", default=[])
        doc_index = next((i for i, d in enumerate(all_docs) if d.get('id') == document_id), None)
        
        if doc_index is None:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = all_docs[doc_index]
        
        # Delete PDF file from storage if it exists
        pdf_key = document.get('pdf_storage_key')
        if pdf_key:
            try:
                # Check if file exists and delete it
                db.storage.binary.get(pdf_key)  # This will throw if file doesn't exist
                # Since there's no explicit delete in db.storage.binary, we'll just leave the file
                # In a real system, you'd implement proper cleanup
                print(f"PDF file {pdf_key} left in storage (no delete method available)")
            except:
                # File doesn't exist, which is fine
                pass
        
        # Remove document from list
        all_docs.pop(doc_index)
        
        # Save back to storage
        db.storage.json.put("processed_documents", all_docs)
        
        print(f"Document {document_id} deleted by user {user.sub}")
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/delete-batch")
def delete_batch_documents(request: BatchExportRequest, user: AuthorizedUser):
    """
    Delete multiple documents at once
    """
    try:
        all_docs = db.storage.json.get("processed_documents", default=[])
        initial_count = len(all_docs)
        
        # Track which documents were found and deleted
        deleted_count = 0
        pdf_keys_to_cleanup = []
        
        # Filter out documents to delete and collect PDF keys
        remaining_docs = []
        for doc in all_docs:
            if doc.get('id') in request.document_ids:
                deleted_count += 1
                pdf_key = doc.get('pdf_storage_key')
                if pdf_key:
                    pdf_keys_to_cleanup.append(pdf_key)
            else:
                remaining_docs.append(doc)
        
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="No documents found to delete")
        
        # Save the updated document list
        db.storage.json.put("processed_documents", remaining_docs)
        
        # Log PDF cleanup info (since we can't actually delete from storage)
        if pdf_keys_to_cleanup:
            print(f"PDF files left in storage (no delete method): {pdf_keys_to_cleanup}")
        
        print(f"Batch deleted {deleted_count} documents by user {user.sub}")
        
        return {
            "message": f"Successfully deleted {deleted_count} documents",
            "deleted_count": deleted_count,
            "total_requested": len(request.document_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting batch documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

def add_processed_document(doc_data: dict) -> str:
    """
    Helper function to add a new processed document
    Used by other APIs to store processed documents
    """
    try:
        # Generate unique ID
        doc_id = str(uuid.uuid4())
        doc_data['id'] = doc_id
        doc_data['processed_date'] = datetime.now().isoformat()
        doc_data['status'] = 'processed'
        doc_data['export_count'] = 0
        
        # Get existing documents
        all_docs = db.storage.json.get("processed_documents", default=[])
        all_docs.append(doc_data)
        
        # Save back to storage
        db.storage.json.put("processed_documents", all_docs)
        
        return doc_id
        
    except Exception as e:
        print(f"Error adding processed document: {e}")
        raise
