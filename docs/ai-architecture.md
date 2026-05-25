# Malaysia Ez Rent AI Development Architecture

Last updated: 2026-05-25 (UTC+8)

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
│   ├── src/lib/i18n.ts                 # zh/en; payment: bank transfer / WeChat / Alipay
│   ├── src/utils/compressImage.ts       # client-side image compression presets
│   ├── src/utils/compressVideo.ts       # walkthrough video compression (WebM)
│   └── src/middleware.ts                # route guard with mobile-upload allowlist
├── backend/
│   └── app/
│       ├── main.py                      # FastAPI + SSE endpoints
│       ├── agent.py                     # ReAct loop/tool-calling orchestration
│       ├── tools.py                     # commute, web info (no external listings), status helpers
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

- `PropertyListings.tsx`: listing/filter/detail (contact details isolated by `agent_id`) + **Whole Unit co-renting** (submit/cancel interest via RPC, public interest list, occupancy counter includes `interested` + `confirmed`); scrolls inside `.main-content`; image lightbox + video modal. Uses `MapAndCard.tsx`.
- `MapAndCard.tsx`: Google Maps Embed container. By default, displays a single Place pin of the room. Allows the student to input any custom starting point (origin) to dynamically draw the commute route and switch transport modes (drive, transit, walk). **Integrates Google Places Autocomplete to auto-suggest landmarks, universities, and malls in Malaysia, with a local mock fallback. The route calculation is triggered automatically upon selecting an autocomplete suggestion or pressing enter, removing the need for a separate "Calculate" button.**
- `AIChat.tsx`: SSE chat UX; renders reasoning/tool steps and final response.
- `StudentPortal.tsx`: lease summary, payment progress, feedback box.
- `LeaseLedgerCard.tsx`: monthly ledger + payment modal + QR generation. **Month 1** → listing agent QR; **month 2+** → landlord QR / bank info (`013`). Payment copy: **bank transfer, WeChat, or Alipay** (no specific bank brand).

### Admin path

- `AdminPanel.tsx` includes:
  - Role-based tabs with dynamic red notification badges for pending actions (Leases tab: unreviewed payments + pending interests; Feedback tab: unreplied feedbacks). Agent isolation strictly applied.
  - communities/units CRUD (adding community displays detailed Toast guiding users to register units next)
  - lease creation/deletion
  - payment review (approve/reject/clear evidence with Toast feedback; **clear evidence deletes Storage object**)
  - admin profile/payment QR settings (remove QR clears DB + Storage `qr/{adminId}.jpg`)
  - feedback handling
  - community delete for removing duplicate same-name communities
  - **Agent Separation**: Normal agents can only see and manage their own units, leases, and payment records. Super admins have full global access.
  - **Unit save/delete**: removing images or deleting a unit triggers Storage cleanup for orphaned `media_urls` / `video_url` files.

### Privacy Constraints

- **Door Number Removal**: All door numbers (`unit_number`) are completely hidden from all visual displays across the student portal, AI chat, admin panel (including table list and dropdowns), and mobile upload pages.

### Mobile evidence upload

- `app/mobile-upload/[id]/page.tsx` is intentionally anonymous.
- Reads/writes billing through RPCs rather than direct table update.
- Uploads to `unit-media/evidence/`.
- Compresses uploaded image before storage write.
- Display info (community & room type) is resolved securely.

### Whole Unit co-renting (`tenant_interests`)

- **Whole Unit only**: note form + public list of interested/confirmed tenants on the unit detail drawer.
- **Submit**: `submit_tenant_interest(p_unit_id, p_note)` RPC (migration **015**); upsert on `(unit_id, user_id)`; status `interested`.
- **Cancel**: student self-service — `cancel_tenant_interest(p_unit_id)` sets `status = left` (**no admin rejection required**).
- **UI occupancy**: `registered/max` = (`interested` + `confirmed`) / `max_occupants`; full when `confirmed >= max`.
- **Visibility**: SELECT policy `Anyone can view interests` — other seekers on the same unit see name, email, note, status.
- **Identity in UI**: `authUserId` from `onAuthStateChange` drives "my interest" + cancel buttons (top bar + row marked "Me").
- Fallback: direct table insert/update if RPC missing (requires migration **014** UPDATE policy).

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

### Tooling (Live Agent: 4 tools)

- `backend/app/tools.py`
  - `calculate_commute`: Google Maps Distance Matrix with geometric fallback.
  - `get_web_realtime_info`: Tavily for policy/transit/general facts — **NOT for property listings**. Query excludes iProperty, PropertyGuru, SpeedHome, Mudah, iBilik, etc.
  - `convert_currency_frankfurter`, `get_malaysia_holidays`.

**Not exposed to Live Agent (by design):**

- `search_internal_db` — legacy/Mock helper only; room browsing is **Property Listings tab**, not AI chat.
- `check_my_own_rental_status` — lease/bills are **Student Portal tab**, not AI chat.
- ~~`search_iproperty_listings`~~ — **removed / forbidden**. Never call Tavily for iProperty or any external rental site.

### Media compression (frontend)

- `compressImage.ts`: Canvas JPEG — evidence, unit photos, admin QR.
- `compressVideo.ts`: MediaRecorder WebM — max 1280×720, ~1.2 Mbps, skip if ≤12MB.
- Live: images → `units.media_urls[]`; video → `units.video_url` (migration **009**).

### Storage delete lifecycle (Live mode)

| Action | DB | Storage `unit-media` |
|--------|----|--------------------|
| Admin clear evidence | clears `evidence_url`, status | removes `evidence/{paymentId}.jpg` |
| Delete unit | deletes row | removes all `media_urls` + `video_url` objects |
| Edit unit, remove image | updates `media_urls` | removes dropped URL objects |
| Remove admin QR | `payment_qr_code = null` | removes `qr/{adminId}.jpg` |
| Student | upload only | cannot delete evidence |

## 5) Database & Storage Architecture

### Key tables

- `users`: tenant profile
- `admin_users`: admin identity/role/payment QR metadata
- `communities`: housing communities
- `units`: inventory records
- `leases`: contract
- `payment_records`: monthly bills + evidence status
- `tenant_interests`: co-renting interest (`interested` | `confirmed` | `left`); UNIQUE `(unit_id, user_id)`
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
10. `migrations/009_unit_video_url.sql`
11. `migrations/010_agent_qr_separation.sql`
12. `migrations/011_optional_unit_number.sql`
13. `migrations/012_remove_unit_number_display.sql`
14. `migrations/013_landlord_payment_details.sql`
15. `migrations/014_tenant_interests_user_update.sql`
16. `migrations/015_tenant_interest_rpc.sql`

Notes:

- `007_mobile_upload.sql` is required for anonymous mobile evidence upload.
- `008_whole_unit_room_type.sql` fixes `units_room_type_check` violation for `Whole Unit`.
- `009_unit_video_url.sql` adds `units.video_url` for walkthrough videos in Storage.
- `010_agent_qr_separation.sql` adds listing agent binding and routes payments to specific agent QR codes.
- `011_optional_unit_number.sql` drops the `NOT NULL` constraint on `units.unit_number`.
- `012_remove_unit_number_display.sql` updates `get_mobile_upload_info` RPC to return `room_type` instead of `unit_number` for privacy.
- `013_landlord_payment_details.sql` adds `landlord_qr_code` and `landlord_bank_info` to `units` for splitting payments (Deposit/1st month rent to Agent, subsequent rents to Landlord).
- `014_tenant_interests_user_update.sql` adds RLS so students can UPDATE their own `tenant_interests` row (cancel / re-submit fallback).
- `015_tenant_interest_rpc.sql` adds **`submit_tenant_interest`** and **`cancel_tenant_interest`** (SECURITY DEFINER, ON CONFLICT upsert). **Required for reliable co-rent submit/cancel in production.**

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
2. **Left panel**: collection QR or landlord bank info — **month 1** uses listing agent QR; **month 2+** uses `landlord_qr_code` / `landlord_bank_info` (migration 013). Missing landlord info shows a warning; no agent QR fallback on later months.
3. **Right QR** encodes `/mobile-upload/{payment_id}` (unique per bill).
4. Mobile page fetches bill details through RPC `get_mobile_upload_info` (no `unit_number` exposed).
5. Image is compressed client-side (`EVIDENCE_IMAGE_PRESET`) and uploaded to Storage `evidence/`.
6. RPC `submit_mobile_payment_evidence` sets `evidence_url` + `pending_review`.
7. Admin reviews in `AdminPanel`, approves/rejects, or **clear evidence** (DB + Storage).

### Payment copy (i18n)

Product strings support **bank transfer, WeChat, or Alipay** (no specific bank/wallet brand in payment UI):

- `duitnowWarning`, `payToAgent`, `payToLandlord`, `scanToUploadDesc`, `uploadQR` in `frontend/src/lib/i18n.ts`
- Admin contact fields may still show WeChat for **support contact**, separate from payment instructions.

Important distinction:

- Left QR / bank block = where to pay (agent vs landlord by billing month)
- Right QR = bill-specific upload QR (different for each payment record)

## 9) AI Development Guardrails

When extending this codebase, keep these invariants:

- Never trust frontend role checks alone; enforce DB/RLS or RPC boundaries.
- Keep live/mock parity for critical flows (`supabase.ts` mock branch).
- Avoid direct anonymous table updates for sensitive tables; prefer narrow RPCs.
- Keep upload paths and policies scoped by folder (`evidence/`) to limit blast radius.
- When clearing media in admin flows, update **both** Postgres and Storage (see Storage delete lifecycle).
- Maintain chronological sorting by `billing_month` in payment UIs.
- Never scrape, link, or recommend third-party rental listings (iProperty, PropertyGuru, etc.).
- For co-renting, prefer RPC **015** over raw table writes; never require admin action for student self-cancel.
- For new room types, update frontend enums (`ROOM_TYPES`), DB constraint migration, and any legacy tool filters.

## 10) Known Operational Gotchas

- Supabase dashboard `Memory usage` is RAM/cache usage, not DB disk fullness.
- True capacity checks:
  - DB disk: `Settings -> Usage -> Database size`
  - Files: `Storage -> unit-media size`
- 503 in AI chat often means upstream model saturation, not local DB failure.
- **External listing search is forbidden** — no iProperty/PropertyGuru via Tavily or any other path. Direct users to the Property Listings tab for inventory.
- **Co-rent submit/cancel broken?** Run migrations **014 + 015** in Supabase; redeploy frontend; hard-refresh browser.
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
- co-rent path: Whole Unit → submit interest → see count/list → self-cancel → admin confirm

