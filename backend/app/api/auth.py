"""Authentication API endpoints (V-1, V-3, V-4, V-5)"""
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import jwt

from app.config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_at: str


class AuthStatusResponse(BaseModel):
    authenticated: bool
    username: str | None = None


def create_jwt_token(username: str) -> tuple[str, datetime]:
    """Create JWT token with configurable expiry (V-4)"""
    expires_at = datetime.utcnow() + timedelta(hours=settings.auth_session_expiry_hours)
    payload = {
        "sub": username,
        "exp": expires_at,
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, settings.auth_jwt_secret, algorithm="HS256")
    return token, expires_at


def verify_jwt_token(token: str) -> dict | None:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, settings.auth_jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_token_from_request(request: Request) -> str | None:
    """Extract JWT token from Authorization header"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    POST /auth/login - Authenticate user and return JWT (V-1, V-3)

    Accepts username/password, verifies against environment variables,
    returns JWT token on success.
    """
    # Verify credentials against environment variables (V-1, V-2)
    if request.username != settings.auth_username or request.password != settings.auth_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create JWT token (V-4)
    token, expires_at = create_jwt_token(request.username)

    return LoginResponse(
        token=token,
        expires_at=expires_at.isoformat()
    )


@router.post("/logout")
async def logout():
    """
    POST /auth/logout - Optional endpoint, JWT is stateless (V-3)

    Since JWT is stateless, this endpoint is a no-op.
    Client should discard the token.
    """
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=AuthStatusResponse)
async def get_auth_status(request: Request):
    """
    GET /auth/me - Returns authentication status (V-3)
    """
    token = get_token_from_request(request)
    if not token:
        return AuthStatusResponse(authenticated=False)

    payload = verify_jwt_token(token)
    if not payload:
        return AuthStatusResponse(authenticated=False)

    return AuthStatusResponse(
        authenticated=True,
        username=payload.get("sub")
    )
