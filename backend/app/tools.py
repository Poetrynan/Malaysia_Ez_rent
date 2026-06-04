import json
import httpx
import os
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
embedding_client = None
if Config.EMBEDDING_API_KEY:
    try:
        embedding_client = OpenAI(api_key=Config.EMBEDDING_API_KEY, base_url=Config.EMBEDDING_API_BASE)
    except Exception as e:
        print(f"[Warning] Could not init embedding client: {e}.")

agent_client = None
if Config.AGENT_API_KEY:
    try:
        agent_client = OpenAI(api_key=Config.AGENT_API_KEY, base_url=Config.AGENT_API_BASE)
    except Exception as e:
        print(f"[Warning] Could not init agent client: {e}.")

# Keep openai_client alias for compatibility
openai_client = agent_client

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
    """Generates embedding using embedding_client or returns mock vector."""
    if embedding_client:
        try:
            model = os.getenv("AI_EMBEDDING_MODEL", "BAAI/bge-m3")
            response = embedding_client.embeddings.create(
                input=[text],
                model=model
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error calling embedding API: {e}")
    # Fallback to random/mock vector of 1536 dims
    import random
    random.seed(hash(text))
    return [random.uniform(-0.1, 0.1) for _ in range(1024)]


def sync_missing_embeddings() -> int:
    """Scan all units and generate embeddings for any unit missing one."""
    if not supabase_service_client:
        return 0
    try:
        units_res = supabase_service_client.table("units").select("id, room_type, description, community_id, embedding").execute()
        units_data = units_res.data or []
        missing_units = [u for u in units_data if not u.get("embedding")]
        if not missing_units:
            return 0
            
        print(f"[Embedding Sync] Found {len(missing_units)} unit(s) missing embeddings. Generating...")
        comm_res = supabase_service_client.table("communities").select("id, name").execute()
        comm_map = {c["id"]: c["name"] for c in (comm_res.data or [])}
        
        synced_count = 0
        for u in missing_units:
            comm_name = comm_map.get(u.get("community_id"), "")
            desc_text = f"{comm_name} {u.get('room_type') or ''} {u.get('description') or ''}".strip()
            if desc_text:
                emb = get_embedding(desc_text)
                supabase_service_client.table("units").update({"embedding": emb}).eq("id", u["id"]).execute()
                print(f"[Embedding Sync] Computed embedding for unit {u['id']}")
                synced_count += 1
        return synced_count
    except Exception as e:
        print(f"[Embedding Sync] Error during sync: {e}")
        return 0


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
    
    supabase_connected = Config.is_supabase_enabled() and supabase_client
    if supabase_connected:
        try:
            # 1. Sync embeddings dynamically if any unit lacks them
            sync_missing_embeddings()

            # 2. Call RPC match_units for vector similarity search
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
            results = response.data or []
            print(f"[Tool: search_internal_db] Supabase returned {len(results)} unit(s)")

            # 3. Enrich results with community coordinates (lat/lng) and media_urls
            enriched_results = []
            for r in results:
                unit_id = r["id"]
                try:
                    # Retrieve unit community lat/lng and images from service client
                    unit_detail = supabase_service_client.table("units").select("community_id, communities(lat, lng), unit_images(media_url)").eq("id", unit_id).single().execute()
                    if unit_detail.data:
                        u_data = unit_detail.data
                        comm = u_data.get("communities", {})
                        if isinstance(comm, list) and len(comm) > 0:
                            comm = comm[0]
                        r["lat"] = comm.get("lat", 3.06341) if comm else 3.06341
                        r["lng"] = comm.get("lng", 101.60977) if comm else 101.60977
                        
                        imgs = u_data.get("unit_images", [])
                        if not isinstance(imgs, list):
                            imgs = [imgs]
                        r["media_urls"] = [img.get("media_url") for img in imgs if img.get("media_url")]
                    else:
                        r["lat"] = 3.06341
                        r["lng"] = 101.60977
                        r["media_urls"] = []
                except Exception as enrich_err:
                    print(f"Failed to enrich unit {unit_id}: {enrich_err}")
                    r["lat"] = 3.06341
                    r["lng"] = 101.60977
                    r["media_urls"] = []
                enriched_results.append(r)

            return enriched_results
        except Exception as e:
            print(f"Failed to query Supabase RPC match_units: {e}")
            return []
            
    # Mock fallback — ONLY when Supabase is not configured (local demo mode)
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


def _google_geocode(address: str) -> Optional[Dict[str, Any]]:
    """Use Google Maps Geocoding API to resolve a text address to lat/lng + formatted name."""
    if not Config.is_google_maps_enabled():
        return None
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": Config.GOOGLE_MAPS_API_KEY, "region": "my"}
    try:
        r = httpx.get(url, params=params, timeout=8.0)
        data = r.json()
        if data.get("status") == "OK" and data.get("results"):
            result = data["results"][0]
            loc = result["geometry"]["location"]
            return {
                "lat": loc["lat"],
                "lng": loc["lng"],
                "formatted_address": result.get("formatted_address", address),
            }
    except Exception as e:
        print(f"[Geocode] Error geocoding '{address}': {e}")
    return None


def calculate_commute(
    origin_address: str,
    destination_address: str
) -> Dict[str, Any]:
    """
    Calculate transit time and distance between two free-text addresses.
    Uses Google Maps Geocoding + Distance Matrix APIs — no hardcoded location lists.
    Works for ANY address the LLM passes (university, company, landmark, condo, etc.).
    """
    print(f"[Tool: calculate_commute] Origin: '{origin_address}', Destination: '{destination_address}'")

    # --- Geocode both addresses via Google Maps API ---
    origin_geo = _google_geocode(origin_address)
    dest_geo = _google_geocode(destination_address)

    # Resolve coordinates from geocoding results
    if origin_geo:
        origin_lat, origin_lng = origin_geo["lat"], origin_geo["lng"]
        origin_resolved = origin_geo["formatted_address"]
    else:
        return {
            "error": True,
            "message": f"无法识别出发地「{origin_address}」的地理位置。请让用户输入更具体的地址，例如小区名、街道名或地标。",
            "failed_address": origin_address,
        }

    if dest_geo:
        dest_lat, dest_lng = dest_geo["lat"], dest_geo["lng"]
        dest_resolved = dest_geo["formatted_address"]
    else:
        return {
            "error": True,
            "message": f"无法识别目的地「{destination_address}」的地理位置。请让用户确认具体的地点名称。",
            "failed_address": destination_address,
        }

    # --- Call Google Maps Distance Matrix with resolved coordinates ---
    if Config.is_google_maps_enabled():
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        dest_str = f"{dest_lat},{dest_lng}"
        try:
            # Driving
            params = {
                "origins": f"{origin_lat},{origin_lng}",
                "destinations": dest_str,
                "mode": "driving",
                "key": Config.GOOGLE_MAPS_API_KEY,
            }
            r = httpx.get(url, params=params, timeout=8.0)
            data = r.json()

            if data.get("status") == "OK" and data["rows"][0]["elements"][0]["status"] == "OK":
                elem = data["rows"][0]["elements"][0]
                distance_text = elem["distance"]["text"]
                duration_text = elem["duration"]["text"]

                # Transit
                params["mode"] = "transit"
                r_t = httpx.get(url, params=params, timeout=8.0)
                d_t = r_t.json()
                transit_text = "N/A"
                if d_t.get("status") == "OK" and d_t["rows"][0]["elements"][0]["status"] == "OK":
                    transit_text = d_t["rows"][0]["elements"][0]["duration"]["text"]

                # Walking
                params["mode"] = "walking"
                r_w = httpx.get(url, params=params, timeout=8.0)
                d_w = r_w.json()
                walk_text = "N/A"
                if d_w.get("status") == "OK" and d_w["rows"][0]["elements"][0]["status"] == "OK":
                    walk_text = d_w["rows"][0]["elements"][0]["duration"]["text"]

                return {
                    "origin_name": origin_resolved,
                    "origin_lat": origin_lat,
                    "origin_lng": origin_lng,
                    "destination_name": dest_resolved,
                    "destination_lat": dest_lat,
                    "destination_lng": dest_lng,
                    "driving_distance": distance_text,
                    "driving_duration": duration_text,
                    "transit_duration": transit_text,
                    "walk_duration": walk_text,
                }
            else:
                print(f"[DistanceMatrix] Status: {data.get('status')}, element: {data['rows'][0]['elements'][0].get('status')}")
        except Exception as e:
            print(f"[DistanceMatrix] Error: {e}")

    # --- Offline fallback: rough estimate based on haversine distance ---
    import math
    R = 6371  # Earth radius km
    dlat = math.radians(dest_lat - origin_lat)
    dlng = math.radians(dest_lng - origin_lng)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(origin_lat)) * math.cos(math.radians(dest_lat)) * math.sin(dlng/2)**2
    straight_km = R * 2 * math.asin(math.sqrt(a))
    road_km = round(straight_km * 1.3, 1)  # rough road factor

    return {
        "origin_name": origin_resolved,
        "origin_lat": origin_lat,
        "origin_lng": origin_lng,
        "destination_name": dest_resolved,
        "destination_lat": dest_lat,
        "destination_lng": dest_lng,
        "driving_distance": f"~{road_km} km (estimated, offline)",
        "driving_duration": f"~{max(1, int(road_km * 2.5))} mins (estimated)",
        "transit_duration": f"~{max(3, int(road_km * 4.5))} mins (estimated)",
        "walk_duration": f"~{int(road_km * 12)} mins (estimated)",
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
    
    if not supabase_service_client:
        print("[Tool: check_my_own_rental_status] WARNING: supabase_service_client is None! Cannot query real data.")
        return {
            "has_active_lease": False,
            "message": "Database service client is not available. Please check backend SUPABASE_SERVICE_ROLE_KEY configuration.",
            "debug_info": "supabase_service_client is None"
        }
    
    try:
        # 1. Fetch active lease
        lease_res = supabase_service_client.table("leases")\
            .select("*, units(*, communities(*))")\
            .eq("tenant_id", user_id)\
            .eq("status", "active")\
            .execute()
            
        if not lease_res.data:
            print(f"[Tool: check_my_own_rental_status] No active lease found for user_id={user_id}")
            return {"has_active_lease": False, "message": f"No active lease found for this user. (Queried user_id: {user_id[:8]}...)"}
            
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
        print(f"[Tool: check_my_own_rental_status] ERROR querying Supabase: {e}")
        return {
            "has_active_lease": False,
            "message": f"Error querying database: {str(e)}",
            "debug_info": f"Exception during Supabase query for user_id={user_id[:8]}..."
        }


# Tool: search_knowledge_base (RAG rental knowledge base)
def search_knowledge_base(
    semantic_query: str,
    state: Optional[str] = None,
    max_results: int = 5
) -> List[Dict[str, Any]]:
    """
    Search the rental knowledge base (community profiles) using semantic similarity.
    Returns rich community info: price ranges, ratings, pros/cons, transportation, etc.
    """
    print(f"[Tool: search_knowledge_base] Query: '{semantic_query}', state: {state}, max: {max_results}")

    if not supabase_service_client:
        print("[Tool: search_knowledge_base] Supabase not configured, returning empty.")
        return []

    # Ensure embeddings are synced
    sync_kb_embeddings()

    try:
        query_vec = get_embedding(semantic_query)
    except Exception as e:
        print(f"[Tool: search_knowledge_base] Embedding error: {e}")
        return []

    try:
        result = supabase_service_client.rpc("match_knowledge_base", {
            "query_embedding": query_vec,
            "match_threshold": 0.15,
            "match_count": max_results,
            "filter_state": state
        }).execute()

        if not result.data:
            return []

        results = []
        for row in result.data:
            entry = {
                "id": row["id"],
                "university_name": row["university_name"],
                "community_name": row["community_name"],
                "address": row["address"],
                "state": row["state"],
                "latitude": row.get("latitude"),
                "longitude": row.get("longitude"),
                "description": row.get("description"),
                "property_type": row.get("property_type"),
                "similarity": round(row.get("similarity", 0), 3),
            }
            # Merge rich data from JSONB
            rich = row.get("data")
            if isinstance(rich, str):
                rich = json.loads(rich)
            if isinstance(rich, dict):
                entry["price_range"] = rich.get("price_range")
                entry["room_types_available"] = rich.get("room_types_available")
                entry["distance_to_university"] = rich.get("distance_to_university")
                entry["pros"] = rich.get("pros")
                entry["cons"] = rich.get("cons")
                entry["facilities"] = rich.get("facilities")
                entry["tenant_rating"] = rich.get("tenant_rating")
                entry["transportation"] = rich.get("transportation")
                entry["target_tenants"] = rich.get("target_tenants")
                entry["lease_terms"] = rich.get("lease_terms")
                entry["building_details"] = rich.get("building_details")
            results.append(entry)

        return results

    except Exception as e:
        print(f"[Tool: search_knowledge_base] Supabase RPC error: {e}")
        return []


def sync_kb_embeddings() -> int:
    """Generate embeddings for knowledge base entries that are missing them."""
    if not supabase_service_client:
        return 0
    try:
        rows = supabase_service_client.table("rental_knowledge_base")\
            .select("id,community_name,description,property_type")\
            .is_("embedding", "null").execute()
        if not rows.data:
            return 0
        count = 0
        for row in rows.data:
            text = f"{row['community_name']} {row.get('property_type','')} {row.get('description','')}"
            try:
                vec = get_embedding(text)
                supabase_service_client.table("rental_knowledge_base")\
                    .update({"embedding": vec}).eq("id", row["id"]).execute()
                count += 1
                import time; time.sleep(0.05)
            except Exception as e:
                print(f"[sync_kb_embeddings] Failed for {row['community_name']}: {e}")
        if count > 0:
            print(f"[sync_kb_embeddings] Generated {count} embeddings")
        return count
    except Exception as e:
        print(f"[sync_kb_embeddings] Error: {e}")
        return 0


def convert_currency_frankfurter(amount: float = 1.0, from_currency: str = "MYR", to_currency: str = "CNY") -> Dict[str, Any]:
    """
    Convert a specific amount of money from one currency to another using Frankfurter API.
    Supports currencies like MYR, CNY, USD, SGD, GBP, AUD, etc.
    """
    from_currency = from_currency.upper().strip()
    to_currency = to_currency.upper().strip()
    
    if from_currency == to_currency:
        return {
            "success": True,
            "base": from_currency,
            "quote": to_currency,
            "amount": amount,
            "converted_amount": amount,
            "rate": 1.0
        }

    # Try api.frankfurter.dev first, then fallback to api.frankfurter.app
    urls = [
        f"https://api.frankfurter.dev/v2/rate/{from_currency}/{to_currency}",
        f"https://api.frankfurter.app/latest?from={from_currency}&to={to_currency}"
    ]
    
    for url in urls:
        try:
            response = httpx.get(url, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                rate = None
                if "rate" in data:
                    rate = float(data["rate"])
                elif "rates" in data and to_currency in data["rates"]:
                    rate = float(data["rates"][to_currency])
                
                if rate is not None:
                    return {
                        "success": True,
                        "date": data.get("date"),
                        "base": from_currency,
                        "quote": to_currency,
                        "amount": amount,
                        "converted_amount": round(amount * rate, 2),
                        "rate": rate
                    }
        except Exception as e:
            print(f"[Warning] Frankfurter API error for URL {url}: {e}")
            continue

    # Fallback to local hardcoded estimates if offline
    mock_rates = {
        ("MYR", "CNY"): 1.63,
        ("CNY", "MYR"): 0.61,
        ("MYR", "USD"): 0.23,
        ("USD", "MYR"): 4.40,
        ("MYR", "SGD"): 0.31,
        ("SGD", "MYR"): 3.25,
        ("MYR", "GBP"): 0.18,
        ("GBP", "MYR"): 5.55
    }
    pair = (from_currency, to_currency)
    if pair in mock_rates:
        rate = mock_rates[pair]
        return {
            "success": True,
            "base": from_currency,
            "quote": to_currency,
            "amount": amount,
            "converted_amount": round(amount * rate, 2),
            "rate": rate,
            "is_mock": True
        }
        
    return {
        "success": False,
        "error": "Failed to fetch exchange rate and no local fallback exists for this pair."
    }


def get_malaysia_holidays(year: int = 2026) -> Dict[str, Any]:
    """
    Get the list of public holidays in Malaysia for a specific year using Nager.Date API.
    Helps students check if a government office, bank, or university is closed.
    """
    url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/MY"
    try:
        response = httpx.get(url, timeout=5.0)
        if response.status_code == 200:
            holidays = response.json()
            # Clean up output structure to make it context-friendly for LLM
            formatted_holidays = []
            for h in holidays:
                formatted_holidays.append({
                    "date": h.get("date"),
                    "english_name": h.get("name"),
                    "local_name": h.get("localName"),
                    "global_holiday": h.get("global"),
                    "states": h.get("counties")
                })
            return {
                "success": True,
                "year": year,
                "total_holidays": len(formatted_holidays),
                "holidays": formatted_holidays
            }
    except Exception as e:
        print(f"[Warning] Nager.Date API error: {e}")

    # Local fallback for some major public holidays in Malaysia if offline
    return {
        "success": True,
        "year": year,
        "is_mock": True,
        "holidays": [
            {"date": f"{year}-01-01", "english_name": "New Year's Day", "local_name": "Tahun Baru", "global_holiday": False, "states": ["MY-10", "MY-14"]},
            {"date": f"{year}-05-01", "english_name": "Labour Day", "local_name": "Hari Pekerja", "global_holiday": True, "states": None},
            {"date": f"{year}-08-31", "english_name": "National Day", "local_name": "Hari Kebangsaan", "global_holiday": True, "states": None},
            {"date": f"{year}-09-16", "english_name": "Malaysia Day", "local_name": "Hari Malaysia", "global_holiday": True, "states": None},
            {"date": f"{year}-12-25", "english_name": "Christmas Day", "local_name": "Hari Krismas", "global_holiday": True, "states": None}
        ]
    }

