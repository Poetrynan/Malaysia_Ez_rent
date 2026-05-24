# Malaysia Ez Rent AI Development Architecture

Last updated: 2026-05-24 (UTC+8)

This document is the single-source onboarding guide for future AI agents working in this repo.

## 1) System Overview

The project is a full-stack rental platform for Malaysian student housing with:

- Next.js frontend (`frontend`) for student/admin UI
- FastAPI backend (`backend`) as AI orchestration service (SSE streaming)
- Supabase (`supabase`) for Auth + Postgres + Storage + Realtime

High-level flow:

1. User logs in via Supabase (Google OAuth or Magic Link)
2. Frontend resolves role from `admin_users` and renders student/admin experience
3. AI chat requests stream from frontend -> backend `/api/chat` -> tool calls -> SSE back to UI
4. Rental operations persist to Supabase tables; media persists to Storage bucket `unit-media`

## 2) Monorepo Layout

```text
Malaysia_Ez_rent/
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx                    # root shell, role-gated tabs
│   │   ├── login/page.tsx              # Google + Magic Link
│   │   ├── auth/callback/route.ts      # code->session exchange
│   │   └── mobile-upload/[id]/page.tsx # anonymous evidence upload
│   ├── src/components/
│   │   ├── PropertyListings.tsx
│   │   ├── AIChat.tsx
│   │   ├── StudentPortal.tsx
│   │   ├── LeaseLedgerCard.tsx
│   │   └── AdminPanel.tsx
│   ├── src/lib/supabase.ts             # real/mock switch + mock impl
│   ├── src/lib/i18n.ts
│   ├── src/utils/compressImage.ts       # client-side image compression presets
│   └── src/middleware.ts                # route guard with mobile-upload allowlist
├── backend/
│   └── app/
│       ├── main.py                      # FastAPI + SSE endpoints
│       ├── agent.py                     # ReAct loop/tool-calling orchestration
│       ├── tools.py                     # DB search, commute, web info, status checks
│       └── config.py
├── supabase/
│   ├── schema.sql
│   └── migrations/*.sql
└── docs/
```

## 3) Frontend Architecture

### Core

- `frontend/src/app/page.tsx`
  - Main app shell with sidebar tabs.
  - Determines `role` (`student` or `admin`) by checking `admin_users`.
  - Mounts all views, toggles visibility for smoother UI state.

- `frontend/src/lib/supabase.ts`
  - Auto-detects real vs mock mode by env presence.
  - Exports `supabase` and `isMockDatabase`.
  - Mock mode emulates query builder and realtime behavior via `localStorage`/`BroadcastChannel`.

### Student path

- `PropertyListings.tsx`: listing/filter/detail + co-renting intent UX.
- `AIChat.tsx`: SSE chat UX; renders reasoning/tool steps and final response.
- `StudentPortal.tsx`: lease summary, payment progress, feedback box.
- `LeaseLedgerCard.tsx`: monthly ledger + payment modal + QR generation.

### Admin path

- `AdminPanel.tsx` includes:
  - communities/units CRUD
  - lease creation/deletion
  - payment review (approve/reject/clear evidence)
  - admin profile/payment QR settings
  - feedback handling
  - community delete for removing duplicate same-name communities (new)

### Mobile evidence upload

- `app/mobile-upload/[id]/page.tsx` is intentionally anonymous.
- Reads/writes billing through RPCs (see migrations section) rather than direct table update.
- Uploads to `unit-media/evidence/`.
- Compresses uploaded image before storage write.

## 4) Backend AI Architecture

### Entry

- `backend/app/main.py`
  - `/api/chat` GET/POST returns `text/event-stream`.
  - Health/config endpoints expose provider availability.

### Agent orchestration

- `backend/app/agent.py`
  - ReAct-like loop with tool calls.
  - Supports mock stream fallback and live tool-calling stream.
  - Emits SSE events (`thinking`, `tool_call`, `tool_result`, `text`, optional UI hints).

### Tooling

- `backend/app/tools.py`
  - `search_internal_db`: vector-based unit search (Supabase RPC `match_units`). **Mock demo data only when Supabase is not configured** — never silently inject Sunway Geo when live DB is empty.
  - `search_iproperty_listings`: Tavily search scoped to `iproperty.com.my` for external market listings when internal inventory is empty or user asks for iProperty.
  - `calculate_commute`: Google Maps Distance Matrix with geometric fallback.
  - `get_web_realtime_info`: Tavily for policy/transit/general facts — **not** listing search.
  - `check_my_own_rental_status`: service-role query for user lease/payment status.
  - `convert_currency_frankfurter`, `get_malaysia_holidays`.

## 5) Database & Storage Architecture

### Key tables

- `users`: tenant profile
- `admin_users`: admin identity/role/payment QR metadata
- `communities`: housing communities
- `units`: inventory records
- `leases`: contract
- `payment_records`: monthly bills + evidence status
- `tenant_interests`: co-renting interest
- `feedback`: student suggestions

### Storage

- Bucket: `unit-media`
  - unit photos: `<unit_id>/...`
  - payment evidence: `evidence/<payment_id>.jpg`
  - admin QR: `qr/<admin_id>.jpg`

### Important constraints

- `units_room_type_check` must include `Whole Unit` (migration 008).
- `payment_records` unique key: `(lease_id, billing_month)`.

## 6) Migrations That Matter

Run in order in Supabase SQL Editor when bootstrapping a new environment:

1. `schema.sql`
2. `migrations/001_add_admin_contact.sql`
3. `migrations/002_limit_admins_and_ui.sql`
4. `migrations/003_corenting.sql`
5. `migrations/004_unit_media.sql`
6. `migrations/005_feedback.sql`
7. `migrations/006_bedrooms_bathrooms.sql`
8. `migrations/007_mobile_upload.sql`
9. `migrations/008_whole_unit_room_type.sql`

Notes:

- `007_mobile_upload.sql` is required for anonymous mobile evidence upload.
- `008_whole_unit_room_type.sql` fixes `units_room_type_check` violation for `Whole Unit`.

## 7) Auth, Roles, and Access Model

- Login is Supabase Auth; app role is app-level lookup:
  - if user exists in `admin_users` -> admin
  - else -> student
- Frontend middleware allows:
  - `/login`
  - `/auth/*`
  - `/mobile-upload/*` (anonymous upload flow)
- `mobile-upload` security relies on UUID bill IDs + limited RPC write surface + storage path policy.

## 8) Payment Evidence End-to-End

1. Student opens bill in `LeaseLedgerCard`.
2. Right QR encodes `/mobile-upload/{payment_id}` (unique per bill).
3. Mobile page fetches bill details through RPC `get_mobile_upload_info`.
4. Image is compressed client-side and uploaded to Storage `evidence/`.
5. RPC `submit_mobile_payment_evidence` sets `evidence_url` + `pending_review`.
6. Admin reviews in `AdminPanel` and approves/rejects.

Important distinction:

- Left QR = shared admin collection QR (same for everyone)
- Right QR = bill-specific upload QR (different for each payment record)

## 9) AI Development Guardrails

When extending this codebase, keep these invariants:

- Never trust frontend role checks alone; enforce DB/RLS or RPC boundaries.
- Keep live/mock parity for critical flows (`supabase.ts` mock branch).
- Avoid direct anonymous table updates for sensitive tables; prefer narrow RPCs.
- Keep upload paths and policies scoped by folder (`evidence/`) to limit blast radius.
- Maintain chronological sorting by `billing_month` in payment UIs.
- For new room types, update:
  - frontend enums (`ROOM_TYPES`)
  - DB constraint migration
  - any AI tool enum filters

## 10) Known Operational Gotchas

- Supabase dashboard `Memory usage` is RAM/cache usage, not DB disk fullness.
- True capacity checks:
  - DB disk: `Settings -> Usage -> Database size`
  - Files: `Storage -> unit-media size`
- 503 in AI chat often means upstream model saturation, not local DB failure.
- Local mobile QR testing requires LAN origin (`192.168.x.x`), not `localhost`.

## 11) Quick Dev Runbook

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
python run.py
```

Recommended checks after major changes:

- student path: listings -> chat -> portal
- admin path: community/unit/lease/payment review flows
- mobile upload path: scan/upload/review
- live mode + mock mode parity for touched features

