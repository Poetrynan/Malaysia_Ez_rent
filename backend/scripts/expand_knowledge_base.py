"""Expand knowledge base with new universities and communities."""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import Config
from app.tools import get_embedding, supabase_service_client

MERGED_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                           'RAG', 'malaysia_rental_data_merged.json')

with open(MERGED_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

# === NEW UNIVERSITIES ===
new_unis = [
    {
        "university_name": "Universiti Tenaga Nasional (UNITEN)",
        "state": "Selangor",
        "latitude": 2.9887,
        "longitude": 101.7187,
        "nearby_communities": [
            {
                "community_name": "Seri Cempaka Condominium",
                "address": "Jalan Sungai Long, Bandar Sungai Long, 43000 Kajang, Selangor",
                "state": "Selangor", "latitude": 3.036, "longitude": 101.778,
                "description": "距离 UNITEN 最近的公寓之一，位于 Sungai Long 商业区，生活便利。",
                "property_type": "Condominium",
                "room_types_available": ["1-Bedroom", "2-Bedroom", "3-Bedroom"],
                "price_range": {"min": 800, "max": 2000, "currency": "MYR", "unit": "per_month"},
                "distance_to_university": {"km": 6, "driving_minutes": 12, "description": "开车约12分钟。"},
                "pros": ["距离校园近", "租金适中", "周边商业配套齐全"],
                "cons": ["建筑稍旧", "停车位紧张"],
                "facilities": ["Swimming Pool", "Gymnasium", "Playground", "24-Hour Security", "BBQ Area"],
                "tenant_rating": {"overall": 3.8, "safety": 3.9, "cleanliness": 3.5, "value_for_money": 4.2}
            },
            {
                "community_name": "Sungai Long Golf Residences",
                "address": "Bandar Sungai Long, 43000 Kajang, Selangor",
                "state": "Selangor", "latitude": 3.040, "longitude": 101.785,
                "description": "高尔夫球场景观公寓，环境优美，适合追求生活品质的学生。",
                "property_type": "Condominium",
                "room_types_available": ["Studio", "2-Bedroom", "3-Bedroom"],
                "price_range": {"min": 1000, "max": 2500, "currency": "MYR", "unit": "per_month"},
                "distance_to_university": {"km": 6, "driving_minutes": 10, "description": "开车约10分钟。"},
                "pros": ["环境优美", "高尔夫球场景观", "设施齐全"],
                "cons": ["距离稍远", "租金偏高"],
                "facilities": ["Golf Course", "Swimming Pool", "Gymnasium", "Club House", "24-Hour Security"],
                "tenant_rating": {"overall": 4.2, "safety": 4.3, "cleanliness": 4.1, "value_for_money": 3.7}
            },
            {
                "community_name": "Mahkota Residences Cheras",
                "address": "Bandar Mahkota Cheras, 43200 Cheras, Selangor",
                "state": "Selangor", "latitude": 3.020, "longitude": 101.760,
                "description": "Mahkota Cheras 区域的成熟公寓，靠近 AEON Mall，生活极其便利。",
                "property_type": "Condominium",
                "room_types_available": ["1-Bedroom", "2-Bedroom", "3-Bedroom"],
                "price_range": {"min": 800, "max": 2500, "currency": "MYR", "unit": "per_month"},
                "distance_to_university": {"km": 10, "driving_minutes": 15, "description": "开车约15分钟。"},
                "pros": ["靠近商场", "租金合理", "生活配套成熟"],
                "cons": ["高峰期堵车", "距离校园较远"],
                "facilities": ["Swimming Pool", "Gymnasium", "Playground", "24-Hour Security"],
                "tenant_rating": {"overall": 3.9, "safety": 4.0, "cleanliness": 3.7, "value_for_money": 4.3}
            }
        ]
    },
    {
        "university_name": "Universiti Malaysia Pahang (UMP) Gambang",
        "state": "Pahang",
        "latitude": 3.9760,
        "longitude": 103.3810,
        "nearby_communities": [
            {
                "community_name": "Bukit Gambang Resort City",
                "address": "Jalan Gambang, Bukit Gambang, 26300 Kuantan, Pahang",
                "state": "Pahang", "latitude": 3.980, "longitude": 103.375,
                "description": "度假村式综合社区，旁边就是水上乐园和商场，生活娱乐一体化。",
                "property_type": "Serviced Apartment",
                "room_types_available": ["Studio", "2-Bedroom", "3-Bedroom"],
                "price_range": {"min": 500, "max": 1500, "currency": "MYR", "unit": "per_month"},
                "distance_to_university": {"km": 4, "driving_minutes": 6, "description": "开车约6分钟。"},
                "pros": ["度假村式环境", "设施丰富", "租金适中"],
                "cons": ["距离校园需开车", "周末游客多"],
                "facilities": ["Water Park", "Swimming Pool", "Gymnasium", "Tennis Court", "24-Hour Security"],
                "tenant_rating": {"overall": 4.3, "safety": 4.2, "cleanliness": 4.4, "value_for_money": 4.1}
            },
            {
                "community_name": "Gambang Square",
                "address": "Taman Gambang, 26300 Kuantan, Pahang",
                "state": "Pahang", "latitude": 3.972, "longitude": 103.385,
                "description": "距离 UMP 最近的住宅区，步行可达校园，是学生租房的首选。",
                "property_type": "Apartment",
                "room_types_available": ["1-Bedroom", "2-Bedroom", "3-Bedroom"],
                "price_range": {"min": 400, "max": 800, "currency": "MYR", "unit": "per_month"},
                "distance_to_university": {"km": 2, "walking_minutes": 15, "driving_minutes": 3, "description": "步行约15分钟。"},
                "pros": ["极近校园", "租金最低", "周边餐饮丰富"],
                "cons": ["设施简陋", "建筑老旧"],
                "facilities": ["Parking", "Surau", "Playground"],
                "tenant_rating": {"overall": 3.5, "safety": 3.3, "cleanliness": 3.2, "value_for_money": 4.8}
            }
        ]
    },
    {
        "university_name": "Universiti Sains Islam Malaysia (USIM)",
        "state": "Negeri Sembilan",
        "latitude": 2.8470,
        "longitude": 101.8000,
        "nearby_communities": [
            {
                "community_name": "Alam Sari Nilai",
                "address": "Alam Sari, 71800 Nilai, Negeri Sembilan",
                "state": "Negeri Sembilan", "latitude": 2.845, "longitude": 101.805,
                "description": "安静的住宅区，适合学生居住，周边有商店和餐厅。",
                "property_type": "Apartment",
                "room_types_available": ["Single Room", "2-Bedroom", "3-Bedroom"],
                "price_range": {"min": 400, "max": 2000, "currency": "MYR", "unit": "per_month"},
                "distance_to_university": {"km": 3, "driving_minutes": 5, "description": "开车约5分钟。"},
                "pros": ["租金低", "环境安静", "生活便利"],
                "cons": ["设施基础", "公共交通不便"],
                "facilities": ["Playground", "Surau", "Parks"],
                "tenant_rating": {"overall": 3.6, "safety": 3.7, "cleanliness": 3.5, "value_for_money": 4.5}
            },
            {
                "community_name": "Evo Suites Nilai",
                "address": "Pusat Bandar Baru Nilai, 71800 Nilai, Negeri Sembilan",
                "state": "Negeri Sembilan", "latitude": 2.835, "longitude": 101.795,
                "description": "现代化服务式公寓，位于 Nilai 新区中心，楼下有商业配套。",
                "property_type": "Serviced Apartment",
                "room_types_available": ["Studio", "2-Bedroom"],
                "price_range": {"min": 500, "max": 1000, "currency": "MYR", "unit": "per_month"},
                "distance_to_university": {"km": 4, "driving_minutes": 8, "description": "开车约8分钟。"},
                "pros": ["设施现代", "楼下有商店", "性价比高"],
                "cons": ["距离稍远", "入住率提升中"],
                "facilities": ["Swimming Pool", "Gymnasium", "Function Room", "24-Hour Security"],
                "tenant_rating": {"overall": 4.0, "safety": 4.1, "cleanliness": 4.0, "value_for_money": 4.2}
            }
        ]
    }
]

# Add new universities
data["universities"].extend(new_unis)

# === EXPAND SUNWAY ===
sunway = next(u for u in data["universities"] if u["university_name"] == "Sunway University")
existing_names = {c["community_name"] for c in sunway["nearby_communities"]}

new_sunway = [
    {
        "community_name": "Sunway Pinnacle",
        "address": "Jalan PJS 9/1, Bandar Sunway, 47500 Subang Jaya, Selangor",
        "state": "Selangor", "latitude": 3.0712, "longitude": 101.6055,
        "description": "高层服务式公寓，步行可达 Sunway University 和金字塔购物中心。",
        "property_type": "Serviced Residence",
        "room_types_available": ["Studio", "1-Bedroom", "2-Bedroom", "3-Bedroom"],
        "price_range": {"min": 1800, "max": 5000, "currency": "MYR", "unit": "per_month"},
        "distance_to_university": {"km": 1.0, "walking_minutes": 10, "description": "步行约10分钟到 Sunway University。"},
        "pros": ["步行距离到大学", "设施现代", "靠近金字塔"],
        "cons": ["租金较高", "停车位紧张"],
        "facilities": ["Swimming Pool", "Gymnasium", "Function Hall", "24-Hour Security", "BBQ Area"],
        "tenant_rating": {"overall": 4.4, "safety": 4.5, "cleanliness": 4.3, "value_for_money": 3.6}
    },
    {
        "community_name": "Sunway Caylee Residences",
        "address": "Jalan PJS 11/11, Bandar Sunway, 47500 Subang Jaya, Selangor",
        "state": "Selangor", "latitude": 3.0695, "longitude": 101.6030,
        "description": "2022-2023年新建成的服务式公寓，设施全新，是Bandar Sunway最新的住宅项目之一。",
        "property_type": "Serviced Apartment",
        "room_types_available": ["Studio", "1-Bedroom", "2-Bedroom", "3-Bedroom"],
        "price_range": {"min": 1200, "max": 4500, "currency": "MYR", "unit": "per_month"},
        "distance_to_university": {"km": 1.2, "walking_minutes": 15, "description": "步行约15分钟。"},
        "pros": ["全新设施", "现代设计", "近 Sunway Pyramid"],
        "cons": ["租金偏高", "周边施工中"],
        "facilities": ["Swimming Pool", "Gymnasium", "Playground", "24-Hour Security"],
        "tenant_rating": {"overall": 4.3, "safety": 4.4, "cleanliness": 4.5, "value_for_money": 3.7}
    },
    {
        "community_name": "Sunway Mentari",
        "address": "Jalan PJS 7/5, Bandar Sunway, 47500 Subang Jaya, Selangor",
        "state": "Selangor", "latitude": 3.0730, "longitude": 101.6010,
        "description": "成熟的学生社区，租金极具竞争力，步行可达Sunway Pyramid和BRT站。",
        "property_type": "Condominium",
        "room_types_available": ["Single Room", "Medium Room", "Master Room", "Whole Unit"],
        "price_range": {"min": 400, "max": 3500, "currency": "MYR", "unit": "per_month"},
        "distance_to_university": {"km": 1.5, "walking_minutes": 18, "driving_minutes": 5, "description": "步行约18分钟。"},
        "pros": ["租金极具竞争力", "近BRT站", "成熟社区"],
        "cons": ["建筑较旧", "高峰期电梯拥挤"],
        "facilities": ["Swimming Pool", "Gymnasium", "Tennis Court", "24-Hour Security"],
        "tenant_rating": {"overall": 3.9, "safety": 4.0, "cleanliness": 3.6, "value_for_money": 4.7}
    },
    {
        "community_name": "The Pinnacles @ Sunway",
        "address": "Jalan PJS 9/2, Bandar Sunway, 47500 Subang Jaya, Selangor",
        "state": "Selangor", "latitude": 3.0708, "longitude": 101.6062,
        "description": "高层服务式公寓，拥有按摩池和桑拿设施，靠近Sunway Lagoon和医院。",
        "property_type": "Serviced Residence",
        "room_types_available": ["Studio", "1-Bedroom", "2-Bedroom"],
        "price_range": {"min": 1500, "max": 3500, "currency": "MYR", "unit": "per_month"},
        "distance_to_university": {"km": 1.0, "walking_minutes": 12, "description": "步行约12分钟。"},
        "pros": ["设施豪华", "近Sunway Lagoon", "步行可达大学"],
        "cons": ["租金较高", "管理费贵"],
        "facilities": ["Jacuzzi", "Sauna", "Swimming Pool", "Gymnasium", "BBQ Area", "24-Hour Security"],
        "tenant_rating": {"overall": 4.5, "safety": 4.6, "cleanliness": 4.4, "value_for_money": 3.5}
    }
]

for c in new_sunway:
    if c["community_name"] not in existing_names:
        sunway["nearby_communities"].append(c)

# Update metadata
data["data_source"] = "AI Agent Research - Complete Database (Merged + Expanded)"
data["last_updated"] = "2026-06-05"

# Stats
total_unis = len(data["universities"])
total_comms = sum(len(u.get("nearby_communities", [])) for u in data["universities"])
print(f"JSON updated: {total_unis} universities, {total_comms} communities")

with open(MERGED_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"Written to {MERGED_PATH}")

# === IMPORT TO SUPABASE ===
if not supabase_service_client:
    print("Supabase not configured, skipping DB import.")
    sys.exit(0)

print("\nClearing existing knowledge base...")
supabase_service_client.table("rental_knowledge_base").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

print("Inserting all communities...")
inserted = 0
for uni in data["universities"]:
    for comm in uni.get("nearby_communities", []):
        row = {
            "university_name": uni["university_name"],
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

print(f"Inserted: {inserted}")

# Generate embeddings
import time
print("Generating embeddings...")
rows = supabase_service_client.table("rental_knowledge_base").select("id,community_name,description,property_type").execute()
embed_count = 0
for row in rows.data:
    text = f"{row['community_name']} {row.get('property_type','')} {row.get('description','')}"
    try:
        vec = get_embedding(text)
        supabase_service_client.table("rental_knowledge_base").update({"embedding": vec}).eq("id", row["id"]).execute()
        embed_count += 1
        print(f"  [OK] {row['community_name']}")
        time.sleep(0.1)
    except Exception as e:
        print(f"  [FAIL] {row['community_name']}: {e}")

print(f"\nDone! {embed_count} embeddings generated. Total: {inserted} entries.")
