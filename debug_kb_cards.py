"""
Debug script to verify knowledge base card generation logic.
"""
import json

# Simulate the kb_card_candidates list
kb_card_candidates = [
    {
        "type": "ui_component",
        "component": "MapAndCard",
        "props": {
            "origin_name": "Arte S",
            "origin_lat": 5.3525,
            "origin_lng": 100.2985,
            "community_name": "Arte S",
            "university_name": "Universiti Sains Malaysia (USM)",
            "price_range": {"min": 650, "max": 3500, "currency": "MYR", "unit": "per_month"},
            "tenant_rating": {"overall": 4.2, "safety": 4.0},
            "description": "槟城极具地标性的前卫公寓，以其流线型外墙和现代化的生活方式著称，距离USM非常近。",
            "is_knowledge_base": True,
            "auto_load": True
        }
    },
    {
        "type": "ui_component",
        "component": "MapAndCard",
        "props": {
            "origin_name": "Centrio Avenue",
            "origin_lat": 5.3615,
            "origin_lng": 100.2975,
            "community_name": "Centrio Avenue",
            "university_name": "Universiti Sains Malaysia (USM)",
            "price_range": {"min": 750, "max": 1800, "currency": "MYR", "unit": "per_month"},
            "tenant_rating": {"overall": 4.0, "safety": 4.2},
            "description": "位于Gelugor的高性价比公寓，租金实惠，生活便利，是USM学生的常选之地。",
            "is_knowledge_base": True,
            "auto_load": True
        }
    }
]

# Simulate the AI answer
answer_text = """
Arte S – Gelugor, Penang (靠近 USM)
价格范围：RM 650 ‑ RM 3,500 /月
关键亮点
评分 4.2，安全指数 4.0（整体安全）
步行约 10 分钟（0.8 km）即可到达 USM 校园
现代化设计，配套设施齐全（景观泳池、健身房、24 小时安保）
多种房型可选：单间、标准间、主卧、整套单元

备选社区对比表
小区	价格	评分	距大学	亮点
Arte S	RM 650‑3,500	4.2	0.8 km（步行10 分钟）	现代设施、泳池健身房、安保
Centrio Avenue	RM 750‑1,800	4.0	1.5 km（驾车5 分钟）	亲民租金、成熟生活配套、安保良好

推荐：首选 Arte S，因为它的最低租金更低且离校园更近，安全指数也达标；若希望住在更成熟的社区且对价格上限有更宽容的预算，可考虑 Centrio Avenue 作为备选。
"""

answer_lower = answer_text.lower()
commute_card_names = set()
pending_ui_components = []
MAX_KB_CARDS = 3
shown = 0

print("=== Simulating card matching logic ===\n")
print(f"Answer mentions:")
print(f"  - 'arte s' in answer: {'arte s' in answer_lower}")
print(f"  - 'centrio avenue' in answer: {'centrio avenue' in answer_lower}")
print()

for i, cand in enumerate(kb_card_candidates):
    print(f"Checking candidate {i+1}:")
    name = (cand["props"].get("community_name") or "").strip()
    print(f"  Community name: {name}")
    print(f"  Coordinates: lat={cand['props']['origin_lat']}, lng={cand['props']['origin_lng']}")
    
    if shown >= MAX_KB_CARDS:
        print(f"  ❌ Skipped: MAX_KB_CARDS ({MAX_KB_CARDS}) reached")
        break
    
    if not name or name.lower() in commute_card_names:
        print(f"  ❌ Skipped: name empty or in commute_card_names")
        continue
    
    if name.lower() in answer_lower:
        print(f"  ✅ Match found! Adding to pending_ui_components")
        pending_ui_components.append(cand)
        shown += 1
    else:
        print(f"  ❌ Not mentioned in answer")
    print()

print(f"\n=== Final Results ===")
print(f"Total cards to emit: {len(pending_ui_components)}")
for i, comp in enumerate(pending_ui_components):
    props = comp["props"]
    print(f"\nCard {i+1}:")
    print(f"  Community: {props['community_name']}")
    print(f"  Coordinates: lat={props['origin_lat']}, lng={props['origin_lng']}")
    print(f"  Price: RM {props['price_range']['min']} - {props['price_range']['max']}")
    print(f"  Description: {props['description'][:50]}...")
