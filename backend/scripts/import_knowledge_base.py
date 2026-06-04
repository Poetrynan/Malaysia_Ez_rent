"""
Import merged rental knowledge base JSON into Supabase rental_knowledge_base table.
Generates embeddings using bge-m3 via SiliconFlow API.

Usage:
    cd backend
    python scripts/import_knowledge_base.py
"""
import sys
import os
import json
import time

# Add parent dir to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import Config
from app.tools import get_embedding, supabase_service_client

MERGED_JSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "RAG", "malaysia_rental_data_merged.json"
)


def main():
    if not supabase_service_client:
        print("[ERROR] Supabase service client not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
        return

    # Load merged JSON
    print(f"Loading: {MERGED_JSON_PATH}")
    with open(MERGED_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    universities = data.get("universities", [])
    total_communities = sum(len(u.get("nearby_communities", [])) for u in universities)
    print(f"Found {len(universities)} universities, {total_communities} communities")

    # Clear existing data
    print("Clearing existing knowledge base data...")
    supabase_service_client.table("rental_knowledge_base").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    # Insert all communities
    inserted = 0
    failed = 0
    for uni in universities:
        uni_name = uni["university_name"]
        for comm in uni.get("nearby_communities", []):
            row = {
                "university_name": uni_name,
                "community_name": comm["community_name"],
                "address": comm.get("address", ""),
                "state": comm.get("state", ""),
                "latitude": comm.get("latitude"),
                "longitude": comm.get("longitude"),
                "description": comm.get("description", ""),
                "property_type": comm.get("property_type", ""),
                "data": json.dumps(comm, ensure_ascii=False),
            }
            try:
                supabase_service_client.table("rental_knowledge_base").insert(row).execute()
                inserted += 1
            except Exception as e:
                print(f"  [FAIL] {comm['community_name']}: {e}")
                failed += 1

    print(f"Inserted: {inserted}, Failed: {failed}")

    # Generate embeddings
    print("\nGenerating embeddings with bge-m3...")
    rows = supabase_service_client.table("rental_knowledge_base").select("id,community_name,description,property_type").execute()
    embed_count = 0
    embed_fail = 0
    for row in rows.data:
        text = f"{row['community_name']} {row.get('property_type','')} {row.get('description','')}"
        try:
            vec = get_embedding(text)
            supabase_service_client.table("rental_knowledge_base").update(
                {"embedding": vec}
            ).eq("id", row["id"]).execute()
            embed_count += 1
            print(f"  [OK] {row['community_name']}")
            # Small delay to avoid rate limiting
            time.sleep(0.1)
        except Exception as e:
            embed_fail += 1
            print(f"  [FAIL] {row['community_name']}: {e}")

    print(f"\nDone! Embeddings generated: {embed_count}, Failed: {embed_fail}")
    print(f"Total entries in knowledge base: {inserted}")


if __name__ == "__main__":
    main()
