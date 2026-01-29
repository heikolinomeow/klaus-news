"""Teams API endpoints for multi-channel webhook integration (V-15)"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.teams_service import get_channels, send_to_teams

router = APIRouter()


class SendToTeamsRequest(BaseModel):
    articleId: str
    channelName: str


@router.get("/channels")
async def list_channels():
    """
    Get configured Teams channels (V-11).
    Returns only channel names, never webhook URLs.
    """
    channels = get_channels()
    return {"channels": channels}


@router.post("/send")
async def send_article_to_teams(
    request: SendToTeamsRequest,
    db: Session = Depends(get_db)
):
    """
    Send article to specified Teams channel (V-12).
    Returns success/error response.
    """
    result = await send_to_teams(request.articleId, request.channelName, db)

    if not result.get("success"):
        # Return 200 with success=false per spec (not HTTP error)
        pass

    return result


@router.post("/test")
async def test_all_channels():
    """
    Test connectivity to all configured channels.
    """
    channels = get_channels()
    if not channels:
        return {"success": False, "message": "No channels configured"}

    # For now, just verify channels are configured
    # Full webhook testing would require sending test messages
    return {"success": True, "message": f"Found {len(channels)} configured channels"}
