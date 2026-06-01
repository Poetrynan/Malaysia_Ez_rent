import requests
import json

SUPABASE_URL = "https://legiyebykxmztaewlmhv.supabase.co"
ANON_KEY = "sb_publishable_Uzk4ArRjDh6XkgUDak9c3A_PyyNAY8j"

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}"
}

print("=== TRYING TO SELECT FROM users WITH ANON KEY ===")
r = requests.get(f"{SUPABASE_URL}/rest/v1/users?select=id,full_name,phone,email", headers=headers)
print(f"Status: {r.status_code}")
try:
    print(json.dumps(r.json(), indent=2))
except Exception as e:
    print(r.text)

print("\n=== TRYING TO SELECT FROM admin_users WITH ANON KEY ===")
r = requests.get(f"{SUPABASE_URL}/rest/v1/admin_users?select=id,display_name,email,role,phone,whatsapp", headers=headers)
print(f"Status: {r.status_code}")
try:
    print(json.dumps(r.json(), indent=2))
except Exception as e:
    print(r.text)
