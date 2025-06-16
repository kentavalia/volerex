from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import databutton as db
from datetime import datetime
from app.auth import AuthorizedUser
import imaplib

router = APIRouter(
    prefix="/email-config",
    tags=["Email Configuration"]
)

class EmailConfigRequest(BaseModel):
    username: str
    password: Optional[str] = None  # Optional for updates
    imap_server: str
    port: int = 993

class EmailConfigResponse(BaseModel):
    is_configured: bool
    username: Optional[str] = None
    imap_server: Optional[str] = None
    port: Optional[int] = None
    last_updated: Optional[str] = None

class EmailConfigTestResponse(BaseModel):
    success: bool
    message: str

@router.get("/", response_model=EmailConfigResponse)
async def get_email_config(user: AuthorizedUser):
    """
    Get current email configuration for the user
    """
    try:
        config_data = db.storage.json.get(f"email_config_{user.sub}", default={})
        
        return EmailConfigResponse(
            is_configured=bool(config_data.get("username") and config_data.get("password") and config_data.get("imap_server")),
            username=config_data.get("username"),
            imap_server=config_data.get("imap_server"),
            port=config_data.get("port", 993),
            last_updated=config_data.get("last_updated")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting email config: {str(e)}")

@router.post("/", response_model=EmailConfigResponse)
async def update_email_config(config: EmailConfigRequest, user: AuthorizedUser):
    """
    Update email configuration for the user
    """
    try:
        # Get existing config to preserve password if not provided
        existing_config = db.storage.json.get(f"email_config_{user.sub}", default={})
        
        config_data = {
            "username": config.username,
            "password": config.password if config.password else existing_config.get("password"),
            "imap_server": config.imap_server,
            "port": config.port,
            "last_updated": datetime.now().isoformat()
        }
        
        # Ensure we have a password (either new or existing)
        if not config_data["password"]:
            raise HTTPException(status_code=400, detail="Password is required for new configurations")
        
        db.storage.json.put(f"email_config_{user.sub}", config_data)
        
        return EmailConfigResponse(
            is_configured=True,
            username=config.username,
            imap_server=config.imap_server,
            port=config.port,
            last_updated=config_data["last_updated"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating email config: {str(e)}")

@router.delete("/")
async def clear_email_config(user: AuthorizedUser):
    """
    Clear email configuration for the user
    """
    try:
        db.storage.json.put(f"email_config_{user.sub}", {})
        return {"message": "Email configuration cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing email config: {str(e)}")

@router.post("/test", response_model=EmailConfigTestResponse)
async def test_email_connection(config: EmailConfigRequest, user: AuthorizedUser):
    """
    Test email connection with provided credentials
    """
    try:
        # Test IMAP connection
        mail = imaplib.IMAP4_SSL(config.imap_server, config.port)
        mail.login(config.username, config.password)
        mail.select('inbox')
        mail.close()
        mail.logout()
        
        return EmailConfigTestResponse(
            success=True,
            message="Connection successful"
        )
    except Exception as e:
        return EmailConfigTestResponse(
            success=False,
            message=f"Connection failed: {str(e)}"
        )
