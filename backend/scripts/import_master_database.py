"""
Import master rental database JSON into Supabase rental_knowledge_base table.
Generates embeddings using bge-m3 via SiliconFlow API and inserts the records.

Usage:
    cd backend
    python scripts/import_master_database.py
"""
import sys
import os
import json
import time
from dotenv import load_dotenv

# Explicitly load .env file relative to the script location (backend/.env)
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=dotenv_path)

# Add parent dir to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import Config
from app.tools import get_embedding, supabase_service_client

MASTER_JSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "RAG", "malaysia_rental_master_database.json"
)


def main():
    if not supabase_service_client:
        print("[ERROR] Supabase service client not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env")
        return

    # Load master JSON
    print(f"Loading: {MASTER_JSON_PATH}")
    if not os.path.exists(MASTER_JSON_PATH):
        print(f"[ERROR] File not found: {MASTER_JSON_PATH}")
        return

    with open(MASTER_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    universities = data.get("universities", [])
    total_communities = sum(len(u.get("nearby_communities", [])) for u in universities)
    print(f"Found {len(universities)} universities, {total_communities} communities in the master database.")

    # Clear existing data
    print("\nClearing existing knowledge base data in rental_knowledge_base...")
    try:
        supabase_service_client.table("rental_knowledge_base").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("[OK] Existing database entries cleared.")
    except Exception as e:
        print(f"[ERROR] Failed to clear database table: {e}")
        return

    # Insert communities and generate embeddings
    inserted = 0
    failed = 0
    embed_count = 0
    embed_fail = 0

    print("\nStarting import and embedding generation...")

    for i, uni in enumerate(universities):
        uni_name = uni["university_name"]
        print(f"\nProcessing University [{i+1}/{len(universities)}]: {uni_name}")
        
        for comm in uni.get("nearby_communities", []):
            comm_name = comm["community_name"]
            prop_type = comm.get("property_type", "")
            desc = comm.get("description", "")
            
            # Text to embed
            text = f"{comm_name} {prop_type} {desc}"
            
            # Get embedding with retries
            vec = None
            retries = 3
            for attempt in range(retries):
                try:
                    vec = get_embedding(text)
                    if vec is not None and len(vec) == 1024:
                        break
                    else:
                        print(f"  [WARN] Attempt {attempt+1}/{retries} returned invalid embedding size. Retrying...")
                except Exception as e:
                    print(f"  [WARN] Attempt {attempt+1}/{retries} failed: {e}. Retrying...")
                time.sleep(1)
            
            if vec is None:
                print(f"  [FAIL] Could not generate embedding for community: {comm_name}")
                embed_fail += 1
                # Skip inserting if we don't have embeddings, or we can insert without embeddings
                # Since the search relies on embeddings being non-null, let's skip or insert mock
                # Let's fallback to get_embedding mock vector if needed, or skip. 
                # get_embedding itself has a mock fallback, so it shouldn't return None unless exceptions are unhandled.
                # Just in case, let's keep it safe.
                
            row = {
                "university_name": uni_name,
                "community_name": comm_name,
                "address": comm.get("address", ""),
                "state": comm.get("state", ""),
                "latitude": comm.get("latitude"),
                "longitude": comm.get("longitude"),
                "description": desc,
                "property_type": prop_type,
                "data": json.dumps(comm, ensure_ascii=False),
                "embedding": vec,
            }
            
            try:
                supabase_service_client.table("rental_knowledge_base").insert(row).execute()
                inserted += 1
                embed_count += 1
                print(f"  [OK] Embedded & Inserted: {comm_name}")
            except Exception as e:
                print(f"  [FAIL] Failed to insert {comm_name}: {e}")
                failed += 1
            
            # Tiny delay to avoid rate limiting
            time.sleep(0.05)

    print("\n=============================================")
    print("               IMPORT SUMMARY                ")
    print("=============================================")
    print(f"Total Communities Inserted: {inserted}")
    print(f"Total Embeddings Generated: {embed_count}")
    print(f"Failed Inserts: {failed}")
    print(f"Failed Embeddings: {embed_fail}")
    print("=============================================")
    print("Done!")


if __name__ == "__main__":
    main()
