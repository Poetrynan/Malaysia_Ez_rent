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
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
    
    # Mode selectors
    @classmethod
    def is_supabase_enabled(cls) -> bool:
        return bool(cls.SUPABASE_URL and cls.SUPABASE_ANON_KEY)
        
    @classmethod
    def is_openai_enabled(cls) -> bool:
        return bool(cls.OPENAI_API_KEY)
        
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
        print(f"OpenAI API Key configured: {bool(cls.OPENAI_API_KEY)}")
        print(f"Tavily API Key configured: {bool(cls.TAVILY_API_KEY)}")
        print(f"Google Maps API Key configured: {bool(cls.GOOGLE_MAPS_API_KEY)}")
        print(f"Running Mode: {'REAL API' if cls.is_supabase_enabled() and cls.is_openai_enabled() else 'LOCAL MOCK/DEMO MODE'}")
        print("=============================================")
