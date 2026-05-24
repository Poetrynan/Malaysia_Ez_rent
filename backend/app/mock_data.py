# MOCK DATA FOR MALAYSIA EZ RENT

UNIVERSITIES = [
    {"name": "Monash University Malaysia", "lat": 3.064500, "lng": 101.600000},
    {"name": "Sunway University", "lat": 3.067800, "lng": 101.603300},
    {"name": "Taylor's University", "lat": 3.061700, "lng": 101.616700},
    {"name": "Asia Pacific University (APU)", "lat": 3.055800, "lng": 101.699700},
    {"name": "Universiti Malaya (UM)", "lat": 3.120900, "lng": 101.653800}
]

AMENITIES = [
    {"name": "Swimming Pool", "icon_key": "Waves"},
    {"name": "Gym", "icon_key": "Dumbbell"},
    {"name": "24h Security", "icon_key": "ShieldAlert"},
    {"name": "Aircon", "icon_key": "Wind"},
    {"name": "Wi-Fi", "icon_key": "Wifi"},
    {"name": "Cooking Allowed", "icon_key": "ChefHat"},
    {"name": "Pet Friendly", "icon_key": "Cat"},
    {"name": "Free Shuttle Bus", "icon_key": "Bus"}
]

COMMUNITIES = [
    {
        "id": "c1-uuid",
        "name": "Sunway Geo Residences",
        "address": "Jalan Lagoon Selatan, Bandar Sunway, 47500 Subang Jaya, Selangor",
        "lat": 3.063410,
        "lng": 101.609770,
        "amenities": ["Swimming Pool", "Gym", "24h Security", "Wi-Fi", "Free Shuttle Bus"]
    },
    {
        "id": "c2-uuid",
        "name": "Nadayu 28 Residences",
        "address": "Jalan PJS 11/7, Bandar Sunway, 47500 Subang Jaya, Selangor",
        "lat": 3.069800,
        "lng": 101.604000,
        "amenities": ["Swimming Pool", "Gym", "24h Security", "Cooking Allowed"]
    },
    {
        "id": "c3-uuid",
        "name": "D'Latour Luxury Suites",
        "address": "Jalan Taylors, Bandar Sunway, 47500 Subang Jaya, Selangor",
        "lat": 3.059300,
        "lng": 101.616000,
        "amenities": ["Swimming Pool", "Gym", "24h Security", "Aircon", "Wi-Fi"]
    },
    {
        "id": "c4-uuid",
        "name": "Pacific Place Ara Damansara",
        "address": "Jalan PJU 1A/4, Ara Damansara, 47301 Petaling Jaya, Selangor",
        "lat": 3.113000,
        "lng": 101.587800,
        "amenities": ["Swimming Pool", "24h Security", "Aircon", "Wi-Fi"]
    }
]

UNITS = [
    {
        "id": "u1-uuid",
        "community_id": "c1-uuid",
        "community_name": "Sunway Geo Residences",
        "unit_number": "Block B-12-08",
        "room_type": "Studio",
        "rent": 2500.00,
        "status": "available",
        "description": "Cozy Studio apartment right opposite Sunway Medical Centre. Walkable to Monash University via the canopy walk (5 mins) and Sunway University (8 mins). Fully furnished, pet policy: friendly to small pets, free shuttle bus to Sunway Pyramid LRT.",
        "bedrooms": 1,
        "bathrooms": 1
    },
    {
        "id": "u2-uuid",
        "community_id": "c2-uuid",
        "community_name": "Nadayu 28 Residences",
        "unit_number": "Block A-20-03",
        "room_type": "Master Room",
        "rent": 1600.00,
        "status": "available",
        "description": "Spacious Master Room with private bathroom. Sharing with 3 other Monash/Sunway students. Cooking allowed. Gym, Swimming pool, and 24h security. Walk to Sunway University in 3 mins. Aircon, study table, and wardrobes included.",
        "bedrooms": 4,
        "bathrooms": 3
    },
    {
        "id": "u3-uuid",
        "community_id": "c3-uuid",
        "community_name": "D'Latour Luxury Suites",
        "unit_number": "Tower 2-15-11",
        "room_type": "Medium Room",
        "rent": 1200.00,
        "status": "available",
        "description": "Beautiful loft-style medium room. Female only unit. Includes high-speed Wi-Fi, air conditioner, study table. 5 mins walk to Taylor's University Lakeside Campus. Infinity pool and sky gym.",
        "bedrooms": 3,
        "bathrooms": 2
    },
    {
        "id": "u4-uuid",
        "community_id": "c1-uuid",
        "community_name": "Sunway Geo Residences",
        "unit_number": "Block A-15-02",
        "room_type": "Medium Room",
        "rent": 1400.00,
        "status": "available",
        "description": "Premium Medium Room sharing bathroom with only one tidy student. Opposite Sunway Geo Avenue shopping mall. Direct link to BRT station. Cooking allowed, high speed fiber wifi included.",
        "bedrooms": 3,
        "bathrooms": 2
    },
    {
        "id": "u5-uuid",
        "community_id": "c4-uuid",
        "community_name": "Pacific Place Ara Damansara",
        "unit_number": "Block E-08-01",
        "room_type": "Studio",
        "rent": 1500.00,
        "status": "available",
        "description": "Modern studio unit next to Ara Damansara LRT station. Super easy commute to APU (via LRT connect) or downtown KL. Gym, swimming pool. Downstairs has Jaya Grocer, food court, and cafes.",
        "bedrooms": 1,
        "bathrooms": 1
    }
]

# Mock lease data for a specific user "tenant-123"
MOCK_LEASES = [
    {
        "id": "l1-uuid",
        "unit_id": "u1-uuid",
        "community_name": "Sunway Geo Residences",
        "unit_number": "Block B-12-08",
        "tenant_id": "tenant-123",
        "tenant_name": "Alex Lim",
        "start_date": "2026-02-01",
        "end_date": "2027-01-31",
        "monthly_rent": 2500.00,
        "deposit_amount": 5000.00,
        "status": "active",
        "admin_notes": "Prompt payer. Requested additional table lamp at start."
    }
]

MOCK_PAYMENT_RECORDS = [
    {"id": "p1-uuid", "lease_id": "l1-uuid", "billing_month": "2026-02-01", "paid": True, "paid_date": "2026-02-01", "admin_notes": "Paid on time via DuitNow"},
    {"id": "p2-uuid", "lease_id": "l1-uuid", "billing_month": "2026-03-01", "paid": True, "paid_date": "2026-03-02", "admin_notes": "Paid on time via DuitNow"},
    {"id": "p3-uuid", "lease_id": "l1-uuid", "billing_month": "2026-04-01", "paid": True, "paid_date": "2026-03-29", "admin_notes": "Prepaid early"},
    {"id": "p4-uuid", "lease_id": "l1-uuid", "billing_month": "2026-05-01", "paid": True, "paid_date": "2026-05-01", "admin_notes": "Paid on time via Bank Transfer"},
    {"id": "p5-uuid", "lease_id": "l1-uuid", "billing_month": "2026-06-01", "paid": False, "paid_date": None, "admin_notes": ""},
    {"id": "p6-uuid", "lease_id": "l1-uuid", "billing_month": "2026-07-01", "paid": False, "paid_date": None, "admin_notes": ""},
    {"id": "p7-uuid", "lease_id": "l1-uuid", "billing_month": "2026-08-01", "paid": False, "paid_date": None, "admin_notes": ""},
    {"id": "p8-uuid", "lease_id": "l1-uuid", "billing_month": "2026-09-01", "paid": False, "paid_date": None, "admin_notes": ""},
    {"id": "p9-uuid", "lease_id": "l1-uuid", "billing_month": "2026-10-01", "paid": False, "paid_date": None, "admin_notes": ""},
    {"id": "p10-uuid", "lease_id": "l1-uuid", "billing_month": "2026-11-01", "paid": False, "paid_date": None, "admin_notes": ""},
    {"id": "p11-uuid", "lease_id": "l1-uuid", "billing_month": "2026-12-01", "paid": False, "paid_date": None, "admin_notes": ""},
    {"id": "p12-uuid", "lease_id": "l1-uuid", "billing_month": "2027-01-01", "paid": False, "paid_date": None, "admin_notes": ""}
]
