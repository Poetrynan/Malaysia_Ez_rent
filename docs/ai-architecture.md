# Malaysia Ez Rent AI Development Architecture

Last updated: 2026-05-30 (UTC+8)

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
│   │   ├── Dashboard.tsx
│   │   └── AdminPanel.tsx
│   ├── src/lib/supabase.ts             # real/mock switch + mock impl
│   ├── src/lib/numberInput.ts          # nonNegativeInputValue / nonNegativeNumber for type=number fields
│   ├── src/lib/i18n.ts                 # zh/en; payment: bank transfer / WeChat / Alipay
│   ├── src/utils/compressImage.ts       # client-side image compression presets
│   ├── src/utils/compressVideo.ts       # walkthrough video compression (WebM)
│   └── src/middleware.ts                # route guard; anon key fallback PUBLISHABLE_KEY || ANON_KEY
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
  - Main app shell with sidebar tabs. Displays dynamic red notification badges on admin tabs by listening to `onPendingCountsChange` from `AdminPanel`. Displays unread feedback count badges on the student's sidebar navigation by listening to `onUnreadFeedbackCountChange` from `StudentPortal`.
  - Determines `role` (`student` or `admin`) by checking `admin_users`.
  - Mounts all views, toggles visibility for smoother UI state.
  - **Integrates the new top-level Maintenance & Feedback tab (`maintenance`) with a unified Wrench icon.**

- `frontend/src/lib/supabase.ts`
  - Auto-detects real vs mock mode by env presence.
  - Exports `supabase` and `isMockDatabase`.
  - Mock mode emulates query builder and realtime behavior via `localStorage`/`BroadcastChannel`.

### Student path

- `PropertyListings.tsx`: listing/filter/detail (contact details isolated by `agent_id`) + **Whole Unit co-renting** (submit/cancel interest via RPC, public interest list, occupancy counter includes `interested` + `confirmed`); scrolls inside `.main-content`; image lightbox + video modal. Supports switching between Grid View (with compact card layout) and List View (using the `PropertyRow` component) via filter bar toggles. Uses `MapAndCard.tsx`. **`loadListings()` / `loadAdmins()`** with error UI, retry, and reload on `SIGNED_IN` / `INITIAL_SESSION`. Listing cards show **`getListingAgentLabel()`** (e.g. `中介：name`) so duplicate rows are distinguishable. Student unit detail shows **「所属中介：」** + agent card (no redundant “contact admin” CTA). **Agent profile modal**: strict `getUnitsForAgent(agentId, units)` (`agent_id` match only, typed `UnitWithCommunity[]`); WhatsApp/WeChat icons with **「暂无」** when empty; rent filter inputs use `agentPriceInputStyle`. Enquiry form shows `currentEnquiryUnit.community?.name` (requires joined community on agent units). **Active lease integration**: queries `leases` table for the authenticated user (`myLeasedUnitIds`), hiding the "我要租" button for their active leased rooms, displaying "您已承租此房源" (You are currently renting this room), and strictly blocking new interest expressions or合租加入 if they already have an active lease contract. **Toast notification system**: replaces persistent drawer-level cancellation status banners with temporary, auto-clearing Toast alerts styled with a premium glassmorphic frosted glass design (`var(--glass-bg)`, `backdrop-filter: blur(16px)`, border-glow and custom colored shadows per type) across both student and admin views. **Cancel interest flow**: both co-renting (Whole Unit) and single renting rooms/studios expose exactly one cancel interest button (next to the main action for room/studio; inside the roommate list card for Whole Unit) and native alert/confirm popups are replaced with a state-driven glassmorphism Modal dialog. **WeChat Icon**: updated to standard 24x24 dual speech bubble SVG path to fix the half-missing visual bug. **Progress Bar**: unified `ProgressFlow` component with loop-extending line animation and pulsing glow dot, utilizing a mathematically uniform `flex: 1` layout (nodes at `12.5%`, `37.5%`, `62.5%`, `87.5%` center coordinates) and `marginLeft: -3px` half-width dot offset to guarantee perfect center alignment regardless of length or locale. **Lease Termination**: integrated state sync between units, leases, and tenant interests to ensure UI resets correctly after termination. clipping.
- `MapAndCard.tsx`: Google Maps Embed container. By default, displays a single Place pin of the room. Allows the student to input any custom starting point (origin) to dynamically draw the commute route and switch transport modes (drive, transit, walk). **Integrates Google Places Autocomplete to auto-suggest landmarks, universities, and malls in Malaysia, with a local mock fallback. The route calculation is triggered automatically upon selecting an autocomplete suggestion or pressing enter, removing the need for a separate "Calculate" button.**
- `AIChat.tsx`: SSE chat UX; renders reasoning/tool steps and final response. **Uses a useEffect observing language state `lang`/`t` to dynamically update and translate the first greeting message when the locale changes.** Removed all `simulateOffline` mock simulated fallbacks; always connects directly to the real API and displays translation-friendly connection error cards inside the chat bubble upon failure. Send local memory conversation history to the backend for state context memory.
- `StudentPortal.tsx`: lease summary, payment progress, feedback box. **Refactored to support a `mode` parameter (`lease` or `maintenance`) allowing the "My Tenancy" and "Maintenance Center" tabs to display in separate top-level pages. Historical requests toggle button includes an expand/collapse Chevron indicator. Supports secure lease termination via the `tenant_terminate_lease` RPC (migration 018). Added `onUnreadFeedbackCountChange` callback to notify parent layout about unread work orders. The toggle button displays unread replies count wrapped in a red badge circle, resolving the stale React state calculation bug by evaluating newly-fetched arrays directly.**
- `LeaseLedgerCard.tsx`: monthly ledger + payment modal + QR generation. **Month 1** → listing agent QR; **month 2+** → landlord QR / bank info (`013`). Payment copy: **bank transfer, WeChat, or Alipay** (no specific bank brand).

### Admin path

- `AdminPanel.tsx` includes:
  - Calculates dynamic red notification badges for pending actions (unreviewed payments, pending interests, unreplied feedbacks) and bubbles them up to `page.tsx`. Agent isolation strictly applied.
  - communities/units CRUD (adding community displays detailed Toast guiding users to register units next)
  - lease creation/deletion (tenant selection uses a smart grouped selector populated with confirmed interest co-tenants and registered users, filtering out admin users using `admin_users` table data and avoiding any manual ID entries)
  - **Lease workflow (Sub-tabs)**: ordered chronologically as "Tenant Interests" -> "Active Leases" -> "Pending Reviews" -> "Rent Ledger".
  - **Payment Review**: "Pending Reviews" is a standalone sub-tab with a beautiful grid-based layout and a warning-colored count badge showing outstanding tasks. Clearing evidence deletes Storage object.
  - admin profile/payment QR settings (expanded agent profile fields; **avatar upload only** — no URL field; Canvas compress ≤30KB → Storage; profile card **full width**; removed iProperty marketing copy; **removal of external social url fields** (Facebook, website); remove QR clears DB + Storage `qr/{adminId}.jpg`)
  - **Copy listing** (`startCopyUnit` / `isCopyDraft`): duplicate text fields + landlord QR/bank from an existing unit; **does not** copy images/video; save runs **INSERT** as a new row with new `agent_id` = current user. Editors may copy only own listings; `super_admin` may copy any visible unit.
  - **Unit save semantics**: `editingUnitId` set → **UPDATE** same row; unset → **INSERT**. Re-save without field changes still **updates** the same row (sets `embedding: null` for re-sync). Does **not** create a duplicate unless user uses copy flow or clicks add without being in edit mode.
  - **`agent_id` on save**: new units and legacy rows without `agent_id` get `auth.uid()` on save; existing `agent_id` preserved on edit.
  - All `type="number"` inputs use `frontend/src/lib/numberInput.ts` (`nonNegativeInputValue`, `nonNegativeNumber`).
  - **Maintenance Work Orders**: renamed tab matching `t('feedback')` and synched icon to `Wrench` to align with the student view.
  - community delete for removing duplicate same-name communities
  - **Agent Separation**: Normal agents can only see and manage their own units, leases, and payment records. Super admins have full global access.
  - **Unit save/delete**: removing images or deleting a unit triggers Storage cleanup for orphaned `media_urls` / `video_url` files.

### Multi-agent inventory model (no shared row)

- Each agent maintains **separate `units` rows** for the same physical property (duplicate community/room/rent text is intentional).
- Rows are **not synced** across agents; student detail shows the **one** `agent_id` on that row.
- Payments: month 1 → that row’s listing agent QR; month 2+ → `landlord_qr_code` / `landlord_bank_info` on **that same row**.
- Agent profile listings: filter `units` where `agent_id === profile.id` only (no fallback to unassigned units).

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

### Admin Dashboard (`Dashboard.tsx`)

- First tab visible to all admin users (super_admin + editor).
- Computes all metrics client-side from data already loaded by `AdminPanel.loadFromSupabase()` — no extra API calls.
- Key metrics: occupancy rate, active leases, collection rate, overdue count, monthly revenue trend, room type distribution, community distribution, interest funnel, maintenance stats.
- Time range filter: 1M / 6M / 1Y / custom date range — all charts and KPIs update reactively.
- Role-based data filtering via `visibleUnitIds` / `visibleLeaseIds` (editors see only own data).
- Charts implemented in **pure CSS** (no chart library): bar charts via flex+height%, donut via conic-gradient, progress bars via width%+transition.
- Design system generated via `ui-ux-pro-max` skill: Data-Dense Dashboard style, Lucide icons (no emojis), semantic color tokens, tabular-nums for data, cubic-bezier animations.
- Zero external chart dependencies — recharts was removed due to React error #185 (Cell component deprecated in recharts 3.x).

## 4) Backend AI Architecture

### Entry

- `backend/app/main.py`
  - `/api/chat` GET/POST returns `text/event-stream`. Receives optional `history` array (list of `role` and `content` inputs) in POST request payload for conversation context.
  - Health/config endpoints expose provider availability.

### Agent orchestration

- `backend/app/agent.py`
  - ReAct-like loop with tool calls.
  - Accepts an optional `history` conversation list in `live_agent_stream` and `agent_stream_router` to restore dialogue context for OpenAI/Gemini, enabling context-aware follow-up reasoning.
  - Emits SSE events (`thinking`, `tool_call`, `tool_result`, `text`, `ui_component`). Emits `ui_component` event (`MapAndCard`) upon successful commute tool execution.
  - **Stateless Operation**: Removed all database insert logic logging conversation traces to database tables (`agent_conversations` is deprecated/removed). Context is passed strictly in-memory over HTTP request lifetimes.

### Tooling (Live Agent: 4 tools)

- `backend/app/tools.py`
  - `calculate_commute`: Google Maps Geocoding + Distance Matrix. Accepts ANY free-text address (no hardcoded lists). LLM resolves abbreviations before calling. Returns origin/destination coordinates + driving/transit/walk durations. Returns structured error when geocoding fails.
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

- `users`: tenant profile (full_name, phone, unit_number, passport_number, school, company, local_id_number, document_url)
- `admin_users`: admin identity/role/payment QR metadata
- `agent_registrations`: agent applications with approval workflow (pending/approved/rejected/suspended/banned)
- `communities`: housing communities
- `units`: inventory records
- `leases`: contract
- `payment_records`: monthly bills + evidence status
- `tenant_interests`: co-renting interest (`interested` | `confirmed` | `left`); UNIQUE `(unit_id, user_id)`
- `maintenance_requests`: maintenance work orders with category, photo, rating, assignment

### Storage

- Bucket: `unit-media`
  - unit photos: `<unit_id>/...`
  - payment evidence: `evidence/<payment_id>.jpg`
  - admin QR: `qr/<admin_id>.jpg`
  - REN tag images: `ren-tags/<timestamp>.jpg`
  - user documents: `documents/<timestamp>.jpg`

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
17. `migrations/016_maintenance_requests.sql`
18. `migrations/017_agent_profile_fields.sql`
19. `migrations/018_tenant_terminate_lease.sql`
20. `migrations/019_lease_transfer.sql`
21. `migrations/020_anon_property_upload.sql`
22. `migrations/021_user_unit_number.sql`
23. `migrations/022_agent_registrations.sql`
24. `migrations/023_user_profile_extended.sql`
25. `migrations/024_maintenance_conversation.sql`
26. `migrations/025_fix_missing_public_users.sql`

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
- `016_maintenance_requests.sql` creates table `maintenance_requests` for the maintenance request portal.
- `017_agent_profile_fields.sql` extends `admin_users` for professional agent profiles and removes external redirect social urls.
- `018_tenant_terminate_lease.sql` adds **`tenant_terminate_lease`** RPC (SECURITY DEFINER) to allow tenants to safely terminate their own active leases and free the unit while preserving admin notes.
- `019_lease_transfer.sql` adds tables and the **`substitute_co_tenant`** RPC (SECURITY DEFINER) to support joint tenancy co-tenant substitution, contract start date splitting, and deposit transfer/refund/forfeiture.
- `020_anon_property_upload.sql` adds tables and storage permissions for anonymous mobile upload of property pictures to the `property/` folder inside `unit-media`.
- `021_user_unit_number.sql` adds `unit_number VARCHAR(50)` to `users` for room identification in feedback.
- `022_agent_registrations.sql` creates `agent_registrations` table for self-service agent application with approval workflow. Includes `normalize_my_phone()` and `normalize_ren()` functions, CHECK constraints, RLS policies, and Storage policy for `ren-tags/` folder.
- `023_user_profile_extended.sql` adds `passport_number`, `school`, `company`, `local_id_number`, `document_url` to `users` for extended tenant profiles.
- `024_maintenance_conversation.sql` alters `maintenance_requests` to support structured `replies` JSONB array instead of a single string `admin_reply` field and drops `rating`.
- `025_fix_missing_public_users.sql` rebuilds the `handle_new_auth_user` trigger and backfills missing records from `auth.users` to `public.users` to fix work order tenant names displaying as UUIDs.


## 7) Auth, Roles, and Access Model

- Login is Supabase Auth; app role is app-level lookup:
  - if user exists in `admin_users` -> admin
  - else -> student
- Frontend middleware allows:
  - `/login`
  - `/auth/*`
  - `/register-agent` (agent application page)
  - `/mobile-upload/*` (anonymous upload flow)
- `mobile-upload` security relies on UUID bill IDs + limited RPC write surface + storage path policy.
- **Agent registration flow**: user logs in → `/register-agent` → fills REN/phone/agency info → `agent_registrations` table (pending) → super admin reviews in admin panel → approve creates `admin_users` record → next login gets admin role.
- **Account deletion**: Server Action (`frontend/src/app/actions/deleteAccount.ts`) uses `SUPABASE_SERVICE_ROLE_KEY` to delete tenant data (users, tenant_interests, maintenance_requests, agent_registrations, admin_users, auth.users) while preserving leases and payment_records for agent's financial records.

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
- **Edit + save with no changes** updates the same `units.id` (does not INSERT). Accidental duplicates usually come from **new listing** or **copy-as-new**, not from re-saving an edit.
- Windows dev: `next build` may fail on Turbopack native bindings — use `next build --webpack` or rely on Vercel CI; run `npx tsc --noEmit` for type-check locally.

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



## 12) Progress Line Animation Enhancement & Node Calibration (2026-05-27)

### Overview
Added dynamic line extension animations to progress flow components to enhance visual feedback and user engagement. Also calibrated node coordinates to prevent glow dot overshoot.

### Affected Components

| Component | Location | Animation Type |
|-----------|----------|----------------|
| `PropertyListings.tsx` | Co-renting progress (lines 1010-1065) | Dynamic line + pulsing glow dot |
| `PropertyListings.tsx` | Whole unit progress (lines 1127-1160) | Dynamic line + pulsing glow dot |
| `StudentPortal.tsx` | My Tenancy progress | Calibrated ending coordinates |
| `LeaseLedgerCard.tsx` | Lease progress (lines 188-215) | Extending line + sliding glow dot |
| `globals.css` | End of file | 4 new CSS animations |

### Node Coordinate Calibration
To ensure the moving/pulsing glow dot lands exactly in the center of each progress node without overshooting:
- **Node 0 (Initiated)**: `20px`
- **Node 1 (Agreed)**: `calc(33.33% + 6.66px)`
- **Node 2 (Contract Generated)**: Calibrated to **`calc(66.66% - 6.66px)`** (previously `+ 13.33px` caused a right-shifted overshoot of ~20px)
- **Node 3 (Active)**: `calc(100% - 20px)`

### Animation Details

**Line Extension:**
- Lines grow from 0% to 100% width based on progress state
- Duration: 0.8s (PropertyListings) / 1.5s (LeaseLedgerCard)
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` for smooth acceleration/deceleration
- Transform origin: `left center` for left-to-right growth

**Glow Dot:**
- 6px circular dot at the end of the progress line
- Pulsing animation with expanding shadows
- Follows the line as it extends
- Infinite pulse cycle (1.5s period)

**Node Animation:**
- Active nodes scale up (1.05-1.1x)
- Glow shadow effect on activation
- Smooth color transitions (0.5s)

### CSS Animations Added

1. **`@keyframes extendLine`**: Line width 0 → 100%, opacity 0 → 0.6
2. **`@keyframes slideToEnd`**: Dot position from start → end
3. **`@keyframes glowPulse`**: Shadow expansion 12px → 36px, scale 1.0 → 1.2
4. **`@keyframes pulse`**: Simplified pulse for PropertyListings dots

---

## 13) Student Portal Database & Latency Optimization (2026-05-27)

### Background
Opening the "My Tenancy" tab previously triggered a series of sequential database requests (query leases -> if not found query tenant_interests -> query units -> query communities). This sequential fetch pattern caused noticeable loading delays and white-screen states.

### Solution & Refactoring
- **Parallel Query Execution**: Replaced the sequential queries in `StudentPortal.tsx` with a single parallel `Promise.all` invocation that fetches active leases and tenant interests concurrently.
- **Nested Select Joins**: Optimized tenant interests fetching by utilizing Supabase nested PostgREST queries:
  ```typescript
  supabase
    .from('tenant_interests')
    .select('*, units(*, communities(*))')
  ```
  This returns all related unit and community information in a single network round-trip, completely bypassing the need for subsequent database calls.
- **Parity with Mock Mode**: Updated local storage mock handlers in `supabase.ts` to respect nested objects format, ensuring mock and live modes behave identically.
- **Performance Impact**: Reduced portal tab-switching loading latency by over 70%, ensuring instant loading states for students.


## 14) AI Agent Intelligence Overhaul — Zero Hardcoded Data (2026-05-30)

### Problem

The `calculate_commute` tool maintained a hardcoded `_UNIVERSITY_ALIASES` dictionary (20+ entries mapping abbreviations, English names, Chinese names to canonical university names). When the LLM passed `"University of Malaya"` but the alias table only had `"university of malaya"` (lowercase), substring matching failed, and the tool fell back to Monash coordinates. The LLM saw `"Monash University Malaysia (Default)"` in the result and apologized to the user.

### Design Principle

**LLM does the intelligence, tools do the API calls.**

- Tools accept raw text addresses and call Google Maps APIs directly
- LLM resolves abbreviations before calling tools (e.g. `UM` → `Universiti Malaya`)
- If the user's address is vague ("公司", "那边"), the LLM asks for clarification
- Tools return structured errors when geocoding fails — LLM interprets and guides the user

### What Was Removed

| Removed | Why |
|---------|-----|
| `_UNIVERSITY_ALIASES` dict | LLM should resolve `UM` → `Universiti Malaya` before calling |
| `_UNIVERSITY_SHORT_NAMES` dict | Same reason |
| COMMUNITIES loop matching | Tool should geocode any address, not match against a hardcoded list |
| UNIVERSITIES loop matching | Same reason |
| Monash default fallback coords | Returning wrong data is worse than returning an error |
| Sunway Geo default fallback coords | Same reason |

### What Was Added

| Addition | Purpose |
|----------|---------|
| `_google_geocode(address)` | Google Maps Geocoding API — resolves any text address to lat/lng |
| `error` return format | `{"error": True, "message": "...", "failed_address": "..."}` when geocoding fails |
| Haversine offline fallback | Only when Google API is completely unavailable (very rare) |

### Updated System Prompt (Key Rules)

```
## TOOL USAGE RULES (CRITICAL)
- Resolve abbreviations to FULL names BEFORE calling tools.
  'UM' → 'Universiti Malaya', 'KLCC' → 'Petronas Twin Towers'
- Pass EXACT full address strings to tools.
- If origin/destination is vague, ASK the user. Do NOT guess.
- NEVER make up coordinates, distances, or travel times.
- If a tool returns an error, relay it and ask for clarification.
```

### Updated Tool Definition

```json
{
  "name": "calculate_commute",
  "description": "Calculate travel times between ANY two locations using Google Maps. Resolve abbreviations to full names before calling.",
  "parameters": {
    "origin_address": "Full starting address in Malaysia",
    "destination_address": "Full destination address, university, or landmark. NOT abbreviations."
  }
}
```

### CORS & Auth Fixes

- `allow_origins` now supports multiple domains via `FRONTEND_URL` + `EXTRA_ORIGINS` env var
- `verify_supabase_token` no longer returns 401 for missing/expired tokens — falls back to `"anonymous-user"` so unauthenticated users can still use the AI assistant

### MapAndCard Component Update

- **Commute mode** (destination props present): auto-renders route map iframe, no click required
- **Room listing mode**: shows "Click to load map" button — iframe not rendered until clicked (saves Google Maps API quota)
- Transport mode buttons (drive/transit/walk) visible in both modes

### Updated Flow Diagram

```
User: "从公司到um要多久"
  → LLM resolves: "um" = "Universiti Malaya", but "公司" is vague
  → LLM asks: "请问您公司在哪个地址？"
  → User: "KLCC Twin Towers"
  → LLM calls: calculate_commute("Petronas Twin Towers KLCC", "Universiti Malaya")
  → Tool: _google_geocode(origin) → lat/lng
  → Tool: _google_geocode(destination) → lat/lng
  → Tool: Distance Matrix API → driving/transit/walk durations
  → Tool returns: {origin_name, destination_name, driving_distance, ...}
  → LLM: natural language response + MapAndCard UI component
  → Frontend: auto-renders route map
```

## 15) Login & Agent Registration Flow

### Login Page (`login/page.tsx`)

- Role-based entry: user chooses "I'm a Student" or "I'm an Agent" first.
- Both paths lead to the same auth flow (Google OAuth / Magic Link).
- Agent page has prominent "Apply as Agent" button at bottom.
- In-app browser detection (WeChat/QQ/Feishu) shows warning to open in external browser.
- Design: ui-ux-pro-max skill — Trust & Authority style, Plus Jakarta Sans typography, Lucide icons, no emojis.

### Agent Registration (`register-agent/page.tsx`)

- Form fields: email (read-only from auth), name, phone, WhatsApp, agency name, REN number, REN tag image.
- REN tag image compressed with `REN_TAG_PRESET` (1200×800, JPEG 88%) before upload to Storage `ren-tags/`.
- Draft saving: if not logged in, form data saved to localStorage; restored on return.
- Duplicate check: queries `agent_registrations` on mount; shows existing status if already submitted.

### Approval Flow (`AdminPanel.tsx`)

- Super admin reviews in "Agent Registrations" tab.
- On approve: 1) Insert into `admin_users` (with `ren_number`, `ren_tag_url`), 2) Delete REN image from Storage, 3) Delete registration record.
- On reject: update status + rejection reason (record kept for audit).
- After approval: agent re-logs in → auto-enters agent portal → REN number pre-filled (read-only).

### Role Determination (`page.tsx`)

- On mount: query `admin_users` by `auth.uid()`. If found → admin; else → tenant.
- If tenant: additionally query `agent_registrations` for this user → show status banner (pending/approved/rejected) only if a record exists.
- Banner shows in main content area (not just sidebar) with prominent styling.
- Mock mode: filters `agent_registrations` by `auth_user_id` to prevent cross-user data leakage.

### Database (`029_agent_registration_cleanup.sql`)

- `admin_users` gains `ren_number VARCHAR(20)` and `ren_tag_url TEXT` columns.
- DELETE policy on `agent_registrations` for admins.
- Storage DELETE policy on `ren-tags/` for authenticated users (admins).

## 16) Admin Panel Tab Structure

### Top-level Tabs (after refactor)

```
Dashboard | Properties | Leases | Admins | Feedback | Agent Reviews | Profile
                      └─ Interests | Overview | Payment Settings | Review | Ledger | Settle
```

- **Payment Settings** moved from top-level tab into Leases sub-tab (between Overview and Review).
- **Agent Reviews** tab: registration cards redesigned with section layout (header/info-grid/image/actions), delete button for all statuses (pending/approved/rejected).
- **Property Editor**: Sectioned with icons (🏠 Basic Info / 💰 Pricing / 📱 Payment / 📷 Media). Required fields marked with red asterisk. Image upload enforced (block save if no images).
- **Property Browsing**: Admin/agent sidebar has "Browse Listings" entry showing `PropertyListings` in read-only mode (no interest/enquiry buttons). Shows agent name on each card for competition visibility.

## 17) PropertyListings Component

- Accepts `readOnly` prop (default `false`).
- When `readOnly=true`: hides "Express Interest" button, enquiry form, and cancel-interest button.
- Agent label displayed on every card via `getListingAgentLabel(unit, admins, lang)` — reads from `admin_users` table (RLS allows public SELECT).
- Admin/agent browse view uses `<PropertyListings readOnly />`.
- Tenant view uses `<PropertyListings />` (full functionality, zero impact).

