from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.agent import agent_stream_router
from app.config import Config
import uvicorn

app = FastAPI(
    title="Malaysia Ez Rent AI Agent Service",
    description="Big Tech-compliant ReAct Agent with pgvector and Google Maps integration",
    version="1.0.0"
)

# Configure CORS for Next.js integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to Next.js host domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    user_id: str = "tenant-123"  # Fallback standard mock user id

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

@app.post("/api/chat")
async def chat_post(request: ChatRequest):
    """
    POST route to trigger the streaming ReAct loop.
    Returns standard Event-Stream (SSE).
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    return StreamingResponse(
        agent_stream_router(request.query, request.user_id),
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
    user_id: str = Query("tenant-123", description="Associated user ID")
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
