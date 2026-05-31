-- ======================================================
-- 028_user_inbox_notifications.sql
-- Announcements, Notifications & Inbox System for all users
-- ======================================================

CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (type IN ('system', 'announcement', 'update', 'bonus', 'agent_status')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read own notifications" ON public.user_notifications;
CREATE POLICY "Users can read own notifications" ON public.user_notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete own notifications" ON public.user_notifications
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.user_notifications;
CREATE POLICY "Admins can insert notifications" ON public.user_notifications
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can update/delete any notification" ON public.user_notifications;
CREATE POLICY "Admins can update/delete any notification" ON public.user_notifications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
    );
