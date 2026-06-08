-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL,
  phone character varying UNIQUE,
  full_name character varying,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  unit_number character varying,
  passport_number character varying,
  school character varying,
  company character varying,
  local_id_number character varying,
  document_url text,
  email character varying,
  student_card_url text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_users (
  id uuid NOT NULL,
  email character varying NOT NULL UNIQUE,
  role character varying DEFAULT 'editor'::character varying CHECK (role::text = ANY (ARRAY['super_admin'::character varying, 'editor'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  payment_qr_code text,
  display_name character varying,
  phone character varying,
  whatsapp character varying,
  wechat_id character varying,
  avatar_url text,
  job_title character varying DEFAULT 'Real Estate Negotiator'::character varying,
  agency_name character varying DEFAULT 'Malaysia Ez Rent'::character varying,
  agency_license character varying,
  agency_address text,
  bio text,
  experience_years integer DEFAULT 0,
  experience_months integer DEFAULT 0,
  area_expertise ARRAY,
  property_types ARRAY,
  facebook_url text,
  website_url text,
  ren_number character varying,
  ren_tag_url text,
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.communities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  address text NOT NULL,
  lat numeric,
  lng numeric,
  created_at timestamp with time zone DEFAULT now(),
  amenities ARRAY DEFAULT '{}'::text[],
  CONSTRAINT communities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.amenities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  icon_key character varying NOT NULL,
  CONSTRAINT amenities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.community_amenities (
  community_id uuid NOT NULL,
  amenity_id uuid NOT NULL,
  CONSTRAINT community_amenities_pkey PRIMARY KEY (community_id, amenity_id),
  CONSTRAINT community_amenities_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id),
  CONSTRAINT community_amenities_amenity_id_fkey FOREIGN KEY (amenity_id) REFERENCES public.amenities(id)
);
CREATE TABLE public.units (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  room_type character varying CHECK (room_type::text = ANY (ARRAY['Studio'::character varying, 'Master Room'::character varying, 'Medium Room'::character varying, 'Small Room'::character varying, 'Whole Unit'::character varying]::text[])),
  rent numeric NOT NULL,
  status character varying DEFAULT 'available'::character varying CHECK (status::text = ANY (ARRAY['available'::character varying, 'rented'::character varying]::text[])),
  description text,
  embedding USER-DEFINED,
  updated_at timestamp with time zone DEFAULT now(),
  max_occupants integer DEFAULT 1,
  media_urls ARRAY DEFAULT '{}'::text[],
  bedrooms integer DEFAULT 1,
  bathrooms integer DEFAULT 1,
  area integer,
  video_url text,
  agent_id uuid,
  landlord_qr_code text,
  landlord_bank_info text,
  available_from date,
  CONSTRAINT units_pkey PRIMARY KEY (id),
  CONSTRAINT units_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id),
  CONSTRAINT units_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.admin_users(id)
);
CREATE TABLE public.unit_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  unit_id uuid,
  media_url text NOT NULL,
  media_type character varying DEFAULT 'image'::character varying CHECK (media_type::text = ANY (ARRAY['image'::character varying, 'video'::character varying]::text[])),
  sort_order integer DEFAULT 0,
  CONSTRAINT unit_images_pkey PRIMARY KEY (id),
  CONSTRAINT unit_images_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);
CREATE TABLE public.leases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  unit_id uuid,
  tenant_id uuid,
  start_date date NOT NULL,
  end_date date NOT NULL,
  monthly_rent numeric NOT NULL,
  deposit_amount numeric NOT NULL,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'completed'::character varying, 'terminated'::character varying, 'transferred'::character varying]::text[])),
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  security_deposit_months numeric DEFAULT 2,
  utility_deposit_months numeric DEFAULT 0.5,
  lease_group_id uuid,
  unit_number character varying,
  CONSTRAINT leases_pkey PRIMARY KEY (id),
  CONSTRAINT leases_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
  CONSTRAINT leases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(id),
  CONSTRAINT leases_lease_group_id_fkey FOREIGN KEY (lease_group_id) REFERENCES public.lease_groups(id)
);
CREATE TABLE public.payment_records (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lease_id uuid,
  billing_month date NOT NULL,
  paid boolean DEFAULT false,
  paid_date date,
  evidence_url text,
  status character varying DEFAULT 'unpaid'::character varying CHECK (status::text = ANY (ARRAY['unpaid'::character varying, 'pending_review'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_records_pkey PRIMARY KEY (id),
  CONSTRAINT payment_records_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id)
);
CREATE TABLE public.universities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  CONSTRAINT universities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tenant_interests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  unit_id uuid,
  user_id uuid,
  email text NOT NULL,
  full_name text,
  phone text,
  note text DEFAULT ''::text,
  status text DEFAULT 'interested'::text CHECK (status = ANY (ARRAY['interested'::text, 'confirmed'::text, 'left'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tenant_interests_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_interests_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
  CONSTRAINT tenant_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.maintenance_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lease_id uuid,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['Aircon'::character varying, 'Plumbing'::character varying, 'Electrical'::character varying, 'Furniture'::character varying, 'Appliance'::character varying, 'Others'::character varying]::text[])),
  content text NOT NULL,
  photo_url text,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in_progress'::character varying, 'resolved'::character varying]::text[])),
  assigned_to uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  replies jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT maintenance_requests_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id),
  CONSTRAINT maintenance_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id)
);
CREATE TABLE public.lease_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  unit_id uuid,
  contract_start_date date NOT NULL,
  contract_end_date date NOT NULL,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'breached'::character varying, 'completed'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lease_groups_pkey PRIMARY KEY (id),
  CONSTRAINT lease_groups_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);
CREATE TABLE public.lease_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lease_group_id uuid,
  exiting_lease_id uuid,
  exiting_tenant_id uuid,
  incoming_tenant_id uuid,
  transfer_date date NOT NULL,
  deposit_handle_type character varying CHECK (deposit_handle_type::text = ANY (ARRAY['transfer_to_new'::character varying, 'refunded'::character varying, 'forfeited'::character varying]::text[])),
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lease_transfers_pkey PRIMARY KEY (id),
  CONSTRAINT lease_transfers_lease_group_id_fkey FOREIGN KEY (lease_group_id) REFERENCES public.lease_groups(id),
  CONSTRAINT lease_transfers_exiting_lease_id_fkey FOREIGN KEY (exiting_lease_id) REFERENCES public.leases(id),
  CONSTRAINT lease_transfers_exiting_tenant_id_fkey FOREIGN KEY (exiting_tenant_id) REFERENCES public.users(id),
  CONSTRAINT lease_transfers_incoming_tenant_id_fkey FOREIGN KEY (incoming_tenant_id) REFERENCES public.users(id)
);
CREATE TABLE public.mobile_upload_sessions (
  id character varying NOT NULL,
  media_urls ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mobile_upload_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agent_registrations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  auth_user_id uuid,
  full_name character varying NOT NULL,
  phone character varying NOT NULL CHECK (phone::text ~ '^601[0-9]{8,9}$'::text),
  whatsapp character varying CHECK (whatsapp IS NULL OR whatsapp::text ~ '^601[0-9]{8,9}$'::text),
  agency_name character varying NOT NULL,
  ren_number character varying NOT NULL CHECK (ren_number::text ~ '^REN[0-9]{4,7}$'::text),
  ren_tag_image_url text NOT NULL,
  verification_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (verification_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'suspended'::character varying, 'banned'::character varying]::text[])),
  rejection_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  email character varying NOT NULL DEFAULT ''::character varying,
  CONSTRAINT agent_registrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  type character varying NOT NULL DEFAULT 'system'::character varying CHECK (type::text = ANY (ARRAY['system'::character varying, 'announcement'::character varying, 'update'::character varying, 'bonus'::character varying, 'agent_status'::character varying]::text[])),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  unit_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT favorites_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  unit_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT reviews_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);
CREATE TABLE public.agent_ratings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid,
  agent_id uuid,
  lease_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT agent_ratings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(id),
  CONSTRAINT agent_ratings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.admin_users(id),
  CONSTRAINT agent_ratings_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id)
);
CREATE TABLE public.rental_knowledge_base (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  university_name character varying NOT NULL,
  community_name character varying NOT NULL,
  address text NOT NULL,
  state character varying,
  latitude numeric,
  longitude numeric,
  description text,
  property_type character varying,
  data jsonb NOT NULL,
  embedding USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rental_knowledge_base_pkey PRIMARY KEY (id)
);