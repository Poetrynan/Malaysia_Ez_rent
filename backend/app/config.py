import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Supabase config
    SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", os.getenv("SUPABASE_URL", ""))
    SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # AI and Search API keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "")
    
    # Separated Agent LLM API configuration (defaults to Gemini/Agent/OpenAI keys)
    # Using explicit truthy fallbacks to avoid empty string overrides
    AGENT_API_KEY = (
        os.getenv("GEMINI_API_KEY", "").strip() or 
        os.getenv("AGENT_API_KEY", "").strip() or 
        os.getenv("OPENAI_API_KEY", "").strip()
    )
    AGENT_API_BASE = (
        os.getenv("GEMINI_BASE_URL", "").strip() or 
        os.getenv("AGENT_API_BASE", "").strip() or 
        os.getenv("OPENAI_API_BASE", "").strip() or 
        "https://api.openai.com/v1"
    )
    AGENT_MODEL = (
        os.getenv("GEMINI_MODEL", "").strip() or 
        os.getenv("NEXT_PUBLIC_AGENT_MODEL", "").strip() or 
        "gpt-4o-mini"
    )
    
    # Separated Embedding API configuration (defaults to OPENAI_API_KEY and OPENAI_API_BASE)
    EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
    EMBEDDING_API_BASE = (
        os.getenv("EMBEDDING_API_BASE", "").strip() or 
        os.getenv("OPENAI_API_BASE", "").strip() or 
        "https://api.openai.com/v1"
    )
    
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

    # Auth
    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "https://malaysia-ez-rent.vercel.app")
    EXTRA_ORIGINS = os.getenv("EXTRA_ORIGINS", "")  # comma-separated additional allowed origins

    @classmethod
    def get_allowed_origins(cls) -> list:
        """Return list of allowed CORS origins, including the main FRONTEND_URL and any extras."""
        origins = [cls.FRONTEND_URL]
        if cls.EXTRA_ORIGINS:
            for o in cls.EXTRA_ORIGINS.split(","):
                o = o.strip()
                if o:
                    origins.append(o)
        return origins
    
    # Mode selectors
    @classmethod
    def is_supabase_enabled(cls) -> bool:
        return bool(cls.SUPABASE_URL and cls.SUPABASE_ANON_KEY)
        
    @classmethod
    def is_openai_enabled(cls) -> bool:
        return bool(cls.AGENT_API_KEY or cls.OPENAI_API_KEY)
        
    @classmethod
    def is_tavily_enabled(cls) -> bool:
        return bool(cls.TAVILY_API_KEY)
        
    @classmethod
    def is_google_maps_enabled(cls) -> bool:
        return bool(cls.GOOGLE_MAPS_API_KEY)

    @classmethod
    def print_status(cls):
        print("====== Malaysia Ez Rent Backend Config ======")
        print(f"Supabase URL configured: {bool(cls.SUPABASE_URL)}")
        print(f"Supabase Service Role configured: {bool(cls.SUPABASE_SERVICE_ROLE_KEY)}")
        print(f"Agent API Key configured: {bool(cls.AGENT_API_KEY)} (Base: {cls.AGENT_API_BASE}, Model: {cls.AGENT_MODEL})")
        print(f"Embedding API Key configured: {bool(cls.EMBEDDING_API_KEY)} (Base: {cls.EMBEDDING_API_BASE})")
        print(f"Tavily API Key configured: {bool(cls.TAVILY_API_KEY)}")
        print(f"Google Maps API Key configured: {bool(cls.GOOGLE_MAPS_API_KEY)}")
        print(f"Running Mode: {'REAL API' if cls.is_supabase_enabled() and cls.is_openai_enabled() else 'LOCAL MOCK/DEMO MODE'}")
        print("=============================================")
