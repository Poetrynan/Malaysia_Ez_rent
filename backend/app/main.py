from fastapi import FastAPI, Query, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.agent import agent_stream_router
from app.config import Config
import uvicorn
import jwt

app = FastAPI(
    title="Malaysia Ez Rent AI Agent Service",
    description="Big Tech-compliant ReAct Agent with pgvector and Google Maps integration",
    version="1.0.0"
)

# Configure CORS for Next.js integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[Config.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_supabase_token(request: Request) -> str:
    """Extract and verify Supabase JWT from Authorization header. Returns user_id."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header[7:]
    if not Config.SUPABASE_JWT_SECRET:
        # Fallback: decode without verification (dev/mock only)
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload.get("sub", "")
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

    try:
        payload = jwt.decode(token, Config.SUPABASE_JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub", "")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing user ID")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class ChatRequest(BaseModel):
    query: str

@app.on_event("startup")
def startup_event():
    Config.print_status()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Malaysia Ez Rent AI Agent Brain",
        "mock_mode": not (Config.is_supabase_enabled() and Config.is_openai_enabled())
    }

@app.get("/api/config")
def get_config_status():
    return {
        "supabase_connected": Config.is_supabase_enabled(),
        "openai_available": Config.is_openai_enabled(),
        "tavily_available": Config.is_tavily_enabled(),
        "google_maps_available": Config.is_google_maps_enabled()
    }

@app.post("/api/embeddings/sync")
def sync_embeddings(user_id: str = Depends(verify_supabase_token)):
    """
    Direct endpoint to trigger immediate generation of embeddings for units missing them.
    """
    from app.tools import sync_missing_embeddings
    try:
        count = sync_missing_embeddings()
        return {
            "status": "ok",
            "synced_count": count,
            "message": f"Successfully synced {count} unit(s)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_post(body: ChatRequest, user_id: str = Depends(verify_supabase_token)):
    """
    POST route to trigger the streaming ReAct loop.
    Returns standard Event-Stream (SSE).
    """
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    return StreamingResponse(
        agent_stream_router(body.query, user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/chat")
async def chat_get(
    query: str = Query(..., description="User question or preferences"),
    user_id: str = Depends(verify_supabase_token),
):
    """
    GET route to trigger the streaming ReAct loop.
    Useful for native EventSource client consumption in frontend.
    """
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    return StreamingResponse(
        agent_stream_router(query, user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
