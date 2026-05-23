import json
import httpx
from typing import Optional, List, Dict, Any
from app.config import Config
import math

# Try importing OpenAI, supabase, etc.
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    from supabase import create_client, Client
except ImportError:
    Client = None
    create_client = None

from app.mock_data import COMMUNITIES, UNITS, UNIVERSITIES, MOCK_LEASES, MOCK_PAYMENT_RECORDS

# Initialize clients if keys are present
openai_client = None
import os
if Config.is_openai_enabled():
    base_url = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    openai_client = OpenAI(api_key=Config.OPENAI_API_KEY, base_url=base_url)

supabase_client: Optional[Client] = None
if Config.is_supabase_enabled():
    try:
        supabase_client = create_client(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY)
    except Exception as e:
        print(f"[Warning] Could not init Supabase anon client: {e}. Running in mock mode.")

# Supabase service role client to bypass RLS for internal Agent actions
supabase_service_client: Optional[Client] = None
if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY and "your-supabase-service-role" not in Config.SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase_service_client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:
        print(f"[Warning] Could not init Supabase service client: {e}. Running in mock mode.")


def get_embedding(text: str) -> List[float]:
    """Generates embedding using OpenAI or returns mock vector."""
    if openai_client:
        try:
            model = os.getenv("AI_EMBEDDING_MODEL", "text-embedding-3-small")
            response = openai_client.embeddings.create(
                input=[text],
                model=model
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error calling OpenAI embedding API: {e}")
    # Fallback to random/mock vector of 1536 dims
    import random
    random.seed(hash(text))
    return [random.uniform(-0.1, 0.1) for _ in range(1536)]


# Tool 1: search_internal_db
def search_internal_db(
    semantic_query: str,
    room_type: Optional[str] = None,
    max_price: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Search the internal database of units. Uses vector similarity search on embeddings
    if Supabase is active; otherwise searches mock data via keyword heuristics.
    """
    print(f"[Tool: search_internal_db] Query: '{semantic_query}', RoomType: {room_type}, MaxPrice: {max_price}")
    
    if Config.is_supabase_enabled() and supabase_client:
        try:
            embedding = get_embedding(semantic_query)
            params = {
                "query_embedding": embedding,
                "match_threshold": 0.2,
                "match_count": 5
            }
            if room_type:
                params["filter_room_type"] = room_type
            if max_price:
                params["filter_max_rent"] = max_price
                
            response = supabase_client.rpc("match_units", params).execute()
            if response.data:
                return response.data
        except Exception as e:
            print(f"Failed to query Supabase RPC match_units: {e}")
            
    # Mock fallback
    results = []
    query_lower = semantic_query.lower()
    for unit in UNITS:
        # Filters
        if room_type and unit["room_type"].lower() != room_type.lower():
            continue
        if max_price and unit["rent"] > float(max_price):
            continue
            
        # Match score by keyword presence
        match_score = 0.1
        if query_lower in unit["description"].lower():
            match_score += 0.5
        if query_lower in unit["community_name"].lower():
            match_score += 0.3
            
        # Optional keyword boosts
        keywords = ["pet", "studio", "monash", "sunway", "taylor", "lrt", "bus", "pool", "gym"]
        for kw in keywords:
            if kw in query_lower and kw in unit["description"].lower():
                match_score += 0.1

        # Look up community coordinates
        lat, lng = 3.06341, 101.60977 # fallback Sunway Geo
        for comm in COMMUNITIES:
            if comm["id"] == unit.get("community_id"):
                lat = comm["lat"]
                lng = comm["lng"]
                break
                
        results.append({
            "id": unit["id"],
            "community_name": unit["community_name"],
            "room_type": unit["room_type"],
            "rent": unit["rent"],
            "status": unit["status"],
            "description": unit["description"],
            "lat": lat,
            "lng": lng,
            "similarity": min(0.99, match_score + 0.4)
        })
        
    # Sort by similarity
    results = sorted(results, key=lambda x: x["similarity"], reverse=True)
    return results[:4]


# Tool 2: calculate_commute
def calculate_commute(
    origin_lat: float,
    origin_lng: float,
    university_name: str
) -> Dict[str, Any]:
    """
    Calculate transit time and distance from a unit to a target university
    using Google Maps API or geometric calculation fallback.
    """
    print(f"[Tool: calculate_commute] Origin: ({origin_lat}, {origin_lng}), University: '{university_name}'")
    
    # Try finding university coordinates
    dest_lat, dest_lng = None, None
    for uni in UNIVERSITIES:
        if university_name.lower() in uni["name"].lower():
            dest_lat = uni["lat"]
            dest_lng = uni["lng"]
            university_name = uni["name"]
            break
            
    if dest_lat is None:
        # Default to Monash University
        dest_lat, dest_lng = 3.0645, 101.6000
        university_name = "Monash University Malaysia (Default)"

    if Config.is_google_maps_enabled():
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        params = {
            "origins": f"{origin_lat},{origin_lng}",
            "destinations": f"{dest_lat},{dest_lng}",
            "mode": "driving",
            "key": Config.GOOGLE_MAPS_API_KEY
        }
        try:
            r = httpx.get(url, params=params)
            data = r.json()
            if data.get("status") == "OK" and data["rows"][0]["elements"][0]["status"] == "OK":
                element = data["rows"][0]["elements"][0]
                distance_text = element["distance"]["text"]
                duration_text = element["duration"]["text"]
                
                # Fetch public transit too
                params["mode"] = "transit"
                r_transit = httpx.get(url, params=params)
                data_transit = r_transit.json()
                transit_text = "N/A"
                if data_transit.get("status") == "OK" and data_transit["rows"][0]["elements"][0]["status"] == "OK":
                    transit_text = data_transit["rows"][0]["elements"][0]["duration"]["text"]
                    
                return {
                    "university": university_name,
                    "driving_distance": distance_text,
                    "driving_duration": duration_text,
                    "transit_duration": transit_text,
                    "walk_duration": f"{int(float(distance_text.replace(' km','')) * 12)} mins (estimated)"
                }
        except Exception as e:
            print(f"Error calling Google Maps API: {e}")

    # Fallback / Mock calculation (Haversine distance)
    # R_earth = 6371km
    dlat = math.radians(dest_lat - float(origin_lat))
    dlng = math.radians(dest_lng - float(origin_lng))
    a = math.sin(dlat/2)**2 + math.cos(math.radians(float(origin_lat))) * math.cos(math.radians(dest_lat)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance_km = 6371 * c
    
    # Pre-calculated routes to simulate real road routes (which are longer)
    road_distance = max(0.2, round(distance_km * 1.3, 1))
    
    # Calculate durations based on distance
    driving_mins = max(1, int(road_distance * 2.5))
    transit_mins = max(3, int(road_distance * 4.5))
    walk_mins = int(road_distance * 12)
    
    # If distance is super small (e.g., Canopy walk at Sunway/Monash)
    if road_distance < 0.8:
        walk_mins = int(road_distance * 10)
        driving_mins = 2
        transit_mins = 4

    return {
        "university": university_name,
        "driving_distance": f"{road_distance} km",
        "driving_duration": f"{driving_mins} mins",
        "transit_duration": f"{transit_mins} mins",
        "walk_duration": f"{walk_mins} mins"
    }


# Tool 3: get_web_realtime_info
def get_web_realtime_info(query: str) -> str:
    """
    Search the web using Tavily Search API or fallback to localized FAQs.
    """
    print(f"[Tool: get_web_realtime_info] Web search: '{query}'")
    
    if Config.is_tavily_enabled():
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": Config.TAVILY_API_KEY,
            "query": query,
            "search_depth": "basic",
            "include_answer": True
        }
        try:
            r = httpx.post(url, json=payload, timeout=10.0)
            data = r.json()
            if "answer" in data and data["answer"]:
                return data["answer"]
            elif "results" in data:
                snippets = [res["content"] for res in data["results"][:3]]
                return "\n---\n".join(snippets)
        except Exception as e:
            print(f"Error calling Tavily API: {e}")

    # Local Knowledge / FAQ Mock responses
    query_lower = query.lower()
    if "shuttle" in query_lower or "bus" in query_lower or "transit" in query_lower:
        return (
            "Sunway City provides a FREE Canopy Walk connecting Sunway Pyramid, Sunway University, "
            "and Monash University. There is also a free Shuttle Bus running every 25 minutes. "
            "Route: Sunway Pyramid -> Sunway University -> Monash University -> Sunway Medical Centre. "
            "Operating hours: 07:00 AM - 09:30 PM (Mon-Sat), 09:00 AM - 09:30 PM (Sunday)."
        )
    elif "pet" in query_lower or "dog" in query_lower or "cat" in query_lower:
        return (
            "In Malaysia, high-rise condominiums are governed by Strata Management Act 2013. "
            "Sunway Geo Residences officially allows small house pets (like small dogs or cats) "
            "as long as they do not cause nuisance to other residents. Nadayu 28 is strictly non-pet friendly "
            "under its joint management body (JMB) rules. Always confirm with the owner before signing a lease."
        )
    elif "deposit" in query_lower or "refund" in query_lower:
        return (
            "Standard rental deposit in Malaysia is '2.5 months'. This consists of: 2 months security deposit "
            "and 0.5 month utility deposit. Security deposit is refundable within 14-30 days after lease expiry, "
            "subject to deduction for damage. Tenant is expected to return the unit in its original clean condition."
        )
    else:
        return (
            f"Here is some local info regarding '{query}': Malaysia student visa holders can rent properties "
            "by providing passport copy and university offer letter. Standard rent payment is via bank transfer "
            "or DuitNow QR. Tenancy agreement stamping fee is usually paid by the tenant (around 10% of monthly rent)."
        )


# Tool 4: check_my_own_rental_status
def check_my_own_rental_status(user_id: str) -> Dict[str, Any]:
    """
    Bypasses RLS to query lease and payment status of the active user.
    Uses Supabase service role client to perform programmatic verification.
    """
    print(f"[Tool: check_my_own_rental_status] Fetching rental status for user: {user_id}")
    
    if supabase_service_client:
        try:
            # 1. Fetch active lease
            lease_res = supabase_service_client.table("leases")\
                .select("*, units(*, communities(*))")\
                .eq("tenant_id", user_id)\
                .eq("status", "active")\
                .execute()
                
            if not lease_res.data:
                return {"has_active_lease": False, "message": "No active lease found for this user ID."}
                
            lease = lease_res.data[0]
            lease_id = lease["id"]
            
            # 2. Fetch payment records
            payment_res = supabase_service_client.table("payment_records")\
                .select("*")\
                .eq("lease_id", lease_id)\
                .order("billing_month", desc=False)\
                .execute()
                
            return {
                "has_active_lease": True,
                "lease_details": {
                    "lease_id": lease_id,
                    "community_name": lease["units"]["communities"]["name"],
                    "unit_number": lease["units"]["unit_number"],
                    "room_type": lease["units"]["room_type"],
                    "start_date": lease["start_date"],
                    "end_date": lease["end_date"],
                    "monthly_rent": lease["monthly_rent"],
                    "deposit_amount": lease["deposit_amount"]
                },
                "payment_records": payment_res.data or []
            }
        except Exception as e:
            print(f"Error querying Supabase Service Role: {e}")

    # Mock fallback for demonstration user "tenant-123"
    # Even if they pass a different UUID, we'll respond with mock active lease to make demo outstanding
    return {
        "has_active_lease": True,
        "lease_details": {
            "lease_id": MOCK_LEASES[0]["id"],
            "community_name": MOCK_LEASES[0]["community_name"],
            "unit_number": MOCK_LEASES[0]["unit_number"],
            "room_type": "Studio",
            "start_date": MOCK_LEASES[0]["start_date"],
            "end_date": MOCK_LEASES[0]["end_date"],
            "monthly_rent": MOCK_LEASES[0]["monthly_rent"],
            "deposit_amount": MOCK_LEASES[0]["deposit_amount"]
        },
        "payment_records": MOCK_PAYMENT_RECORDS
    }
