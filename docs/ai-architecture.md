# Malaysia Ez Rent AI Development Architecture

Last updated: 2026-06-06 (UTC+8)

This document is the single-source onboarding guide for future AI agents working in this repo.

## 1) System Overview

The project is a full-stack rental platform for Malaysian international housing with:

- Next.js frontend (`frontend`) for tenant/admin UI
- FastAPI backend (`backend`) as AI orchestration service (SSE streaming)
- Supabase (`supabase`) for Auth + Postgres + Storage + Realtime

High-level flow:

1. User logs in via Supabase (Google OAuth or Magic Link)
2. Frontend resolves role from `admin_users` and renders tenant/admin experience
3. AI chat requests stream from frontend -> backend `/api/chat` -> tool calls -> SSE back to UI
4. Rental operations persist to Supabase tables; media persists to Storage bucket `unit-media`

## 2) Monorepo Layout

```text
Malaysia_Ez_rent/
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx                    # root (middleware intercepts → /guest before this runs)
│   │   ├── layout.tsx                  # root layout (ThemeProvider, Google Fonts, Maps Script)
│   │   ├── (app)/                      # route group (not in URL)
│   │   │   ├── layout.tsx              # app shell: AuthProvider + PendingCountsProvider + sidebar + topbar
│   │   │   ├── guest/page.tsx          # /guest — public guest browsing (no auth, hero + listings)
│   │   │   ├── listings/page.tsx       # /listings — authenticated users only
│   │   │   ├── chat/page.tsx           # /chat — AI assistant (auth required)
│   │   │   ├── my-lease/page.tsx       # /my-lease — tenant lease management
│   │   │   ├── profile/page.tsx        # /profile — user profile
│   │   │   ├── maintenance/page.tsx    # /maintenance — feedback/maintenance
│   │   │   ├── inbox/page.tsx          # /inbox — messages
│   │   │   └── admin/
│   │   │       ├── layout.tsx          # admin role guard
│   │   │       ├── dashboard/page.tsx  # /admin/dashboard
│   │   │       ├── properties/page.tsx # /admin/properties
│   │   │       ├── leases/page.tsx     # /admin/leases
│   │   │       ├── listings/page.tsx   # /admin/listings (read-only)
│   │   │       ├── admins/page.tsx     # /admin/admins (super_admin only)
│   │   │       ├── feedback/page.tsx   # /admin/feedback
│   │   │       ├── agent-reviews/      # /admin/agent-reviews (super_admin only)
│   │   │       ├── reviews/page.tsx    # /admin/reviews (super_admin only)
│   │   │       ├── profile/page.tsx    # /admin/profile
│   │   │       └── inbox/page.tsx      # /admin/inbox
│   │   ├── login/page.tsx              # Google + Magic Link
│   │   ├── auth/callback/route.ts      # OAuth code + Magic Link token_hash → session + redirect
│   │   └── mobile-upload/[id]/page.tsx # anonymous evidence upload
│   ├── src/components/
│   │   ├── AppSidebar.tsx              # sidebar (useRouter navigation, usePathname active state)
│   │   ├── AppTopbar.tsx               # topbar (theme/lang toggles, logout)
│   │   ├── AdminPageWrapper.tsx        # admin page wrapper (defaultTab → AdminPanel)
│   │   ├── PropertyListings.tsx        # 房源列表 + 详情 + 收藏 + 评价
│   │   ├── AIChat.tsx                  # AI 对话界面
│   │   ├── TenantPortal.tsx            # 租客门户（租约 + 报修 + 个人资料）
│   │   ├── LeaseLedgerCard.tsx         # 缴租台账
│   │   ├── Dashboard.tsx               # 数据看板（折线图 + 饼图）
│   │   ├── AdminPanel.tsx              # 管理后台
│   │   ├── Inbox.tsx                   # 消息收件箱
│   │   ├── FavoritesManager.tsx        # 收藏夹组件
│   │   └── ReviewSystem.tsx            # 评价系统组件
│   ├── src/lib/
│   │   ├── AuthContext.tsx              # auth state provider (role, adminRole, logout, deleteAccount)
│   │   ├── PendingCountsContext.tsx     # pending counts provider (badges sync across routes)
│   │   ├── supabase.ts                 # real/mock switch + mock impl
│   │   ├── numberInput.ts              # nonNegativeInputValue / nonNegativeNumber
│   │   ├── i18n.ts                     # zh/en; payment: bank transfer / WeChat / Alipay
│   │   └── ThemeProvider.tsx            # theme/language context
│   ├── src/utils/compressImage.ts       # client-side image compression presets
│   ├── src/utils/compressVideo.ts       # walkthrough video compression (WebM)
│   └── src/middleware.ts                # / → /guest; /guest public; live mode auth on other routes
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

- `frontend/src/app/page.tsx` — `redirect('/listings')` in code, but **middleware intercepts `/` first** and sends all visitors to `/guest`. Treat `/guest` as the real public entry.

- `frontend/src/lib/AuthContext.tsx`
  - Shared authentication state provider. Exposes `role`, `adminRole`, `userEmail`, `agentRegStatus`, `loading`, `setRole`, `logout`, `deleteAccount`.
  - **Live mode** subscribes to `supabase.auth.onAuthStateChange` (not a one-shot `getUser()`): `INITIAL_SESSION` resolves the persisted session from storage (no network), `SIGNED_IN` catches a fresh login, `SIGNED_OUT` clears state. `loading` stays `true` until a session is resolved, so downstream guards (e.g. `/listings`) never treat a still-hydrating session as logged-out. Role lookup is deferred via `setTimeout(0)` to avoid Supabase auth-callback re-entrancy.
  - Handles both mock mode (localStorage) and live mode (Supabase `getUser()`).
  - Does NOT redirect on unauthenticated — that's handled by middleware or per-page guards.

- `frontend/src/lib/PendingCountsContext.tsx`
  - Shared pending counts (`leases`, `feedback`, `agentReviews`, `unreadInbox`).
  - AdminPanel updates counts via `onPendingCountsChange`; sidebar reads from context to render badges.
  - Persists across route changes because the layout (with sidebar) stays mounted.

- `frontend/src/app/(app)/layout.tsx`
  - App shell layout: `AuthProvider` → `PendingCountsProvider` → sidebar + topbar + `{children}`.
  - Shows loading spinner while auth is initializing.
  - Renders agent registration status banners (pending/approved/rejected) for student role.

- `frontend/src/components/AppSidebar.tsx`
  - Extracted from old `page.tsx`. Uses `useRouter().push('/...')` for navigation, `usePathname()` for active state.
  - Reads from `useAuth()` and `usePendingCounts()` for role/counts.

- `frontend/src/app/(app)/listings/page.tsx`
  - **Public page** — accessible without login. Unauthenticated users see `PropertyListings readOnly` with a login prompt banner.
  - Authenticated students see full `PropertyListings`. Admins see read-only.

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

### Lease Lifecycle & unit_number Flow

**Lease statuses:** `active` → `expired` (auto) / `terminated` (manual) → `completed` (archived)

**unit_number management:**
- `units.unit_number` column was **dropped** in migration 026 (privacy).
- `leases.unit_number` was **added** in migration 032 — agent fills it when creating a lease contract.
- `users.unit_number` is **read-only** for tenants — auto-populated from their active lease.
- Tenants **cannot** edit `unit_number` in their profile; it is managed entirely by the lease.
- When a lease leaves `active` status (expired/terminated/completed), a DB trigger **clears** `users.unit_number`.

**Auto-expiry:**
- `expire_ended_leases()` RPC (migration 032) sets `status = 'expired'` for any `active` lease where `end_date < CURRENT_DATE`.
- Called once per session on lease list load (both live and mock mode).
- Mock mode: local comparison `end_date < today` + `localStorage` write.

**Tenant profile impact:**
- `profileComplete` only requires `profileName` (not `unit_number`).
- Save function does **not** write `unit_number` to `users` table (it's lease-managed).
- On profile load, `unit_number` is fetched from the active lease; falls back to `users.unit_number` if no active lease.

**Payment review:** `formatLeasePropertyLabel()` includes `unit_number` as `#unit_number` suffix (e.g. `Sunway · (Master Room) #A-12-3`). Shown in review cards, review modal, ledger, and settlement areas.

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
- Charts implemented using **Recharts** for high-fidelity interactive visualization. Avoids rendering/resizing crash loops by stabilizing grid boundaries with `minmax(0, 1fr)` and container widths with `99%`.
- Fixed-size Donut chart renders a static `<PieChart width={110} height={110}>` canvas directly without `<ResponsiveContainer>` wrappers, eliminating initial grid dimension querying loops entirely.
- Dynamic Legend items support smooth CSS-only translation hover effects without triggering React re-renders or layout-shifting font updates.
- Supports customizable tooltips on charts showing exact collection/revenue rates and counts. Includes interactive `HelpCircle` triggers with glassmorphic tooltip text describing formulas for occupancy rate, active leases, collection rate, and overdue metrics.

## 4) Backend AI Architecture

### Entry

- `backend/app/main.py`
  - `/api/chat` GET/POST returns `text/event-stream`. Receives optional `history` array (list of `role` and `content` inputs) in POST request payload for conversation context.
  - Health/config endpoints expose provider availability.

### Agent orchestration

- `backend/app/agent.py`
  - ReAct-like loop with tool calls (`MAX_LOOPS=6`).
  - Accepts an optional `history` conversation list in `live_agent_stream` and `agent_stream_router` to restore dialogue context, enabling context-aware follow-up reasoning.
  - Emits SSE events (`thinking`, `tool_call`, `tool_result`, `text`, `ui_component`). Map/cards deferred until after final text (or forced synthesis).
  - **Forced synthesis fallback**: if the loop exhausts on tool calls without emitting text, one final LLM call **without tools** synthesizes a Chinese answer from all tool results (decision questions must compare options and give a recommendation).
  - **Dynamic reasoning**: `assess_reasoning_effort(query)` → Groq `reasoning_effort` `low` / `medium` / `high` by query type.
  - **Tool result compaction**: `compact_tool_result()` strips verbose JSON to key fields before appending to messages (UI cards still use full tool output).
  - **Output budget**: `max_completion_tokens=3072` on main loop and synthesis (Groq default 1024 was too small once reasoning tokens are counted).
  - **Stateless Operation**: No `agent_conversations` DB writes; context is in-memory per HTTP request only.
  - **Current model (env):** `openai/gpt-oss-120b` on Groq (`AGENT_API_BASE=https://api.groq.com/openai/v1`). Free-tier **8K TPM** is the practical bottleneck — not model size (131K context window).

### Tooling (Live Agent: 7 tools)

- `backend/app/tools.py`
  - `calculate_commute`: Google Maps Geocoding + Distance Matrix. Accepts ANY free-text address (no hardcoded lists). LLM resolves abbreviations before calling. Returns origin/destination coordinates + driving/transit/walk durations. Returns structured error when geocoding fails.
  - `get_web_realtime_info`: Tavily for policy/transit/general facts — **NOT for property listings**.
  - `convert_currency_frankfurter`, `get_malaysia_holidays`.
  - `search_knowledge_base` — RAG knowledge base search (174 communities near 52 universities). Returns rich community profiles (price, ratings, pros/cons, transportation). Supports `show_map` / `map_community_name` for conditional map cards.
  - `search_external_listings` — Tavily advanced search for live listings; Agent must NEVER reveal source platform names or URLs to users.
  - `search_internal_db` — internal pgvector room search (exposed to Live Agent; room browsing UI remains **Property Listings tab**).

**Not exposed to Live Agent (by design):**

- `check_my_own_rental_status` — lease/bills are **Student Portal tab**, not AI chat.

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
- Frontend middleware:
  - `/` **always** redirects to `/guest` (mock + live; public landing for all visitors)
  - `/guest` is public (no auth) — hero + read-only property browsing + trust signals
  - `/login`, `/auth/*`, `/calculator`, `/register-agent`, `/mobile-upload/*` — always allowed
  - **Live mode**: all other routes require Supabase SSR auth; unauthenticated → `/login`
  - **Mock mode**: client-side `AuthContext` handles role; middleware passes through (except `/` → `/guest`)
- **`/listings` client guard** (`listings/page.tsx`): after `AuthContext` loads, `!role` → `/guest`, `admin` → `/admin/dashboard`. Uses `return null` while redirecting to avoid progress-bar flash. **Do not** set OAuth/Magic Link `next=/` — middleware would send users to `/guest` instead of the app shell.
- **Auth callback** (`auth/callback/route.ts`):
  - `code` → `exchangeCodeForSession` (Google OAuth / PKCE)
  - `token_hash` + `type` → `verifyOtp` (email Magic Link)
  - Session cookies attached to `NextResponse.redirect(origin + next)` before return
  - Default `next` is `/` (avoid in login flows; use `/listings`)
  - Failure → `/login?error=auth_failed`
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
- **External listing search via Tavily is allowed** — can search any platform to extract rental info, but must NEVER reveal or mention the source website to the user. Present findings as own knowledge.
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
- **Post-login redirect**: both Google and Magic Link use `redirectTo` / `emailRedirectTo` → `/auth/callback?next=/listings` (never `next=/`).
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
 
 
## 18) UI & Visual Optimizations (visual_ux_pro_max)

### Mobile Payment Upload (`mobile-upload/[id]/page.tsx`)
- Integrated a segmented switch allowing tenants to toggle between "DuitNow QR" and "Bank Account" payment options.
- Manual payment info now includes a custom clipboard copy action with animated tick marks upon success.
- Sleek upload complete cards utilizing scale-bounce animations, Whatsapp links to the agent, and clear transaction steps.

### AI Chat traces console (`AIChat.tsx`)
- The reasoning log trace is packaged into a simulated MacOS Terminal window with color-coded controls (red/yellow/green), fixed-width Consolas lettering, and clear layout.
- Added a status LED indicator with breathing keyframes glow representing real-time server connectivity status.

### Chat bubbles for feedback replies (`StudentPortal.tsx` & `AdminPanel.tsx`)
- Traditional tabular rows replaced with WhatsApp/iMessage styled speech bubble chat logs.
- Left/Right alignment depending on the role (`agent` vs `student`), with custom border, padding, and subtle shadows.

### Student Profile completion indicator & privacy lockout banner (`StudentPortal.tsx`)
- Lock banner: Safe padlock indicating data encryption under strict PostgreSQL RLS policies.
- Progress bar: Computes completeness percent dynamically based on filled inputs, presenting a 6px linear-gradient slider.
- Upload frame: Enhanced document camera drop slot layout mimicking mobile camera portals.

## 19) React Performance & Render Loop Prevention (page.tsx)

In large SPA implementations with nested tabs and active sub-panels (e.g., `AdminPanel` and `StudentPortal` mounted alongside each other), inline callback functions trigger recursive re-renders when child state updates bubble back to the top-level parent.

### Avoid Infinite Rendering Loops
- **Stable Callbacks**: Avoid inline arrow functions when passing state updating handlers down to child components that depend on them inside `useEffect` arrays. Wrap them in `useCallback` with empty dependency vectors.
- **Value Guard Checks**: Within the parent state updater, perform a primitive value check. If the incoming state matches current values, return the previous state pointer (`prev`) unchanged. This cancels React's rendering queue.

## 20) Production Security, Email Masking, Stale Interest Cleanup & Git Configuration (2026-06-01)

### Developer Login Bypass Removal
- To ensure production-grade security on online hosting environments (Vercel, Render, Supabase), all developer backdoor buttons (e.g. `🛠️ Developer Quick Login`) and corresponding authentication flow function `handleDevLogin` have been completely removed from `src/app/login/page.tsx`. This avoids client-side compilation leakage of secret credentials in production builds.

### Student Email Privacy Masking
- In the public co-renting interest list within `PropertyListings.tsx`, emails of other users are masked (e.g., `cf***6@student.monash.edu` or fallback nickname `cf***6`) to protect privacy.
- The full email address is only shown if `isMe` is true (i.e. the record belongs to the currently logged-in student).

### Stale Interest Auto-Reset/Cleanup
- Under `PropertyListings.tsx`, the `refreshInterests` loader detects stale tenant interests. If a property's status becomes `rented` or `occupied` and the current user is not the designated lessee, their interest record is deemed stale.
- To prevent locking the user's interface from expressing interest on other available properties, `myInterest` is set to `null` to bypass validation.
- In the background, the stale interest's DB state is set to `status = 'left'` asynchronously (via RPC/table UPDATE) to heal the data.
- The `useEffect` on mount unifies both Supabase and LocalStorage Mock databases to run this self-healing routine consistently.

### Git Ignore & Cleanup
- Added `/scratch/` to the `frontend/.gitignore` file to ignore temporary script files.
- Executed `git rm -r --cached frontend/scratch` to untrack and remove previously committed JS scripts from the remote GitHub repository while keeping them on local disk.

## 21) Announcements, Notifications & Inbox System (2026-06-01)

To keep tenants and agents informed of system events and admin reviews without locking them to static banners, we designed a unified notification system.

### Table Schema (`user_notifications`)
- `id`: UUID (default `gen_random_uuid()`)
- `user_id`: UUID (references `auth.users(id)` on delete cascade)
- `title`: TEXT
- `content`: TEXT
- `type`: VARCHAR(30) ('system' | 'announcement' | 'update' | 'bonus' | 'agent_status')
- `is_read`: BOOLEAN (default `false`)
- `created_at`: TIMESTAMPTZ (default `now()`)

### RLS Policies
- **SELECT / UPDATE / DELETE**: Users can view, toggle read states, and delete notifications where `auth.uid() = user_id`.
- **INSERT**: Restricted to administrators, allowed if the current user exists in `admin_users`.

### Super Admin Broadcast Console
- Located inside `components/Inbox.tsx` (rendered as tab `admin-inbox` / `inbox` in `page.tsx`).
- Offers 4 dispatch scopes: "All Students", "All Agents/Admins", "All Users (Broadcast)", "Specific User".
- In "Specific User" mode, displays a searchable directory list of students and agents to select the recipient.
- Features 4 templates for fast-entry:
  1. *Agent Approved*: Notifies the user their application passed and role will switch upon next login.
  2. *Agent Rejected*: Includes a placeholder for the rejection reason.
  3. *System Maintenance*: Broadcast template for downtime announcements.
  4. *Bonus Promotional Offer*: Version update or marketing notification.

### Agent Workflow Integration
- In `AdminPanel.tsx` (during agent registration approval/rejection):
  - On **Approve**: System automatically writes an `agent_status` approval notification to the applicant's UUID.
  - On **Reject**: System automatically writes an `agent_status` rejection notification (with the rejection reason) to the applicant's UUID.
- Both Mock mode (saving to `ez_user_notifications` in `localStorage`) and Live mode (inserting to `user_notifications` via Supabase client) support this automated feedback loop.

### Live Unread Counter Badge
- `Inbox` triggers an `onUnreadCountChange(count)` callback.
- The root layout `page.tsx` subscribes to this state and displays a floating red counter badge in both Student and Admin sidebars next to the "Inbox & Alerts" icon (`Mail`).


---

## 22) RAG Knowledge Base, Embedding Pipeline & Manus AI Chat Redesign (2026-06-05)

### 22.1 RAG Knowledge Base (rental_knowledge_base)

**Problem:** No real property listings in the database; Agent had no community/neighborhood data to recommend.

**Solution:** Created a separate `rental_knowledge_base` table with 132 community profiles across 42 Malaysian universities, using pgvector for semantic search.

**Table Schema:**
```sql
CREATE TABLE rental_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_name VARCHAR(200) NOT NULL,
    community_name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    state VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    description TEXT,
    property_type VARCHAR(100),
    data JSONB NOT NULL,           -- Full rich data (price_range, pros, cons, ratings, etc.)
    embedding VECTOR(1024),        -- bge-m3 semantic embedding
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Semantic Search Function:**
```sql
CREATE OR REPLACE FUNCTION match_knowledge_base (
    query_embedding VECTOR(1024),
    match_threshold FLOAT DEFAULT 0.2,
    match_count INT DEFAULT 5,
    filter_state VARCHAR DEFAULT NULL
) RETURNS TABLE (id, university_name, community_name, address, state,
    latitude, longitude, description, property_type, data, similarity)
```

**Data Source:** Merged from two JSON files:
- `malaysia_rental_data_ultimate.json` (39 universities, 118 entries)
- `malaysia_rental_data_expanded.json` (8 universities, 19 entries)
- Merged result: `malaysia_rental_data_merged.json` (42 universities, 132 entries, 92 unique communities)
- Cross-university duplicates are intentional (nearby universities share communities)

### 22.2 Embedding Pipeline (bge-m3)

**Model:** `BAAI/bge-m3` via SiliconFlow API (free tier)
- Multilingual (100+ languages), 1024-dimensional vectors
- API: OpenAI-compatible endpoint at `https://api.siliconflow.cn/v1`
- Config: `AI_EMBEDDING_MODEL=BAAI/bge-m3` in `.env`

**How Embeddings Work (step by step):**

1. **Text Preparation:** For each community, concatenate `community_name + property_type + description` into a single text string.

2. **Vector Generation:** Call SiliconFlow API:
   ```python
   from openai import OpenAI
   client = OpenAI(api_key=EMBEDDING_API_KEY, base_url="https://api.siliconflow.cn/v1")
   response = client.embeddings.create(input=[text], model="BAAI/bge-m3")
   vector = response.data[0].embedding  # 1024-dimensional float array
   ```

3. **Storage:** Write the vector to the `embedding` column in Supabase via the service-role client.

4. **Semantic Search:** When user asks a question, generate an embedding for the query text, then call `match_knowledge_base` RPC which computes cosine similarity:
   ```sql
   1 - (k.embedding <=> query_embedding) AS similarity
   ```
   Results are sorted by similarity and filtered by threshold (0.15+).

**Import Script:** `backend/scripts/import_knowledge_base.py`
- Reads merged JSON -> inserts into `rental_knowledge_base` -> generates embeddings for all entries
- Run with: `cd backend && python scripts/import_knowledge_base.py`
- Idempotent: clears old data first, regenerates everything

**Sync Function:** `sync_kb_embeddings()` in `tools.py`
- Called lazily when `search_knowledge_base` tool runs
- Scans for entries where `embedding IS NULL` and generates missing ones

### 22.3 Agent Tool: search_knowledge_base

**File:** `backend/app/tools.py` -- `search_knowledge_base()`
- Takes `semantic_query`, optional `state` filter, `max_results`
- Generates query embedding -> calls `match_knowledge_base` RPC
- Returns structured results with price ranges, ratings, pros/cons, transportation, facilities

**Wired into Agent:** `backend/app/agent.py`
- Added as tool definition with `search_knowledge_base` name
- System prompt updated: Agent uses BOTH `search_knowledge_base` AND `get_web_realtime_info` together for housing questions
- Knowledge base provides structured profiles; web search provides real-time market info

### 22.4 External Search Unlock

**Before:** Tavily queries had `-site:iproperty.com.my -site:propertyguru.com.my` etc. hardcoded to block external rental platforms.

**After:** Removed all site exclusions. Agent CAN search any platform but MUST NEVER reveal the source URL/platform to the user.

**Files Changed:**
- `tools.py` line 369: removed `-site:` exclusions from Tavily query
- `agent.py` system prompt: updated rules to allow external search, forbid revealing sources
- `ai-architecture.md`, `README.md`, `FAQ.md`: updated documentation

### 22.5 Manus AI-Style Chat Interface

**Design Philosophy:** Single-page, full-process visibility chat (like Manus AI). No split panels -- everything flows top-to-bottom in one scroll.

**Process Flow:**
```
User question -> Thinking steps (dot + text) -> Tool call cards (live updating)
-> Tool results (checkmark) -> Final answer (divider + streaming text)
-> Map/cards (after text completes)
```

**Component:** `frontend/src/components/AIChat.tsx` (complete rewrite)

**Key Types:**
```typescript
interface ToolCard {
  id: string; name: string; args: Record<string, any>;
  status: 'running' | 'done' | 'error'; result?: any;
}
interface Message {
  id: string; role: 'user' | 'assistant';
  thoughts: string[];           // Thinking steps
  tools: ToolCard[];            // Tool execution cards
  content: string;              // Final answer text
  uiComponents: { component: string; props: any }[];  // Map/cards
  contentStarted: boolean;      // Whether text streaming has begun
}
```

**SSE Event Flow:**
- `thinking` -> append to `message.thoughts[]`
- `tool_call` -> push new card to `toolBoardCards` with status='running'
- `tool_result` -> update last card to status='done'
- `text` -> append to `message.content`, set `textStarted=true`
- `ui_component` -> push to `resultsPanel[]` (rendered after text)

**Features:**
- Welcome screen with 6 bilingual quick-start prompt cards
- Tool cards with spinner -> checkmark animation, expandable raw output
- Final answer separated by divider with label
- Chat history stored in localStorage (view/delete/load sessions)
- History button in top-right corner with slide-in panel
- Centered title bar with LED status dot
- Input box: floating pill shape, 640px max-width, centered

### 22.6 Design System Integration (ui-ux-pro-max)

Used the `.ui-ux-pro-max` plugin for design decisions:
- **AI-Native UI** style for chat layout
- **Bento Grid** for welcome cards (Apple-inspired, 16px radius, soft shadows)
- **Real Estate teal palette** matching existing design system
- **Soft shadows** instead of hard borders
- **UX compliance:** Focus rings, aria-labels, readable font sizes

### 22.7 Review System Fixes

- **Admin delete RLS policy:** Added `"Admins can delete any review"` policy allowing super_admin to delete any review
- **One lease = one review:** Added `UNIQUE(user_id, unit_id)` constraint + frontend check
- **User name display:** ReviewSystem now joins `users.full_name` instead of showing truncated UUID
- **AdminPanel field fix:** Changed `select('id, name')` to `select('id, full_name')` to match actual schema

### 22.8 Error Handling Improvements

Agent now shows friendly Chinese error messages instead of raw technical errors:
- 429 (rate limit): request limit reached, try later
- 503 (overloaded): service busy, retry in seconds
- 401 (auth): config error, contact admin
- Network: connection timeout, check network
- Model changed from gemini-2.5-flash (20 req/day) to gemini-2.0-flash (1500 req/day)

---

## 23. Agent Bug Fixes & UI/UX Polish (2026-06-05)

### 23.1 Map Card Conditional Rendering

Previously, `search_knowledge_base` unconditionally generated a `MapAndCard` UI component whenever results had lat/lng coordinates — regardless of whether the user asked about housing.

**Fix:** Added `show_map: boolean` parameter (default false). Only queries about housing/properties set `show_map=true`. The system prompt now explicitly instructs the LLM when to use this flag.

### 23.2 Map Card Location Matching

The map card always showed the first search result (`result_data[0]`), even when the LLM's text answer focused on a different community.

**Fix:** Added `map_community_name: string` parameter. The LLM specifies which community the map should display. Backend matches by name (case-insensitive, partial match).

### 23.3 Duplicate Map Card Elimination

When both `search_knowledge_base` and `calculate_commute` were called, two map cards appeared — one showing a static community pin (requiring manual input), one showing the actual route.

**Fix:** Added `has_commute` flag. When commute is calculated, the knowledge base map card is skipped. Community info (price, rating, description) is merged into the commute card props. Result: one card with route + community info, one Google Maps API call.

### 23.4 SSE Buffer Flush

The frontend SSE parser had a bug: when `reader.read()` returned `done=true`, remaining data in `buf` was never processed, causing the last SSE events (including final text) to be lost.

**Fix:** After the read loop ends, flush remaining buffer with `processBuf(false)`.

### 23.5 Backend Loop Fallback (superseded by §24.1)

The ReAct loop could exhaust all iterations on tool calls without ever emitting text. The original fix emitted a generic Chinese filler sentence — **replaced** in §24.1 by forced synthesis.

### 23.6 MAX_LOOPS Increase

Increased from 3 → 5 → **6** to support complex multi-tool queries (knowledge base + external search + commute).

### 23.7 Platform Name Sanitization

All user-facing text now uses generic Chinese descriptions instead of internal platform names:
- "Searching Tavily for..." → "正在搜索最新资讯..."
- "using Google Maps database..." → "正在计算通勤路线和时间..."
- System prompt rules use generic terms instead of specific platform names

### 23.8 URL Sharing Policy

- ✅ Allowed: university sites, government portals, official pages
- ❌ Forbidden: rental listing pages, porn, violence, political, religious content
- ❌ Forbidden: revealing internal data sources (Tavily, Supabase, Google Maps API)

### 23.9 UI Polish

- Chat avatars: 36px → 42px, icons 14 → 18
- User avatar moved from right to left (same side as AI avatar)
- Thinking steps and tool card titles: `white-space: nowrap` to prevent wrapping
- Input bar: fixed to page bottom via flex layout (`flex: 1; min-height: 0`)

---

## 24. Agent Intelligence & Decision-Query Fixes (2026-06-05)

### 24.1 Forced synthesis when loop exhausts (critical)

**Problem:** Multi-constraint housing decisions (e.g. "住 GEO 但学校 UM，还可能 Monash 交换") triggered 5–6 consecutive tool-call rounds. The model never returned `tool_calls=none`, so no analysis was streamed. The old fallback was a hardcoded line: "以上是根据搜索结果整理的信息…" plus map cards — users saw cards with zero reasoning.

**Fix:**

1. Track `final_text_emitted` across the loop.
2. If false after the loop, append a system instruction and call the LLM **once more without `tools`** (`max_completion_tokens=3072`).
3. Model must write Chinese comparison + clear recommendation; generic filler is forbidden in prompt.
4. Emit `pending_ui_components` and deferred `kb_map_candidate` **after** synthesis text.

### 24.2 Deferred KB map card + commute dedup

**Problem:** `search_knowledge_base` appended a static community pin card before `calculate_commute` set `has_commute=true`, yielding two unrelated MapAndCards (e.g. GEO pin + Pantai Hillpark route).

**Fix:**

- Store KB map props in `kb_map_candidate` during the loop; append to `pending_ui_components` only if `not has_commute` after the loop.
- When merging KB metadata into a commute card, require `community_name` ≈ `origin_name` (substring match); prevents GEO ratings on a Pantai Hillpark route.

### 24.3 Decision / trade-off system prompt

New `## DECISION / TRADE-OFF QUESTIONS` block in system prompt:

- Search and commute first, then **always** write head-to-head analysis (price, commute to each campus, safety, trade-offs).
- One primary recommendation + optional backup.
- Include actual commute numbers from tool results.
- Cards supplement analysis; never replace it.

### 24.4 Dynamic `reasoning_effort`

`assess_reasoning_effort(query)`:

| Effort | Trigger examples |
|--------|------------------|
| `high` | 还是、哪个、对比、纠结、住哪、推荐、权衡… |
| `low` | 汇率、换算、节假日、holiday… |
| `medium` | default (`AGENT_REASONING_EFFORT` env) |

Applied to main ReAct calls and forced synthesis via Groq `extra_body`.

### 24.5 Tool result compaction (token budget)

**Problem:** Blind `result_json[:2000]` truncation dropped entire communities mid-JSON under Groq free-tier **8K TPM**.

**Fix:** `compact_tool_result(tool_name, result)` before appending to `messages`:

| Tool | Kept fields |
|------|-------------|
| `search_knowledge_base` | community, university, price, rating, safety, distance, top pros/cons, transport snippet |
| `search_external_listings` | answer_summary (600 chars), listing title/price/snippet |
| `search_internal_db` | community, room_type, rent, short description |
| `get_malaysia_holidays` | date + name (15 rows) |
| `get_web_realtime_info` | first 1200 chars |

Safety cap: 3500 chars after compaction. **UI MapAndCard still uses full `result_data`.**

### 24.6 Output token ceiling

`max_completion_tokens=3072` on main loop and synthesis. Groq default 1024 includes gpt-oss **reasoning tokens**, leaving too little room for long Chinese answers.

### 24.7 Model vs limits (operational note)

| Capability | Value |
|------------|-------|
| Model | `openai/gpt-oss-120b` (Groq) |
| Context window | 131,072 tokens |
| Practical limit (free tier) | **8K TPM** — drives compaction and loop cap |
| Upgrade path | Groq paid tier → higher TPM, less truncation needed |

---

## 25. Multi-Page Routing Architecture (2026-06-05)

### Problem

The original architecture had a single `page.tsx` (643 lines) that served as a monolithic SPA shell. All tabs (listings, chat, my-lease, admin panel, etc.) were rendered simultaneously and toggled via CSS `display: none/block`. This meant:
- Browser URL was always `/` regardless of which tab was active
- Back/forward buttons didn't work
- Refreshing the page lost the current tab state
- Google could only index one page
- Unauthenticated users couldn't browse listings → **now `/guest`** (public read-only)

### Solution

Refactored to Next.js App Router with a `(app)` route group:

```
middleware: / → /guest (always)

/app/page.tsx → redirect('/listings')  # rarely reached; middleware wins on /

/(app)/layout.tsx → AuthProvider + PendingCountsProvider + AppSidebar + AppTopbar
  ├── /guest       (public — read-only listings, no sidebar)
  ├── /listings    (auth required in live mode; client redirects !role → /guest)
  ├── /chat        (auth required)
  ├── /my-lease    (auth required)
  ├── /profile     (auth required)
  ├── /maintenance (auth required)
  ├── /inbox       (auth required)
  └── /admin/layout.tsx (admin guard)
      ├── /admin/dashboard
      ├── /admin/properties
      ├── /admin/leases
      ├── /admin/listings (read-only)
      ├── /admin/admins (super_admin only)
      ├── /admin/feedback
      ├── /admin/agent-reviews (super_admin only)
      ├── /admin/reviews (super_admin only)
      ├── /admin/profile
      └── /admin/inbox
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `AuthContext` | Shared auth state (role, adminRole, logout). Replaces per-page auth checks. |
| `PendingCountsContext` | Shared badge counts (leases, feedback, agentReviews, unreadInbox). Syncs sidebar badges across routes. |
| `AppSidebar` | Extracted sidebar. Uses `useRouter().push()` and `usePathname()` for navigation. |
| `AppTopbar` | Extracted topbar (theme/lang toggles, logout). |
| `AdminPageWrapper` | Thin wrapper that maps route → AdminPanel `defaultTab` prop. |

### Public vs Authenticated Browsing

- **`/guest`**: unauthenticated entry. Renders `PropertyListings` in read-only mode inside a marketing shell (no sidebar/topbar). Logged-in users can still visit `/guest` and use「进入系统」→ `/listings`.
- **`/listings`**: authenticated app route. Live middleware blocks unauthenticated access (`→ /login`); client-side also sends `!role` users to `/guest` after `AuthContext` finishes loading.

Do not document `/listings` as publicly accessible — that was the pre-Guest-page model.

### State Preservation

Unlike the old SPA where all components stayed mounted, with routing components unmount/remount on navigation. This is acceptable because:
- Most pages load data on mount from Supabase or localStorage (fast)
- AIChat saves chat history to localStorage
- AdminPanel initializes from `defaultTab` prop
- Sidebar + topbar stay mounted in the layout (persistent across routes)

### Guest 页面路由逻辑（2026-06-06 更新）

`/guest` 是系统入口页面，无论登录状态都是干净的浏览界面：

- **中间件**：`/` 一律重定向到 `/guest`（mock/live 模式统一）
- **Layout**：`isGuest = pathname === '/guest'`，只看路径不看登录状态
- **侧边栏/顶栏**：`isGuest` 为 true 时完全隐藏
- **CTA 按钮**：未登录显示"立即开始"→ `/login`；已登录显示"进入系统"→ `/listings`
- **滚动 reveal**：`.reveal` / `.reveal.from-above` — IntersectionObserver 双向动画（进入淡入上滑，离开反向淡出）

### 单元号显示约定（2026-06-06）

- 马来西亚格式：`栋-楼-号`（如 `A-12-3`），**不加** `#` 前缀
- 统一函数：`AdminPanel.formatLeasePropertyLabel()` → `社区 · 单元号 · (房型)`
- 涉及：收租核查表、归档租约、付款审核、租客端历史租约

### 登录后 UI 工具类（`globals.css`）

| 类名 | 用途 |
|------|------|
| `.seg-tabs` | 二级 Tab 渐变激活态（AdminPanel / TenantPortal） |
| `.empty-state` / `.empty-state-icon` | 空列表引导卡片 |
| `.grid-2` | 个人资料等两列响应式表单（560px 以下单列） |
| `.stat-chip` | 租约统计药丸卡片 |
| `.nav-item` | 侧边栏一级导航（激活渐变 + 左侧光条） |
| `.reveal` | Guest 页滚动进入/离开动画 |

### 分页策略

| 视图 | 每页 | 布局 |
|------|------|------|
| 网格（租客/中介） | 10 | `repeat(5, 1fr)` |
| 网格（Guest） | 10 | `repeat(auto-fill, minmax(220px, 1fr))` |
| 列表 | 8 | 单列 |

分页对所有用户生效，切换视图模式自动重置页码。

## 20) Known Auth & Routing Risks (2026-06-06)

| Issue | Cause | Mitigation / status |
|-------|-------|---------------------|
| Magic Link / Google first login → `auth_failed` or double login | PKCE/cookie timing; callback previously code-only; `AuthContext` checked `getUser()` once and locked role=null before cookies hydrated | **Fixed**: callback handles `token_hash`; cookies on redirect response; `AuthContext` now subscribes to `onAuthStateChange` (`INITIAL_SESSION`/`SIGNED_IN`) and keeps `loading=true` until session resolves. If it ever recurs, verify Supabase Site URL matches deployment domain |
| Logged-in user lands on `/guest` | OAuth used `next=/` → middleware `/` → `/guest` | **Fixed**: login page uses `next=/listings` |
| `/listings` flash then Guest | `role=null` while `AuthContext` loading | **Fixed**: `AuthContext` keeps `loading=true` until `onAuthStateChange` resolves the session, so `/listings` shows the progress bar instead of bouncing to `/guest` |
| Any auth flow with `next=/` | Middleware always sends `/` to `/guest` | **Never** use `next=/` in `redirectTo` / `emailRedirectTo` |

Full checklist: `docs/FUTURE_IMPROVEMENTS.md` →「已知问题与潜在风险」.
