-- Fix overly permissive INSERT policies

-- Drop and recreate notifications insert policy with proper checks
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  -- Allow inserting notifications for self or broadcast (null user_id)
  user_id IS NULL OR user_id = auth.uid() OR 
  has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
);

-- Drop and recreate activity_log insert policy
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_log;

CREATE POLICY "Authenticated can insert activity"
ON public.activity_log FOR INSERT TO authenticated
WITH CHECK (
  -- Allow if user is inserting for themselves or is a staff member
  user_id IS NULL OR user_id = auth.uid() OR 
  has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'reception') OR has_role(auth.uid(), 'housekeeping')
);