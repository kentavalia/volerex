from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import imaplib
from datetime import datetime
from app.auth import AuthorizedUser

router = APIRouter(prefix="/config", tags=["Configuration"])

class EmailConfigUpdate(BaseModel):
    """Model for updating email configuration"""
    imap_server: str
    username: str
    password: str
    port: Optional[int] = 993
    use_ssl: bool = True
    enabled: bool = True

class EmailConfigResponse(BaseModel):
    """Model for email configuration response (without password)"""
    imap_server: Optional[str] = None
    username: Optional[str] = None
    port: int = 993
    use_ssl: bool = True
    enabled: bool = True
    is_configured: bool = False
    last_test: Optional[str] = None
    test_status: Optional[str] = None

class TestConnectionRequest(BaseModel):
    """Model for testing email connection"""
    imap_server: str
    username: str
    password: str
    port: Optional[int] = 993
    use_ssl: bool = True

class TestConnectionResponse(BaseModel):
    """Model for test connection response"""
    success: bool
    message: str
    details: Optional[str] = None

@router.get("/email", response_model=EmailConfigResponse)
async def get_email_config(user: AuthorizedUser):
    """Get current email configuration (without sensitive data)"""
    try:
        # Get configuration from secrets
        imap_server = db.secrets.get("EMAIL_IMAP_SERVER")
        username = db.secrets.get("EMAIL_USERNAME")
        password = db.secrets.get("EMAIL_PASSWORD")
        
        # Get additional config from storage
        config_data = db.storage.json.get("email_config", default={})
        
        is_configured = bool(imap_server and username and password)
        
        return EmailConfigResponse(
            imap_server=imap_server,
            username=username,
            port=config_data.get("port", 993),
            use_ssl=config_data.get("use_ssl", True),
            enabled=config_data.get("enabled", True),
            is_configured=is_configured,
            last_test=config_data.get("last_test"),
            test_status=config_data.get("test_status")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting email config: {str(e)}")

@router.put("/email", response_model=EmailConfigResponse)
async def update_email_config(config: EmailConfigUpdate, user: AuthorizedUser):
    """Update email configuration"""
    try:
        # Store sensitive data in secrets
        db.secrets.put("EMAIL_IMAP_SERVER", config.imap_server)
        db.secrets.put("EMAIL_USERNAME", config.username)
        db.secrets.put("EMAIL_PASSWORD", config.password)
        
        # Store non-sensitive configuration
        config_data = {
            "port": config.port,
            "use_ssl": config.use_ssl,
            "enabled": config.enabled,
            "updated_by": user.sub,
            "updated_at": datetime.now().isoformat()
        }
        db.storage.json.put("email_config", config_data)
        
        print(f"Email configuration updated by user {user.sub}")
        
        return EmailConfigResponse(
            imap_server=config.imap_server,
            username=config.username,
            port=config.port,
            use_ssl=config.use_ssl,
            enabled=config.enabled,
            is_configured=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating email config: {str(e)}")

@router.post("/email/test", response_model=TestConnectionResponse)
async def test_email_connection(test_config: TestConnectionRequest, user: AuthorizedUser):
    """Test email connection with provided settings"""
    try:
        print(f"Testing email connection to {test_config.imap_server} for {test_config.username}")
        
        # Attempt to connect to IMAP server
        if test_config.use_ssl:
            mail = imaplib.IMAP4_SSL(test_config.imap_server, test_config.port)
        else:
            mail = imaplib.IMAP4(test_config.imap_server, test_config.port)
        
        # Try to login
        mail.login(test_config.username, test_config.password)
        
        # Try to select inbox
        status, messages = mail.select('inbox')
        if status != 'OK':
            raise Exception(f"Failed to select inbox: {status}")
        
        # Get inbox info
        inbox_count = len(messages[0].split()) if messages[0] else 0
        
        # Close connection
        mail.close()
        mail.logout()
        
        # Update test status in storage
        config_data = db.storage.json.get("email_config", default={})
        config_data.update({
            "last_test": datetime.now().isoformat(),
            "test_status": "success"
        })
        db.storage.json.put("email_config", config_data)
        
        print(f"Email connection test successful. Inbox has {inbox_count} messages.")
        
        return TestConnectionResponse(
            success=True,
            message=f"Connection successful! Inbox contains {inbox_count} messages.",
            details=f"Successfully connected to {test_config.imap_server} as {test_config.username}"
        )
        
    except imaplib.IMAP4.error as e:
        error_msg = f"IMAP error: {str(e)}"
        print(f"Email connection test failed: {error_msg}")
        
        # Update test status in storage
        config_data = db.storage.json.get("email_config", default={})
        config_data.update({
            "last_test": datetime.now().isoformat(),
            "test_status": "failed"
        })
        db.storage.json.put("email_config", config_data)
        
        return TestConnectionResponse(
            success=False,
            message="Connection failed",
            details=error_msg
        )
        
    except Exception as e:
        error_msg = f"Connection error: {str(e)}"
        print(f"Email connection test failed: {error_msg}")
        
        # Update test status in storage
        config_data = db.storage.json.get("email_config", default={})
        config_data.update({
            "last_test": datetime.now().isoformat(),
            "test_status": "failed"
        })
        db.storage.json.put("email_config", config_data)
        
        return TestConnectionResponse(
            success=False,
            message="Connection failed",
            details=error_msg
        )

@router.delete("/email")
async def clear_email_config(user: AuthorizedUser):
    """Clear email configuration"""
    try:
        # Clear secrets
        try:
            db.secrets.delete("EMAIL_IMAP_SERVER")
            db.secrets.delete("EMAIL_USERNAME")
            db.secrets.delete("EMAIL_PASSWORD")
        except Exception:
            pass  # Secrets might not exist
        
        # Clear storage config
        db.storage.json.put("email_config", {})
        
        print(f"Email configuration cleared by user {user.sub}")
        
        return {"message": "Email configuration cleared successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing email config: {str(e)}")
